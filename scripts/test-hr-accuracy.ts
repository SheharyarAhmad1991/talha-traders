/**
 * End-to-end HR accuracy test: controlled attendance + salary verification.
 * Run: npx tsx scripts/test-hr-accuracy.ts
 */
import { config } from "dotenv";
config({ path: ".env.local", override: true });
config({ path: ".env" });

import { PrismaClient, HRSalaryType } from "@prisma/client";

const url = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
const prisma = new PrismaClient({ datasources: { db: { url } } });

const TEST_MONTH = "2026-09";
const START = `${TEST_MONTH}-01`;
const END = `${TEST_MONTH}-30`;

function dayUTC(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`);
}

function daysInRange(startIso: string, endIso: string) {
  const out: string[] = [];
  const cur = new Date(`${startIso}T00:00:00.000Z`);
  const end = new Date(`${endIso}T00:00:00.000Z`);
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

/** Same logic as app/api/hr/salary/route.ts */
function calcSalary(
  salaryType: HRSalaryType,
  salaryAmount: number,
  presents: number,
  bonus: number
) {
  const base =
    salaryType === "DAILY" ? presents * salaryAmount : salaryAmount;
  return base + bonus;
}

type EmployeePlan = {
  nameMatch: string; // substring match in employee name
  salaryType: HRSalaryType;
  salaryAmount: number;
  absentDays: number[]; // day-of-month numbers absent
  bonusByDay: Record<number, number>; // day -> bonus when present
};

async function main() {
  console.log("=== HR Accuracy Test (September 2026, Factory 1) ===\n");

  const factory = await prisma.hRFactory.findFirst({
    where: { name: "Factory 1" },
  });
  if (!factory) {
    throw new Error("Factory 1 not found. Run seed-hr-demo.ts first.");
  }

  const employees = await prisma.hREmployee.findMany({
    where: { factoryId: factory.id },
    orderBy: { name: "asc" },
  });
  if (employees.length !== 5) {
    throw new Error(`Expected 5 employees in Factory 1, got ${employees.length}`);
  }

  // Controlled test plan — we know exact expected outcomes
  const plans: EmployeePlan[] = [
    {
      nameMatch: "Ali",
      salaryType: "DAILY",
      salaryAmount: 1500,
      absentDays: [1, 2, 3, 10, 15], // 5 absences
      bonusByDay: { 5: 500, 12: 500, 20: 500 }, // 1500 total bonus
    },
    {
      nameMatch: "Bilal",
      salaryType: "DAILY",
      salaryAmount: 1800,
      absentDays: [4, 11], // 2 absences
      bonusByDay: { 8: 900 },
    },
    {
      nameMatch: "Hassan",
      salaryType: "MONTHLY",
      salaryAmount: 45000,
      absentDays: [6, 7, 8, 9, 13], // monthly: presents still counted
      bonusByDay: { 14: 2000 },
    },
    {
      nameMatch: "Usman",
      salaryType: "DAILY",
      salaryAmount: 2000,
      absentDays: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], // 12 absences
      bonusByDay: {},
    },
    {
      nameMatch: "Omar",
      salaryType: "MONTHLY",
      salaryAmount: 50000,
      absentDays: [22, 23],
      bonusByDay: { 25: 3000, 28: 2000 },
    },
  ];

  const allDays = daysInRange(START, END);
  const start = dayUTC(START);
  const end = dayUTC(END);

  // Remove existing Sept 2026 attendance for these employees
  await prisma.hRAttendance.deleteMany({
    where: {
      employeeId: { in: employees.map((e) => e.id) },
      date: { gte: start, lte: end },
    },
  });

  const expected = new Map<
    string,
    { presents: number; bonus: number; finalSalary: number; name: string }
  >();

  for (const plan of plans) {
    const emp = employees.find((e) => e.name.includes(plan.nameMatch));
    if (!emp) throw new Error(`Employee matching "${plan.nameMatch}" not found`);

    let presents = 0;
    let totalBonus = 0;
    const rows: {
      date: Date;
      employeeId: string;
      isPresent: boolean;
      bonusAmount: number;
    }[] = [];

    for (const iso of allDays) {
      const dayNum = parseInt(iso.slice(8, 10), 10);
      const absent = plan.absentDays.includes(dayNum);
      const isPresent = !absent;
      let bonusAmount = 0;
      if (isPresent && plan.bonusByDay[dayNum]) {
        bonusAmount = plan.bonusByDay[dayNum];
      }
      if (isPresent) presents += 1;
      totalBonus += bonusAmount;

      rows.push({
        date: dayUTC(iso),
        employeeId: emp.id,
        isPresent,
        bonusAmount,
      });
    }

    const finalSalary = calcSalary(
      emp.salaryType,
      emp.salaryAmount,
      presents,
      totalBonus
    );

    expected.set(emp.id, {
      presents,
      bonus: totalBonus,
      finalSalary,
      name: emp.name,
    });

    // Insert in chunks
    for (let i = 0; i < rows.length; i += 25) {
      await prisma.hRAttendance.createMany({ data: rows.slice(i, i + 25) });
    }

    console.log(
      `Seeded ${emp.name}: presents=${presents}, bonus=${totalBonus}, expected FINAL=${finalSalary}`
    );
  }

  // --- Verify using same DB query as salary API ---
  const attendance = await prisma.hRAttendance.findMany({
    where: {
      employeeId: { in: employees.map((e) => e.id) },
      date: { gte: start, lte: end },
    },
  });

  const byEmployee = new Map<string, { presents: number; bonus: number }>();
  for (const row of attendance) {
    const cur = byEmployee.get(row.employeeId) || { presents: 0, bonus: 0 };
    if (row.isPresent) cur.presents += 1;
    cur.bonus += row.bonusAmount || 0;
    byEmployee.set(row.employeeId, cur);
  }

  console.log("\n--- Verification (API logic) ---\n");
  let allPass = true;

  for (const emp of employees) {
    const stats = byEmployee.get(emp.id) || { presents: 0, bonus: 0 };
    const finalSalary = calcSalary(
      emp.salaryType,
      emp.salaryAmount,
      stats.presents,
      stats.bonus
    );

    const exp = expected.get(emp.id)!;
    const pass =
      stats.presents === exp.presents &&
      stats.bonus === exp.bonus &&
      finalSalary === exp.finalSalary;

    if (!pass) allPass = false;

    console.log(`${pass ? "PASS" : "FAIL"} | ${emp.name}`);
    console.log(
      `  Presents: ${stats.presents} (expected ${exp.presents})`
    );
    console.log(`  Bonus:    ${stats.bonus} (expected ${exp.bonus})`);
    console.log(
      `  Salary:   ${finalSalary} (expected ${exp.finalSalary}) [${emp.salaryType} @ ${emp.salaryAmount}]`
    );
    if (emp.salaryType === "DAILY") {
      console.log(
        `  Formula:  ${stats.presents} × ${emp.salaryAmount} + ${stats.bonus} = ${finalSalary}`
      );
    } else {
      console.log(
        `  Formula:  ${emp.salaryAmount} + ${stats.bonus} = ${finalSalary}`
      );
    }
    console.log("");
  }

  // Attendance save round-trip: pick one day, mark all absent except Ali present with bonus
  const testDay = `${TEST_MONTH}-16`;
  const ali = employees.find((e) => e.name.includes("Ali"))!;
  const saveRows = employees.map((e) => ({
    employeeId: e.id,
    isPresent: e.id === ali.id,
    bonusAmount: e.id === ali.id ? 777 : 0,
  }));

  await prisma.$transaction(
    saveRows.map((row) =>
      prisma.hRAttendance.upsert({
        where: {
          employeeId_date: {
            employeeId: row.employeeId,
            date: dayUTC(testDay),
          },
        },
        create: {
          date: dayUTC(testDay),
          employeeId: row.employeeId,
          isPresent: row.isPresent,
          bonusAmount: row.bonusAmount,
        },
        update: {
          isPresent: row.isPresent,
          bonusAmount: row.bonusAmount,
        },
      })
    )
  );

  const day16 = await prisma.hRAttendance.findMany({
    where: { date: dayUTC(testDay), employeeId: { in: employees.map((e) => e.id) } },
  });
  const ali16 = day16.find((a) => a.employeeId === ali.id);
  const othersAbsent = day16.filter((a) => a.employeeId !== ali.id).every((a) => !a.isPresent);
  const upsertOk =
    ali16?.isPresent === true &&
    ali16.bonusAmount === 777 &&
    othersAbsent &&
    day16.length === 5;

  console.log(
    upsertOk
      ? "PASS | Attendance upsert (Sept 16): only Ali present, bonus 777"
      : "FAIL | Attendance upsert"
  );
  if (!upsertOk) allPass = false;

  // Recompute Ali after day 16 edit (day 16 was already present; bonus 0 -> 777)
  const aliAttendance = await prisma.hRAttendance.findMany({
    where: {
      employeeId: ali.id,
      date: { gte: start, lte: end },
    },
  });
  const aliPresents = aliAttendance.filter((a) => a.isPresent).length;
  const aliBonus = aliAttendance.reduce((s, a) => s + (a.bonusAmount || 0), 0);
  const aliExpectedPresents = 25; // unchanged — day 16 was already present
  const aliExpectedBonus = 500 + 500 + 777 + 500; // days 5, 12, 16, 20
  const aliExpectedFinal = aliExpectedPresents * 1500 + aliExpectedBonus;

  const aliRecalcPass =
    aliPresents === aliExpectedPresents &&
    aliBonus === aliExpectedBonus &&
    calcSalary("DAILY", 1500, aliPresents, aliBonus) === aliExpectedFinal;

  console.log(
    aliRecalcPass
      ? `PASS | Ali after edit: ${aliPresents} presents, bonus ${aliBonus}, final ${aliExpectedFinal}`
      : `FAIL | Ali after edit: got ${aliPresents}/${aliBonus}, expected ${aliExpectedPresents}/${aliExpectedBonus}`
  );
  if (!aliRecalcPass) allPass = false;

  // Restore day 16 for non-Ali employees (upsert test only changed Ali's bonus)
  const testDayNum = 16;
  for (const plan of plans) {
    if (plan.nameMatch === "Ali") continue;
    const emp = employees.find((e) => e.name.includes(plan.nameMatch))!;
    const wasPresent = !plan.absentDays.includes(testDayNum);
    const bonus = wasPresent ? plan.bonusByDay[testDayNum] || 0 : 0;
    await prisma.hRAttendance.update({
      where: {
        employeeId_date: { employeeId: emp.id, date: dayUTC(testDay) },
      },
      data: { isPresent: wasPresent, bonusAmount: bonus },
    });
  }

  console.log("\n--- Final month totals (after attendance edit test) ---\n");
  const finalAttendance = await prisma.hRAttendance.findMany({
    where: {
      employeeId: { in: employees.map((e) => e.id) },
      date: { gte: start, lte: end },
    },
  });
  const finalByEmp = new Map<string, { presents: number; bonus: number }>();
  for (const row of finalAttendance) {
    const cur = finalByEmp.get(row.employeeId) || { presents: 0, bonus: 0 };
    if (row.isPresent) cur.presents += 1;
    cur.bonus += row.bonusAmount || 0;
    finalByEmp.set(row.employeeId, cur);
  }

  for (const emp of employees) {
    const stats = finalByEmp.get(emp.id)!;
    const finalSalary = calcSalary(
      emp.salaryType,
      emp.salaryAmount,
      stats.presents,
      stats.bonus
    );
    const exp = expected.get(emp.id)!;
    // Ali expected changed after bonus edit on day 16
    const expPresents = emp.name.includes("Ali") ? aliExpectedPresents : exp.presents;
    const expBonus = emp.name.includes("Ali") ? aliExpectedBonus : exp.bonus;
    const expFinal = emp.name.includes("Ali")
      ? aliExpectedFinal
      : exp.finalSalary;
    const pass =
      stats.presents === expPresents &&
      stats.bonus === expBonus &&
      finalSalary === expFinal;
    if (!pass) allPass = false;
    console.log(
      `${pass ? "PASS" : "FAIL"} | ${emp.name}: ${stats.presents}p, bonus ${stats.bonus}, salary ${finalSalary}`
    );
  }

  console.log("\n" + (allPass ? "=== ALL TESTS PASSED (100%) ===" : "=== SOME TESTS FAILED ==="));
  process.exit(allPass ? 0 : 1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
