import { PrismaClient } from "@prisma/client";

function withPoolLimits(url: string | undefined) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    // Local Next.js holds one long-lived Prisma client and can run concurrent
    // requests (navigation, Strict Mode, prefetch). connection_limit=1 causes
    // pool timeouts even for sequential page queries when another request is open.
    // Production serverless stays small; local/dev gets a bit more headroom.
    const limit = process.env.NODE_ENV === "production" ? "3" : "5";
    parsed.searchParams.set("connection_limit", limit);
    parsed.searchParams.set("pool_timeout", "60");
    if (!parsed.searchParams.has("connect_timeout")) {
      parsed.searchParams.set("connect_timeout", "30");
    }
    if (!parsed.searchParams.has("pgbouncer")) {
      parsed.searchParams.set("pgbouncer", "true");
    }
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

// Hot reload can leave a dead client holding the only pool slot — recreate if needed
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
