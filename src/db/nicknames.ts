import { query } from "./client.js";
import { generate } from "random-words";

export function generateNickname(): string {
  const word = generate({ minLength: 4, maxLength: 4 }) as string;
  const num = Math.floor(Math.random() * 99);
  return `${word}${num}`;
}

export async function findNicknameByAddress(userId: string, address: string) {
  const rows = await query(
    `SELECT * FROM wallet_nicknames 
     WHERE user_id = $1 AND LOWER(address) = LOWER($2)`,
    [userId, address]
  );
  return rows[0] ?? null;
}
export async function saveNickname(userId: string, nickname: string, address: string) {
  await query(
    `INSERT INTO wallet_nicknames (user_id, nickname, address)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, nickname) DO UPDATE SET address = $3`,
    [userId, nickname.toLowerCase(), address.toLowerCase()]
  );
}


export async function saveNicknameAuto(userId: string, address: string) {
  let nickname = generateNickname();
  let attempts = 0;

  console.log(`[nicknames] saving nickname for ${userId} → ${address}`);

  while (attempts < 10) {
    const existing = await findNickname(userId, nickname);
    if (!existing) break;
    nickname = generateNickname();
    attempts++;
  }

  console.log(`[nicknames] generated nickname: ${nickname}`);

  await saveNickname(userId, nickname, address);

  console.log(`[nicknames] saved!`);

  return nickname;
}



export async function findNickname(userId: string, nickname: string) {
  const rows = await query(
    `SELECT * FROM wallet_nicknames WHERE user_id = $1 AND nickname = $2`,
    [userId, nickname.toLowerCase()]
  );
  return rows[0] ?? null;
}



export async function listNicknames(userId: string) {
  return query(
    `SELECT * FROM wallet_nicknames WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
}

export async function deleteNickname(userId: string, nickname: string) {
  await query(
    `DELETE FROM wallet_nicknames WHERE user_id = $1 AND nickname = $2`,
    [userId, nickname.toLowerCase()]
  );
}