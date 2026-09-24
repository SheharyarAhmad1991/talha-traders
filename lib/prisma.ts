import { PrismaClient } from "@prisma/client";

/**
 * Normalize DATABASE_URL for Prisma + Supabase transaction pooler.
 * Never leave connection_limit=1 — it causes multi-minute page hangs.
 */
function withPoolLimits(url: string | undefined) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    // Dev: enough for nav + forms. Prod (Vercel): stay small for free-tier pooler.
    const limit = process.env.NODE_ENV === "production" ? "3" : "5";
    parsed.searchParams.set("connection_limit", limit);
    parsed.searchParams.set("pool_timeout", "15");
    parsed.searchParams.set("connect_timeout", "20");
    parsed.searchParams.set("pgbouncer", "true");
    return parsed.toString();
  } catch {
    return url;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    datasources: {
      db: {
        url: withPoolLimits(process.env.DATABASE_URL),
      },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
