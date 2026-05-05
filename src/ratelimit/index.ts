import { query } from "../db/client.js";

const MAX_REQUESTS = 10; // max 10 commands per minute per user

export async function checkRateLimit(userId: string): Promise<boolean> {
  const windowStart = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();

  const rows = await query(
    `INSERT INTO rate_limit_buckets (user_id, window_start, count)
     VALUES ($1, $2, 1)
     ON CONFLICT (user_id, window_start)
     DO UPDATE SET count = rate_limit_buckets.count + 1
     RETURNING count`,
    [userId, windowStart]
  );

  const count = (rows[0] as any)?.count ?? 1;

  if (count > MAX_REQUESTS) {
    console.log(`[ratelimit] ${userId} exceeded limit: ${count} requests this minute`);
    return false;
  }

  return true;
}

export async function getRateLimitStatus(userId: string): Promise<{ count: number; max: number; resetsIn: number }> {
  const windowStart = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();

  const rows = await query(
    `SELECT count FROM rate_limit_buckets
     WHERE user_id = $1 AND window_start = $2`,
    [userId, windowStart]
  );

  const count = (rows[0] as any)?.count ?? 0;
  const resetsIn = 60 - Math.floor((Date.now() % 60000) / 1000);

  return { count, max: MAX_REQUESTS, resetsIn };
}