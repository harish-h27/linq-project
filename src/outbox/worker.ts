import { withTx } from "../db/client.js";
import { sendMessageDirect } from "../linq/client.js";
import axios from "axios";

const base = process.env.LINQ_API_BASE_URL ?? "https://api.linqapp.com/api/partner/v3";
const token = process.env.LINQ_API_TOKEN ?? "";
const from = process.env.LINQ_FROM_NUMBER ?? "";

const MAX_RETRIES = 3;

export async function startOutboxWorker() {
  console.log("[outbox] worker started");
  loop();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function deliverMessage(userId: string, chatId: string, message: string) {
  await sendMessageDirect(userId, chatId ?? "", message);
}

async function loop() {
  while (true) {
    try {
      await tick();
    } catch (err: any) {
      console.error("[outbox] tick error:", err.message);
    }
    await sleep(1000);
  }
}

async function tick() {
  await withTx(async (client) => {
    const due = await client.query(
      `SELECT * FROM outbox
       WHERE status = 'pending'
       AND process_after <= now()
       ORDER BY created_at ASC
       LIMIT 10
       FOR UPDATE SKIP LOCKED`
    );

    for (const msg of due.rows) {
      try {
        await deliverMessage(msg.user_id, msg.chat_id, msg.message);

        await client.query(
          `UPDATE outbox SET status = 'sent', sent_at = now() WHERE id = $1`,
          [msg.id]
        );

        console.log(`[outbox] sent to ${msg.user_id}`);
      } catch (err: any) {
        const retries = msg.retry_count + 1;

        if (retries >= MAX_RETRIES) {
          await client.query(
            `UPDATE outbox SET status = 'failed', last_error = $2, retry_count = $3 WHERE id = $1`,
            [msg.id, err.message, retries]
          );
          console.error(`[outbox] failed permanently for ${msg.user_id}: ${err.message}`);
        } else {
          const backoffSeconds = Math.pow(2, retries);
          await client.query(
            `UPDATE outbox 
             SET retry_count = $2, last_error = $3,
                 process_after = now() + ($4 || ' seconds')::interval
             WHERE id = $1`,
            [msg.id, retries, err.message, backoffSeconds]
          );
          console.log(`[outbox] retry ${retries} for ${msg.user_id} in ${backoffSeconds}s`);
        }
      }
    }
  })
}