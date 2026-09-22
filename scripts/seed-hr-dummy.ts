/**
 * Seed HR dummy data for testing:
 * - Factory 1, Factory 2, Factory 3
 * - 5 employees each (mix of DAILY / MONTHLY)
 * - Full previous-month attendance with some absences + bonuses
 * - Print salary evaluation for verification
 */
import { config } from "dotenv";
config({ path: ".env.local", override: true });
config({ path: ".env" });

import { PrismaClient, HRSalaryType } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

function dayDate(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`);
}

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function previousMonthRange(today = new Date()) {
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth(); // 0-based current
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0)); // last day of previous month
  return { start, end };
}

function eachDay(start: Date, end: Date) {
  const days: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

type EmpSpec = {
  name: string;
  salaryType: HRSalaryType;
  salaryAmount: number;
};

const factories: { name: string; employees: EmpSpec[] }[] = [
  {
    name: "Factory 1",
    employees: [
      { name: "Ali Khan", salaryType: "DAILY", salaryAmount: 1500 },
      { name: "Bilal Ahmed", salaryType: "DAILY", salaryAmount: 1800 },
      { name: "Sara Malik", salaryType: "MONTHLY", salaryAmount: 45000 },
      { name: "Usman Raza", salaryType: "DAILY", salaryAmount: 1600 },
      { name: "Fatima Noor", salaryType: "MONTHLY", salaryAmount: 50000 },
    ],
  },
  {
    name: "Factory 2",
    employees: [
      { name: "Hamza Iqbal", salaryType: "DAILY", salaryAmount: 1400 },
      { name: "Ayesha Bibi", salaryType: "MONTHLY", salaryAmount: 42000 },
      { name: "Omar Farooq", salaryType: "DAILY", salaryAmount: 1700 },
      { name: "Nida Shah", salaryType: "DAILY", salaryAmount: 1550 },
      { name: "Zain Abbas", salaryType: "MONTHLY", salaryAmount: 48000 },
    ],
  },
  {
    name: "Factory 3",
    employees: [
      { name: "Imran Javed", salaryType: "DAILY", salaryAmount: 2000 },
      { name: "Hina Qureshi", salaryType: "MONTHLY", salaryAmount: 55000 },
      { name: "Kashif Mehmood", salaryType: "DAILY", salaryAmount: 1750 },
      { name: "Rabia Anwar", salaryType: "DAILY", salaryAmount: 1650 },
      { name: "Tariq Hussain", salaryType: "MONTHLY", salaryAmount: 46000 },
    ],
  },
];

async function main() {
  console.log("Cleaning previous HR seed data (Factory 1/2/3)...");
  const old = await prisma.hRFactory.findMany({
    where: { name: { in: ["Factory 1", "Factory 2", "Factory 3"] } },
    select: { id: true },
  });
  if (old.length) {
    await prisma.hRFactory.deleteMany({
      where: { id: { in: old.map((f) => f.id) } },
    });
  }

  console.log("Creating factories + employees...");
  const created: {
    factoryId: string;
    factoryName: string;
    employees: { id: string; name: string; salaryType: HRSalaryType; salaryAmount: number }[];
  }[] = [];

  for (const f of factories) {
    const factory = await prisma.hRFactory.create({ data: { name: f.name } });
    const employees = [];
    for (const e of f.employees) {
      const emp = await prisma.hREmployee.create({
        data: {
          name: e.name,
          factoryId: factory.id,
          salaryType: e.salaryType,
          salaryAmount: e.salaryAmount,
        },
      });
      employees.push(emp);
    }
    created.push({
      factoryId: factory.id,
      factoryName: factory.name,
      employees,
    });
    console.log(`  ${factory.name}: ${employees.length} employees`);
  }

  const { start, end } = previousMonthRange();
  const days = eachDay(start, end);
  console.log(
    `\nSeeding attendance for ${ymd(start)} → ${ymd(end)} (${days.length} days)...`
  );

  for (const factory of created) {
    for (const emp of factory.employees) {
      for (let i = 0; i < days.length; i++) {
        const date = days[i];
        // Deterministic pattern: absent every 7th day (index 6,13,20...)
        const isPresent = i % 7 !== 6;
        // Bonus on day 1 and mid-month for first daily employee only
        let bonusAmount = 0;
        if (isPresent && emp.salaryType === "DAILY" && (i === 0 || i === 14)) {
          bonusAmount = 500;
        }
        if (isPresent && emp.salaryType === "MONTHLY" && i === 0) {
          bonusAmount = 1000;
        }

        await prisma.hRAttendance.upsert({
          where: {
            employeeId_date: {
              employeeId: emp.id,
              date: dayDate(ymd(date)),
            },
          },
          create: {
            employeeId: emp.id,
            date: dayDate(ymd(date)),
            isPresent,
            bonusAmount,
          },
          update: {
            isPresent,
            bonusAmount,
          },
        });
      }
    }
    console.log(`  Attendance saved for ${factory.factoryName}`);
  }

  console.log("\n=== Salary evaluation (previous month) ===");
  for (const factory of created) {
    console.log(`\n${factory.factoryName}`);
    console.log(
      "Employee | Type | Rate | Presents | Bonus | Final Salary"
    );

    for (const emp of factory.employees) {
      const rows = await prisma.hRAttendance.findMany({
        where: {
          employeeId: emp.id,
          date: { gte: start, lte: end },
        },
      });
      const presents = rows.filter((r) => r.isPresent).length;
      const bonus = rows.reduce((s, r) => s + (r.bonusAmount || 0), 0);
      const base =
        emp.salaryType === "DAILY"
          ? presents * emp.salaryAmount
          : emp.salaryAmount;
      const finalSalary = base + bonus;

      console.log(
        `${emp.name} | ${emp.salaryType} | ${emp.salaryAmount} | ${presents} | ${bonus} | ${finalSalary}`
      );

      // Sanity checks
      if (emp.salaryType === "DAILY") {
        const expected = presents * emp.salaryAmount + bonus;
        if (finalSalary !== expected) {
          throw new Error(`Daily calc mismatch for ${emp.name}`);
        }
      } else {
        const expected = emp.salaryAmount + bonus;
        if (finalSalary !== expected) {
          throw new Error(`Monthly calc mismatch for ${emp.name}`);
        }
      }
    }
  }

  console.log("\nAll salary calculations verified OK.");
  console.log(`Period for UI test: ${ymd(start)} to ${ymd(end)}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
