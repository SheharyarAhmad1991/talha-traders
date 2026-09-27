import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { factoryDeductSchema } from "@/lib/validations";
import { invalidateDashboardCache } from "@/lib/dashboard-data";

export async function POST(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = factoryDeductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const material = await prisma.rawMaterial.findUnique({
      where: { id: data.rawMaterialId },
      select: { id: true, name: true, unit: true },
    });
    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    const stock = await prisma.factoryInventory.findUnique({
      where: { rawMaterialId: data.rawMaterialId },
      select: { quantity: true },
    });
    const available = stock?.quantity ?? 0;
    if (available < data.quantity) {
      return NextResponse.json(
        {
          error: `Insufficient factory stock for ${material.name}. Available: ${available} ${material.unit}`,
        },
        { status: 400 }
      );
    }

    const log = await prisma.$transaction(async (tx) => {
      await tx.factoryInventory.update({
        where: { rawMaterialId: data.rawMaterialId },
        data: { quantity: { decrement: data.quantity } },
      });

      return tx.transactionLog.create({
        data: {
          type: "DEDUCT",
          date: new Date(data.date),
          rawMaterialId: material.id,
          rawMaterialName: material.name,
          quantity: data.quantity,
          amountPaid: data.amountPaid ?? null,
          notes: data.notes?.trim() || null,
        },
      });
    });

    await invalidateDashboardCache();
    return NextResponse.json(log, { status: 201 });
  } catch (err) {
    console.error("[factory-deduct]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to deduct" },
      { status: 500 }
    );
  }
}
