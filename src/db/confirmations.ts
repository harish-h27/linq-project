import { query } from "./client.js";

export async function savePendingConfirmation(
  userId: string,
  chatId: string,
  kind: string,
  payload: Record<string, unknown>
) {
  await query(
    `DELETE FROM pending_confirmations WHERE user_id = $1`,
    [userId]
  );

  const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();

  const rows = await query(
    `INSERT INTO pending_confirmations (user_id, chat_id, kind, payload, expires_at)
     VALUES ($1, $2, $3, $4::jsonb, $5)
     RETURNING *`,
    [userId, chatId, kind, JSON.stringify(payload), expiresAt]
  );
  return rows[0];
}

export async function getPendingConfirmation(userId: string) {
  const rows = await query(
    `SELECT * FROM pending_confirmations
     WHERE user_id = $1 AND expires_at > now()`,
    [userId]
  );
  return rows[0] ?? null;
}

export async function deletePendingConfirmation(userId: string) {
  await query(
    `DELETE FROM pending_confirmations WHERE user_id = $1`,
    [userId]
  );
}