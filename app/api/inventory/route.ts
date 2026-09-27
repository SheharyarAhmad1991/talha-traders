import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jsonNoStore } from "@/lib/json-no-store";

export async function GET(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const workerId = searchParams.get("workerId");

  const materialSelect = {
    name: true,
    nameUr: true,
    unit: true,
  } as const;

  if (workerId) {
    const inventory = await prisma.workerInventory.findMany({
      where: { workerId, quantity: { gt: 0 } },
      select: {
        id: true,
        rawMaterialId: true,
        quantity: true,
        rawMaterial: { select: materialSelect },
      },
      orderBy: { quantity: "desc" },
    });
    return jsonNoStore(
      inventory.map((row) => ({
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
    where: { quantity: { gt: 0 } },
    select: {
      id: true,
      rawMaterialId: true,
      quantity: true,
      rawMaterial: { select: materialSelect },
    },
    orderBy: { rawMaterial: { name: "asc" } },
  });

  return jsonNoStore(
    factory.map((row) => ({
      id: row.id,
      rawMaterialId: row.rawMaterialId,
      materialName: row.rawMaterial.name,
      materialNameUr: row.rawMaterial.nameUr,
      unit: row.rawMaterial.unit,
      quantity: row.quantity,
    }))
  );
}
