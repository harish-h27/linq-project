import { query } from "./client.js";

export async function saveIncomingTx(
  userId: string,
  txHash: string,
  fromAddress: string,
  toAddress: string,
  amount: string,
  blockNumber: number
) {
  const rows = await query(
    `INSERT INTO incoming_transactions 
     (user_id, tx_hash, from_address, to_address, amount, block_number)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (tx_hash) DO NOTHING
     RETURNING *`,
    [userId, txHash, fromAddress, toAddress, amount, blockNumber]
  );
  return rows[0] ?? null;
}

export async function markNotified(txHash: string) {
  await query(
    `UPDATE incoming_transactions SET notified = true WHERE tx_hash = $1`,
    [txHash]
  );
}

export async function getRecentTransactions(userId: string, limit = 5) {
  return query(
    `SELECT * FROM incoming_transactions 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2`,
    [userId, limit]
  );
}