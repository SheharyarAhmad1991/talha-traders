import { PrismaClient } from "@prisma/client";

function withPoolLimits(url: string | undefined) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    // Keep Prisma's local pool tiny — Supabase free pooler can't handle many
    parsed.searchParams.set("connection_limit", "1");
    parsed.searchParams.set("pool_timeout", "30");
    if (!parsed.searchParams.has("connect_timeout")) {
      parsed.searchParams.set("connect_timeout", "30");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: withPoolLimits(process.env.DATABASE_URL),
      },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
