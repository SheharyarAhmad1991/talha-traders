/**
 * Fast cache for dashboard / master reads.
 * Safe by design:
 * - Memory cache always works (local + same serverless instance)
 * - Upstash Redis is OPTIONAL — if missing or failing, app still works
 */

type Entry = { value: string; expiresAt: number };

const memory = new Map<string, Entry>();

const DEFAULT_TTL_SECONDS = 45;

type RedisClient = {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: string, opts?: { ex?: number }) => Promise<unknown>;
  del: (...keys: string[]) => Promise<unknown>;
};

let redisClient: RedisClient | null | undefined;
let redisInitFailed = false;

function hasUpstashEnv() {
  // Vercel Marketplace Upstash injects KV_REST_API_*; console DBs use UPSTASH_*
  return Boolean(
    (process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN) ||
      (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
  );
}

async function getRedis(): Promise<RedisClient | null> {
  if (!hasUpstashEnv() || redisInitFailed) return null;
  if (redisClient !== undefined) return redisClient;

  try {
    const { Redis } = await import("@upstash/redis");
    redisClient = Redis.fromEnv() as unknown as RedisClient;
    return redisClient;
  } catch (err) {
    redisInitFailed = true;
    redisClient = null;
    console.warn("[cache] Upstash init skipped — using memory only", err);
    return null;
  }
}

function parseCached<T>(raw: unknown): T | null {
  if (raw == null) return null;
  try {
    if (typeof raw === "string") return JSON.parse(raw) as T;
    // Upstash may auto-deserialize JSON objects
    return raw as T;
  } catch {
    return null;
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const now = Date.now();
  const mem = memory.get(key);
  if (mem && mem.expiresAt > now) {
    const parsed = parseCached<T>(mem.value);
    if (parsed != null) return parsed;
    memory.delete(key);
  }

  try {
    const redis = await getRedis();
    if (redis) {
      const raw = await redis.get(key);
      const parsed = parseCached<T>(raw);
      if (parsed != null) {
        memory.set(key, {
          value: typeof raw === "string" ? raw : JSON.stringify(raw),
          expiresAt: now + DEFAULT_TTL_SECONDS * 1000,
        });
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[cache] redis get failed — falling back to DB", err);
  }

  return null;
}

export async function cacheSet(
  key: string,
  data: unknown,
  ttlSeconds = DEFAULT_TTL_SECONDS
) {
  const value = JSON.stringify(data);
  memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });

  try {
    const redis = await getRedis();
    if (redis) {
      await redis.set(key, value, { ex: ttlSeconds });
    }
  } catch (err) {
    console.warn("[cache] redis set failed — memory cache still active", err);
  }
}

export async function cacheDel(...keys: string[]) {
  for (const key of keys) memory.delete(key);

  try {
    const redis = await getRedis();
    if (redis && keys.length) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.warn("[cache] redis del failed — memory cleared locally", err);
  }
}

export const CACHE_KEYS = {
  dashboard: "dash:home",
  factoryStock: "inv:factory-stock",
  dealers: "master:dealers",
  workers: "master:workers",
  materials: "master:materials",
  products: "master:products",
  hrFactories: "master:hr-factories",
  hrEmployees: "master:hr-employees",
} as const;

/** True when shared Redis is configured (production multi-instance cache). */
export function isRedisEnabled() {
  return hasUpstashEnv() && !redisInitFailed;
}
