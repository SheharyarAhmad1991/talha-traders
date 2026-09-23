import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const workerId = searchParams.get("workerId");

  if (workerId) {
    const inventory = await prisma.workerInventory.findMany({
      where: { workerId },
      include: { rawMaterial: true },
      orderBy: { quantity: "desc" },
    });
    return NextResponse.json(
      inventory
        .filter((row) => Number(row.quantity) > 0)
        .map((row) => ({
          id: row.id,
          rawMaterialId: row.rawMaterialId,
          materialName: row.rawMaterial.name,
          materialNameUr: row.rawMaterial.nameUr,
          unit: row.rawMaterial.unit,
          quantity: row.quantity,
        }))
    );
  }

  const factory = await prisma.factoryInventory.findMany({
    include: { rawMaterial: true },
    orderBy: { rawMaterial: { name: "asc" } },
  });

  return NextResponse.json(
    factory
      .filter((row) => Number(row.quantity) > 0)
      .map((row) => ({
        id: row.id,
        rawMaterialId: row.rawMaterialId,
        materialName: row.rawMaterial.name,
        materialNameUr: row.rawMaterial.nameUr,
        unit: row.rawMaterial.unit,
        quantity: row.quantity,
      }))
  );
}
