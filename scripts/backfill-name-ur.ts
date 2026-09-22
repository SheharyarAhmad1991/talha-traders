/**
 * Backfill nameUr for common English name patterns.
 * Run: npx tsx scripts/backfill-name-ur.ts
 * Prefer DIRECT_URL after `npx prisma db push`.
 */
import { config } from "dotenv";
config({ path: ".env.local", override: true });
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";

const url =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  "";

const prisma = new PrismaClient({
  datasources: { db: { url } },
});

const ARABIC_RE = /[\u0600-\u06FF]/;

const NAME_PARTS: [RegExp, string][] = [
  [/\bAli\b/gi, "علی"],
  [/\bBilal\b/gi, "بلال"],
  [/\bHassan\b/gi, "حسن"],
  [/\bUsman\b/gi, "عثمان"],
  [/\bOmar\b/gi, "عمر"],
  [/\bUmer\b/gi, "عمر"],
];

const FACTORY_MAP: Record<string, string> = {
  "Factory 1": "فیکٹری 1",
  "Factory 2": "فیکٹری 2",
  "Factory 3": "فیکٹری 3",
  Factory1: "فیکٹری 1",
  Factory2: "فیکٹری 2",
  Factory3: "فیکٹری 3",
};

function looksUrdu(name: string) {
  return ARABIC_RE.test(name);
}

function translateFactory(name: string): string | null {
  const trimmed = name.trim();
  if (FACTORY_MAP[trimmed]) return FACTORY_MAP[trimmed];
  const m = trimmed.match(/^Factory\s*(\d+)$/i);
  if (m) return `فیکٹری ${m[1]}`;
  return null;
}

function translatePersonName(name: string): string | null {
  let out = name;
  let changed = false;
  for (const [re, ur] of NAME_PARTS) {
    if (re.test(out)) {
      out = out.replace(re, ur);
      changed = true;
    }
  }
  return changed ? out : null;
}

function suggestNameUr(name: string): string | null {
  if (!name?.trim()) return null;
  if (looksUrdu(name)) return name.trim();
  return translateFactory(name) || translatePersonName(name);
}

async function backfillModel(
  label: string,
  findMany: () => Promise<{ id: string; name: string; nameUr: string | null }[]>,
  update: (id: string, nameUr: string) => Promise<unknown>
) {
  const rows = await findMany();
  let updated = 0;
  for (const row of rows) {
    if (row.nameUr?.trim()) continue;
    const suggested = suggestNameUr(row.name);
    if (!suggested) continue;
    await update(row.id, suggested);
    updated += 1;
    console.log(`  [${label}] ${row.name} -> ${suggested}`);
  }
  console.log(`${label}: updated ${updated} / ${rows.length}`);
}

async function main() {
  if (!url) {
    throw new Error("DIRECT_URL or DATABASE_URL is required");
  }
  console.log("Using DB:", url.replace(/:[^:@]+@/, ":***@"));

  await backfillModel(
    "HRFactory",
    () => prisma.hRFactory.findMany({ select: { id: true, name: true, nameUr: true } }),
    (id, nameUr) => prisma.hRFactory.update({ where: { id }, data: { nameUr } })
  );

  await backfillModel(
    "HREmployee",
    () => prisma.hREmployee.findMany({ select: { id: true, name: true, nameUr: true } }),
    (id, nameUr) => prisma.hREmployee.update({ where: { id }, data: { nameUr } })
  );

  await backfillModel(
    "Dealer",
    () => prisma.dealer.findMany({ select: { id: true, name: true, nameUr: true } }),
    (id, nameUr) => prisma.dealer.update({ where: { id }, data: { nameUr } })
  );

  await backfillModel(
    "Worker",
    () => prisma.worker.findMany({ select: { id: true, name: true, nameUr: true } }),
    (id, nameUr) => prisma.worker.update({ where: { id }, data: { nameUr } })
  );

  await backfillModel(
    "RawMaterial",
    () =>
      prisma.rawMaterial.findMany({ select: { id: true, name: true, nameUr: true } }),
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

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
