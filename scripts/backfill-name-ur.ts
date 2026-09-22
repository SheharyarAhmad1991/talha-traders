/**
 * Backfill nameUr for EVERY record missing it (auto Urdu from English name).
 * Run: npx tsx scripts/backfill-name-ur.ts
 */
import { config } from "dotenv";
config({ path: ".env.local", override: true });
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";
import { autoUrduName } from "../lib/i18n/auto-urdu";

const rawUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
function withScriptPool(url: string) {
  try {
    const u = new URL(url);
    u.searchParams.set("connection_limit", "1");
    u.searchParams.set("pool_timeout", "60");
    u.searchParams.set("connect_timeout", "30");
    return u.toString();
  } catch {
    return url;
  }
}
const url = withScriptPool(rawUrl);
const prisma = new PrismaClient({
  datasources: { db: { url } },
});

async function backfillModel(
  label: string,
  findMany: () => Promise<{ id: string; name: string; nameUr: string | null }[]>,
  update: (id: string, nameUr: string) => Promise<unknown>
) {
  const rows = await findMany();
  let updated = 0;
  for (const row of rows) {
    const suggested = autoUrduName(row.name);
    if (!suggested) continue;
    // Always refresh so English leftovers get fixed
    if (row.nameUr?.trim() === suggested) continue;
    await update(row.id, suggested);
    updated += 1;
    console.log(`  [${label}] ${row.name} -> ${suggested}`);
  }
  console.log(`${label}: updated ${updated} / ${rows.length}`);
}

async function main() {
  if (!url) throw new Error("DIRECT_URL or DATABASE_URL is required");
  console.log("Backfilling Urdu names…\n");

  await backfillModel(
    "HRFactory",
    () =>
      prisma.hRFactory.findMany({
        select: { id: true, name: true, nameUr: true },
      }),
    (id, nameUr) => prisma.hRFactory.update({ where: { id }, data: { nameUr } })
  );

  await backfillModel(
    "HREmployee",
    () =>
      prisma.hREmployee.findMany({
        select: { id: true, name: true, nameUr: true },
      }),
    (id, nameUr) =>
      prisma.hREmployee.update({ where: { id }, data: { nameUr } })
  );

  await backfillModel(
    "Dealer",
    () =>
      prisma.dealer.findMany({
        select: { id: true, name: true, nameUr: true },
      }),
    (id, nameUr) => prisma.dealer.update({ where: { id }, data: { nameUr } })
  );

  await backfillModel(
    "Worker",
    () =>
      prisma.worker.findMany({
        select: { id: true, name: true, nameUr: true },
      }),
    (id, nameUr) => prisma.worker.update({ where: { id }, data: { nameUr } })
  );

  await backfillModel(
    "RawMaterial",
    () =>
      prisma.rawMaterial.findMany({
        select: { id: true, name: true, nameUr: true },
      }),
    (id, nameUr) =>
      prisma.rawMaterial.update({ where: { id }, data: { nameUr } })
  );

  await backfillModel(
    "FinishedProduct",
    () =>
      prisma.finishedProduct.findMany({
        select: { id: true, name: true, nameUr: true },
      }),
    (id, nameUr) =>
      prisma.finishedProduct.update({ where: { id }, data: { nameUr } })
  );

  console.log("\nDone.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
