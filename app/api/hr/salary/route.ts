import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hrSalaryFilterSchema } from "@/lib/validations";

async function requireAuth() {
  const session = await getSession();
  if (!session) return null;
  return session;
}

function dayDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export async function GET(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = hrSalaryFilterSchema.safeParse({
    startDate: searchParams.get("startDate") || "",
    endDate: searchParams.get("endDate") || "",
    factoryId: searchParams.get("factoryId") || "",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid filters" },
      { status: 400 }
    );
  }

  const { startDate, endDate, factoryId } = parsed.data;
  const start = dayDate(startDate);
  const end = dayDate(endDate);

  if (end < start) {
    return NextResponse.json(
      { error: "End date must be on or after start date" },
      { status: 400 }
    );
  }

  const employees = await prisma.hREmployee.findMany({
    where: { factoryId },
    orderBy: { name: "asc" },
  });

  const attendance = await prisma.hRAttendance.findMany({
    where: {
      employeeId: { in: employees.map((e) => e.id) },
      date: { gte: start, lte: end },
    },
  });

  const byEmployee = new Map<
    string,
    { presents: number; bonus: number }
  >();

  for (const row of attendance) {
    const current = byEmployee.get(row.employeeId) || {
      presents: 0,
      bonus: 0,
    };
    if (row.isPresent) current.presents += 1;
    current.bonus += row.bonusAmount || 0;
    byEmployee.set(row.employeeId, current);
  }

  const rows = employees.map((employee) => {
    const stats = byEmployee.get(employee.id) || { presents: 0, bonus: 0 };
    const base =
      employee.salaryType === "DAILY"
        ? stats.presents * employee.salaryAmount
        : employee.salaryAmount;
    const finalSalary = base + stats.bonus;

    return {
      employeeId: employee.id,
      name: employee.name,
      nameUr: employee.nameUr,
      salaryType: employee.salaryType,
      salaryAmount: employee.salaryAmount,
      totalPresents: stats.presents,
      totalBonus: stats.bonus,
      finalSalary,
    };
  });

  return NextResponse.json({
    startDate,
    endDate,
    factoryId,
    rows,
  });
}
