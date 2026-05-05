import Redis from "ioredis";

const LEADER_KEY = "quorum:leader";
const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

redis.on("error", (err) => {
  console.error("[redis] error:", err.message);
});

export async function tryAcquireLeader(instanceId: string, ttlMs: number): Promise<boolean> {
  const result = await redis.set(LEADER_KEY, instanceId, "PX", ttlMs, "NX");
  return result === "OK";
}

export async function renewLeader(instanceId: string, ttlMs: number): Promise<boolean> {
  const script = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("PEXPIRE", KEYS[1], ARGV[2])
    else
      return 0
    end
  `;
  const result = await redis.eval(script, 1, LEADER_KEY, instanceId, ttlMs.toString()) as number;
  return result === 1;
}

export async function releaseLeader(instanceId: string): Promise<void> {
  const script = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("DEL", KEYS[1])
    else
      return 0
    end
  `;
  await redis.eval(script, 1, LEADER_KEY, instanceId);
}

export async function getLeader(): Promise<string | null> {
  return redis.get(LEADER_KEY);
}

export { redis };