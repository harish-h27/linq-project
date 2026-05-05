import { tryAcquireLeader, renewLeader, releaseLeader } from "../lock/leader.js";
import { getDueReminders, markReminderFired } from "../db/reminders.js";
import { sendMessage } from "../linq/client.js";
import { withTx } from "../db/client.js";

const INSTANCE_ID = process.env.INSTANCE_ID ?? "node-1";
const LOCK_TTL_MS = 10000; // 10 seconds
const TICK_MS = 1000; // check every second
const EXTEND_MS = 4000; // extend every 4 seconds

let isLeader = false;
let running = false;
let extendInterval: NodeJS.Timeout | null = null;

export async function startScheduler() {
  running = true;
  console.log(`[scheduler] starting as ${INSTANCE_ID}`);
  loop();
}

async function tick() {
  await withTx(async (client) => {
    const due = await client.query(
      `SELECT * FROM reminders
       WHERE fired = false AND fire_at <= now()
       FOR UPDATE SKIP LOCKED
       LIMIT 10`
    );

    for (const reminder of due.rows) {
      console.log(`[scheduler] firing reminder for ${reminder.user_id}: ${reminder.message}`);

      await sendMessage(reminder.user_id, reminder.chat_id ?? "", `reminder: ${reminder.message}`);

      await client.query(
        `UPDATE reminders SET fired = true WHERE id = $1`,
        [reminder.id]
      );
    }
  });
}

async function loop() {
  while (running) {
    try {
      if (!isLeader) {
        const acquired = await tryAcquireLeader(INSTANCE_ID, LOCK_TTL_MS);
        if (acquired) {
          isLeader = true;
          console.log(`[scheduler] ${INSTANCE_ID} became leader`);
          startExtending();
        }
      }

      if (isLeader) {
        await tick();
      }
    } catch (err: any) {
      console.error("[scheduler] error:", err.message);
    }

    await sleep(TICK_MS);
  }
}



function startExtending() {
  extendInterval = setInterval(async () => {
    const extended = await renewLeader(INSTANCE_ID, LOCK_TTL_MS);
    if (!extended) {
      console.log(`[scheduler] ${INSTANCE_ID} lost leadership`);
      isLeader = false;
      stopExtending();
    }
  }, EXTEND_MS);
}

function stopExtending() {
  if (extendInterval) {
    clearInterval(extendInterval);
    extendInterval = null;
  }
}

export async function stopScheduler() {
  running = false;
  stopExtending();
  if (isLeader) {
    await releaseLeader(INSTANCE_ID);
    isLeader = false;
  }
  console.log("[scheduler] stopped");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}