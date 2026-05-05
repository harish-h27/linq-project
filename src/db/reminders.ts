
import { query, withTx } from "./client.js";

export async function saveReminder(userId: string, chatId: string, message: string, fireAt: Date) {
  const rows = await query(
    `INSERT INTO reminders (user_id, chat_id, message, fire_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, chatId, message, fireAt.toISOString()]
  );
  return rows[0];
}

export async function listReminders(userId: string) {
  return query(
    `SELECT * FROM reminders
     WHERE user_id = $1 AND fired = false
     ORDER BY fire_at ASC`,
    [userId]
  );
}

export async function cancelReminder(userId: string, id: string) {
  await query(
    `UPDATE reminders SET fired = true 
     WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}







export async function getDueReminders() {
  return query(
    `SELECT * FROM reminders
     WHERE fired = false AND fire_at <= now()
     FOR UPDATE SKIP LOCKED`,
    []
  );
}

export async function markReminderFired(id: string) {
  await query(
    `UPDATE reminders SET fired = true WHERE id = $1`,
    [id]
  );
}

