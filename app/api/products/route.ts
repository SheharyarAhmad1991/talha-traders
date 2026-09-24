import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { finishedProductSchema } from "@/lib/validations";
import { CACHE_TAGS, invalidateMasterTag } from "@/lib/cached-data";
import { jsonNoStore } from "@/lib/json-no-store";

export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const products = await prisma.finishedProduct.findMany({
    orderBy: { name: "asc" },
  });
  return jsonNoStore(products);
}

export async function POST(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const parsed = finishedProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const product = await prisma.finishedProduct.create({
    data: {
      name: parsed.data.name.trim(),
      nameUr: parsed.data.nameUr?.trim() || null,
      unit: parsed.data.unit.trim(),
    },
  });
  await invalidateMasterTag(CACHE_TAGS.products);
  return NextResponse.json(product, { status: 201 });
}
