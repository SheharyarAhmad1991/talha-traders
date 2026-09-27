import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { workerSchema } from "@/lib/validations";
import {
  CACHE_TAGS,
  invalidateMasterTag,
  workerSelect,
} from "@/lib/cached-data";
import { jsonNoStore } from "@/lib/json-no-store";

export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const workers = await prisma.worker.findMany({
    select: workerSelect,
    orderBy: { name: "asc" },
  });
  return jsonNoStore(workers);
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
      nameUr: parsed.data.nameUr?.trim() || null,
      phone: parsed.data.phone?.trim() || null,
    },
  });
  await invalidateMasterTag(CACHE_TAGS.workers);
  return NextResponse.json(worker, { status: 201 });
}
