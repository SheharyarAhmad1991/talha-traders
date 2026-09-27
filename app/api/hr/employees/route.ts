import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hrEmployeeSchema } from "@/lib/validations";
import { CACHE_TAGS, invalidateMasterTag } from "@/lib/cached-data";
import { jsonNoStore } from "@/lib/json-no-store";

async function requireAuth() {
  const session = await getSession();
  if (!session) return null;
  return session;
}

export async function GET(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const factoryId = searchParams.get("factoryId") || undefined;

  const employees = await prisma.hREmployee.findMany({
    where: factoryId ? { factoryId } : undefined,
    select: {
      id: true,
      name: true,
      nameUr: true,
      factoryId: true,
      salaryType: true,
      salaryAmount: true,
      factory: { select: { id: true, name: true, nameUr: true } },
    },
    orderBy: { name: "asc" },
  });
  return jsonNoStore(employees);
}

export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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

  const employee = await prisma.hREmployee.create({
    data: {
      name: parsed.data.name.trim(),
      nameUr: parsed.data.nameUr?.trim() || null,
      factoryId: parsed.data.factoryId,
      salaryType: parsed.data.salaryType,
      salaryAmount: parsed.data.salaryAmount,
    },
    include: { factory: true },
  });
  await invalidateMasterTag(CACHE_TAGS.hrEmployees);
  return NextResponse.json(employee, { status: 201 });
}
