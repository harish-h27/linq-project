import { query } from "./client.js";

export async function findWallet(userId: string) {
  const rows = await query(
    "SELECT * FROM user_wallets WHERE user_id = $1",
    [userId]
  );
  return rows[0] ?? null;
}

export async function createWallet(userId: string, address: string, encryptedKey: string) {
  const rows = await query(
    `INSERT INTO user_wallets (user_id, address, encrypted_key)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, address, encryptedKey]
  );
  return rows[0];
}