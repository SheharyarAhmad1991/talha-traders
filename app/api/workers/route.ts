import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { workerSchema } from "@/lib/validations";

export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const workers = await prisma.worker.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(workers);
}

export async function POST(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const parsed = workerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const worker = await prisma.worker.create({
    data: {
      name: parsed.data.name.trim(),
      phone: parsed.data.phone?.trim() || null,
    },
  });
  return NextResponse.json(worker, { status: 201 });
}
