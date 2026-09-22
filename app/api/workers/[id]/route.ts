import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { workerSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  const parsed = workerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const worker = await prisma.worker.update({
    where: { id },
    data: {
      name: parsed.data.name.trim(),
      nameUr: parsed.data.nameUr?.trim() || null,
      phone: parsed.data.phone?.trim() || null,
    },
  });
  return NextResponse.json(worker);
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.worker.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
