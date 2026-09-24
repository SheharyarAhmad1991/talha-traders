import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { rawMaterialSchema } from "@/lib/validations";
import { CACHE_TAGS, invalidateMasterTag } from "@/lib/cached-data";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  const parsed = rawMaterialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const material = await prisma.rawMaterial.update({
    where: { id },
    data: {
      name: parsed.data.name.trim(),
      nameUr: parsed.data.nameUr?.trim() || null,
      unit: parsed.data.unit.trim(),
    },
  });
  await invalidateMasterTag(CACHE_TAGS.materials);
  return NextResponse.json(material);
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.rawMaterial.delete({ where: { id } });
  await invalidateMasterTag(CACHE_TAGS.materials);
  return NextResponse.json({ ok: true });
}
