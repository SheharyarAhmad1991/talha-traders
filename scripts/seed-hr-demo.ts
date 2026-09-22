/**
 * Seed HR dummy data + one month of attendance, then print salary checks.
 * Run: npx tsx scripts/seed-hr-demo.ts
 */
import { config } from "dotenv";
config({ path: ".env.local", override: true });
config({ path: ".env" });

import { PrismaClient, HRSalaryType } from "@prisma/client";

// Prefer session pooler (5432) for bulk seed — more stable than transaction 6543
const url =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  "";

const prisma = new PrismaClient({
  datasources: { db: { url } },
});

function dayUTC(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`);
}

function daysInMonth(year: number, monthIndex0: number) {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("Using DB:", url.replace(/:[^:@]+@/, ":***@"));

  console.log("Clearing old HR data...");
  await prisma.hRAttendance.deleteMany();
  await prisma.hREmployee.deleteMany();
  await prisma.hRFactory.deleteMany();

  const factoryNames = ["Factory 1", "Factory 2", "Factory 3"];
  const factories = [];
  for (const name of factoryNames) {
    factories.push(await prisma.hRFactory.create({ data: { name } }));
    console.log("Created", name);
  }

  const employeeTemplates = [
    { suffix: "Ali", salaryType: HRSalaryType.DAILY, salaryAmount: 1500 },
    { suffix: "Bilal", salaryType: HRSalaryType.DAILY, salaryAmount: 1800 },
    { suffix: "Hassan", salaryType: HRSalaryType.MONTHLY, salaryAmount: 45000 },
    { suffix: "Usman", salaryType: HRSalaryType.DAILY, salaryAmount: 2000 },
    { suffix: "Omar", salaryType: HRSalaryType.MONTHLY, salaryAmount: 50000 },
  ];

  const employees = [];
  for (const factory of factories) {
    for (const t of employeeTemplates) {
      const emp = await prisma.hREmployee.create({
        data: {
          name: `${factory.name} - ${t.suffix}`,
          factoryId: factory.id,
          salaryType: t.salaryType,
          salaryAmount: t.salaryAmount,
        },
      });
      employees.push(emp);
    }
    console.log(`Employees for ${factory.name}: 5`);
  }

  const year = 2026;
  const monthIndex0 = 7; // August
  const totalDays = daysInMonth(year, monthIndex0);

  const attendanceData: {
    date: Date;
    employeeId: string;
    isPresent: boolean;
    bonusAmount: number;
  }[] = [];

  for (const emp of employees) {
    for (let day = 1; day <= totalDays; day++) {
      const iso = `${year}-08-${String(day).padStart(2, "0")}`;
      const weekday = new Date(`${iso}T12:00:00.000Z`).getUTCDay();
      const isWeekend = weekday === 0 || weekday === 6;

      let isPresent = !isWeekend;
      if (day === 5 || day === 20) isPresent = false;
      if (isWeekend) isPresent = false;

      // Bonus on a weekday (Aug 14 2026 = Friday) for daily workers
      const bonusAmount =
        isPresent && day === 14 && emp.salaryType === "DAILY" ? 500 : 0;

      attendanceData.push({
        date: dayUTC(iso),
        employeeId: emp.id,
        isPresent,
        bonusAmount,
      });
    }
  }

  console.log(`Inserting ${attendanceData.length} attendance rows...`);
  let attendanceRows = 0;
  for (let i = 0; i < attendanceData.length; i += 25) {
    const chunk = attendanceData.slice(i, i + 25);
    let ok = false;
    for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
      try {
        await prisma.hRAttendance.createMany({ data: chunk });
        ok = true;
      } catch (e) {
        console.warn(`chunk ${i} attempt ${attempt} failed, retrying...`);
        await sleep(1500 * attempt);
        if (attempt === 3) throw e;
      }
    }
    attendanceRows += chunk.length;
    if (attendanceRows % 100 === 0 || attendanceRows === attendanceData.length) {
      console.log(`  ${attendanceRows}/${attendanceData.length}`);
    }
  }

  console.log("--- Seed complete ---");
  console.log(`Factories: ${factories.length}`);
  console.log(`Employees: ${employees.length}`);
  console.log(`Attendance rows: ${attendanceRows}`);

  // Manual expected presents for Aug 2026:
  // Weekdays in Aug 2026 minus absences on 5 and 20 (both weekdays)
  // Aug 1 2026 is Saturday. Weekdays: count Mon-Fri excluding 5,20.
  const factory1 = factories[0];
  const start = dayUTC("2026-08-01");
  const end = dayUTC("2026-08-31");
  const f1Employees = employees.filter((e) => e.factoryId === factory1.id);
  const attendance = await prisma.hRAttendance.findMany({
    where: {
      employeeId: { in: f1Employees.map((e) => e.id) },
      date: { gte: start, lte: end },
    },
  });

  console.log(`\n--- Salary check: ${factory1.name} (Aug 2026) ---`);
  let allOk = true;
  for (const emp of f1Employees) {
    const rows = attendance.filter((a) => a.employeeId === emp.id);
    const presents = rows.filter((a) => a.isPresent).length;
    const bonus = rows.reduce((s, a) => s + (a.bonusAmount || 0), 0);
    const final =
      emp.salaryType === "DAILY"
        ? presents * emp.salaryAmount + bonus
        : emp.salaryAmount + bonus;

    const expectedBonus = emp.salaryType === "DAILY" ? 500 : 0;
    // Weekdays Aug 2026: 21 total weekdays; absences on 5 and 20 => 19 presents
    const expectedPresents = 19;
    const expectedFinal =
      emp.salaryType === "DAILY"
        ? expectedPresents * emp.salaryAmount + expectedBonus
        : emp.salaryAmount + expectedBonus;

    const pass =
      presents === expectedPresents &&
      bonus === expectedBonus &&
      final === expectedFinal;
    if (!pass) allOk = false;

    console.log(
      `${pass ? "PASS" : "FAIL"} | ${emp.name} | ${emp.salaryType} ${emp.salaryAmount} | presents=${presents} (exp ${expectedPresents}) bonus=${bonus} (exp ${expectedBonus}) FINAL=${final} (exp ${expectedFinal})`
    );
  }

  // Also hit the salary API logic path via same formula for Factory 2 count
  const apiStyle = await prisma.hREmployee.findMany({
    where: { factoryId: factories[1].id },
    orderBy: { name: "asc" },
  });
  console.log(`\nFactory 2 employees in DB: ${apiStyle.length} (expect 5)`);
  console.log(allOk ? "\nALL Factory 1 salary checks PASSED" : "\nSome checks FAILED");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
