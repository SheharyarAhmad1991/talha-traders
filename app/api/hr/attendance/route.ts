import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hrAttendanceSaveSchema } from "@/lib/validations";

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
  const date = searchParams.get("date");
  const factoryId = searchParams.get("factoryId");

  if (!date || !factoryId) {
    return NextResponse.json(
      { error: "date and factoryId are required" },
      { status: 400 }
    );
  }

  const employees = await prisma.hREmployee.findMany({
    where: { factoryId },
    select: { id: true, name: true, nameUr: true },
    orderBy: { name: "asc" },
  });

  const attendance = await prisma.hRAttendance.findMany({
    where: {
      date: dayDate(date),
      employeeId: { in: employees.map((e) => e.id) },
    },
    select: {
      employeeId: true,
      isPresent: true,
      bonusAmount: true,
    },
  });

  const byEmployee = new Map(attendance.map((a) => [a.employeeId, a]));

  const rows = employees.map((employee) => {
    const existing = byEmployee.get(employee.id);
    return {
      employeeId: employee.id,
      name: employee.name,
      nameUr: employee.nameUr,
      isPresent: existing?.isPresent ?? true,
      bonusAmount: existing?.bonusAmount ?? 0,
    };
  });

  return NextResponse.json({ date, factoryId, rows });
}

export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = hrAttendanceSaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const { date, factoryId, rows } = parsed.data;
  const day = dayDate(date);

  const factoryEmployees = await prisma.hREmployee.findMany({
    where: { factoryId },
    select: { id: true },
  });
  const allowed = new Set(factoryEmployees.map((e) => e.id));

  for (const row of rows) {
    if (!allowed.has(row.employeeId)) {
      return NextResponse.json(
        { error: "Employee does not belong to selected factory" },
        { status: 400 }
      );
    }
  }

  await prisma.$transaction(
    rows.map((row) =>
      prisma.hRAttendance.upsert({
        where: {
          employeeId_date: {
            employeeId: row.employeeId,
            date: day,
          },
        },
        create: {
          date: day,
          employeeId: row.employeeId,
          isPresent: row.isPresent,
          bonusAmount: row.bonusAmount || 0,
        },
        update: {
          isPresent: row.isPresent,
          bonusAmount: row.bonusAmount || 0,
        },
      })
    )
  );

  return NextResponse.json({ ok: true, count: rows.length });
}
