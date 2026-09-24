/**
 * Fast cache for dashboard / master reads.
 * - Always: in-process memory (instant on local + same Vercel instance)
 * - Optional: Upstash Redis when UPSTASH_REDIS_REST_URL + TOKEN are set
 */

type Entry = { value: string; expiresAt: number };

const memory = new Map<string, Entry>();

const DEFAULT_TTL_SECONDS = 30;

function hasUpstash() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

async function getRedis() {
  if (!hasUpstash()) return null;
  const { Redis } = await import("@upstash/redis");
  return Redis.fromEnv();
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const now = Date.now();
  const mem = memory.get(key);
  if (mem && mem.expiresAt > now) {
    try {
      return JSON.parse(mem.value) as T;
    } catch {
      memory.delete(key);
    }
  }

  try {
    const redis = await getRedis();
    if (redis) {
      const raw = await redis.get<string>(key);
      if (raw != null) {
        const value = typeof raw === "string" ? raw : JSON.stringify(raw);
        memory.set(key, {
          value,
          expiresAt: now + DEFAULT_TTL_SECONDS * 1000,
        });
        return (typeof raw === "string" ? JSON.parse(raw) : raw) as T;
      }
    }
  } catch (err) {
    console.warn("[cache] redis get failed", err);
  }

  return null;
}

export async function cacheSet(
  key: string,
  data: unknown,
  ttlSeconds = DEFAULT_TTL_SECONDS
) {
  const value = JSON.stringify(data);
  const expiresAt = Date.now() + ttlSeconds * 1000;
  memory.set(key, { value, expiresAt });

  try {
    const redis = await getRedis();
    if (redis) {
      await redis.set(key, value, { ex: ttlSeconds });
    }
  } catch (err) {
    console.warn("[cache] redis set failed", err);
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
    console.warn("[cache] redis del failed", err);
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
