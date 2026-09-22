import { config } from "dotenv";
config({ path: ".env.local", override: true });
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
const p = new PrismaClient({ datasources: { db: { url } } });

async function main() {
  const day = new Date("2026-08-14T00:00:00.000Z");
  const daily = await p.hREmployee.findMany({ where: { salaryType: "DAILY" } });
  let n = 0;
  for (const e of daily) {
    const r = await p.hRAttendance.updateMany({
      where: { employeeId: e.id, date: day, isPresent: true },
      data: { bonusAmount: 500 },
    });
    n += r.count;
  }
  console.log("Updated bonus rows:", n);

  const ali = await p.hREmployee.findFirst({
    where: { name: "Factory 1 - Ali" },
  });
  if (!ali) {
    console.log("Ali not found");
    return;
  }
  const rows = await p.hRAttendance.findMany({
    where: {
      employeeId: ali.id,
      date: {
        gte: new Date("2026-08-01T00:00:00.000Z"),
        lte: new Date("2026-08-31T00:00:00.000Z"),
      },
    },
  });
  const presents = rows.filter((a) => a.isPresent).length;
  const bonus = rows.reduce((s, a) => s + (a.bonusAmount || 0), 0);
  const final = presents * ali.salaryAmount + bonus;
  console.log({
    presents,
    bonus,
    final,
    expected: 19 * 1500 + 500,
    pass: presents === 19 && bonus === 500 && final === 29000,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await p.$disconnect();
  });
