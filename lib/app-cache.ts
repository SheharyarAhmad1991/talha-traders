/**
 * Short in-process memory cache for rarely changing master lists
 * (dealers, moulders, materials, etc.).
 * Live inventory / dashboard always hits PostgreSQL.
 */

type Entry = { value: string; expiresAt: number };

const memory = new Map<string, Entry>();

const DEFAULT_TTL_SECONDS = 45;

function parseCached<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const now = Date.now();
  const mem = memory.get(key);
  if (!mem || mem.expiresAt <= now) {
    if (mem) memory.delete(key);
    return null;
  }
  const parsed = parseCached<T>(mem.value);
  if (parsed == null) {
    memory.delete(key);
    return null;
  }
  return parsed;
}

export async function cacheSet(
  key: string,
  data: unknown,
  ttlSeconds = DEFAULT_TTL_SECONDS
) {
  memory.set(key, {
    value: JSON.stringify(data),
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function cacheDel(...keys: string[]) {
  for (const key of keys) memory.delete(key);
}

export const CACHE_KEYS = {
  dealers: "master:dealers",
  workers: "master:workers",
  materials: "master:materials",
  products: "master:products",
  hrFactories: "master:hr-factories",
  hrEmployees: "master:hr-employees",
} as const;
