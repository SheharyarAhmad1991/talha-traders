import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { rawMaterialSchema } from "@/lib/validations";
import { CACHE_TAGS, invalidateMasterTag } from "@/lib/cached-data";
import { jsonNoStore } from "@/lib/json-no-store";

export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const materials = await prisma.rawMaterial.findMany({
    orderBy: { name: "asc" },
  });
  return jsonNoStore(materials);
}

export async function POST(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const parsed = rawMaterialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const material = await prisma.rawMaterial.create({
    data: {
      name: parsed.data.name.trim(),
      nameUr: parsed.data.nameUr?.trim() || null,
      unit: parsed.data.unit.trim(),
    },
  });
  await prisma.factoryInventory.create({
    data: { rawMaterialId: material.id, quantity: 0 },
  });
  await invalidateMasterTag(CACHE_TAGS.materials);
  return NextResponse.json(material, { status: 201 });
}
