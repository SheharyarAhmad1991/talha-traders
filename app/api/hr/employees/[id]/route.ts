import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hrEmployeeSchema } from "@/lib/validations";

async function requireAuth() {
  const session = await getSession();
  if (!session) return null;
  return session;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  const parsed = hrEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const factory = await prisma.hRFactory.findUnique({
    where: { id: parsed.data.factoryId },
  });
  if (!factory) {
    return NextResponse.json({ error: "Factory not found" }, { status: 404 });
  }

  const employee = await prisma.hREmployee.update({
    where: { id },
    data: {
      name: parsed.data.name.trim(),
      factoryId: parsed.data.factoryId,
      salaryType: parsed.data.salaryType,
      salaryAmount: parsed.data.salaryAmount,
    },
    include: { factory: true },
  });
  return NextResponse.json(employee);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.hREmployee.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
