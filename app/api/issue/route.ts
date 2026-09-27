import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { issueSchema } from "@/lib/validations";
import { invalidateDashboardCache } from "@/lib/dashboard-data";

export async function POST(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = issueSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const worker = await prisma.worker.findUnique({
      where: { id: data.workerId },
      select: { id: true, name: true },
    });
    if (!worker) {
      return NextResponse.json({ error: "Moulder not found" }, { status: 404 });
    }

    const materialIds = data.lines.map((l) => l.rawMaterialId);
    const materials = await prisma.rawMaterial.findMany({
      where: { id: { in: materialIds } },
      select: { id: true, name: true, unit: true },
    });
    if (materials.length !== new Set(materialIds).size) {
      return NextResponse.json(
        { error: "One or more materials not found" },
        { status: 404 }
      );
    }
    const materialMap = new Map(materials.map((m) => [m.id, m]));

    // Check stock for all lines first
    for (const line of data.lines) {
      const material = materialMap.get(line.rawMaterialId)!;
      const factoryStock = await prisma.factoryInventory.findUnique({
        where: { rawMaterialId: line.rawMaterialId },
        select: { quantity: true },
      });
      if (!factoryStock || factoryStock.quantity < line.quantity) {
        return NextResponse.json(
          {
            error: `Insufficient factory stock for ${material.name}. Available: ${factoryStock?.quantity ?? 0} ${material.unit}`,
          },
          { status: 400 }
        );
      }
    }

    const logs = await prisma.$transaction(async (tx) => {
      const created = [];

      for (const line of data.lines) {
        const material = materialMap.get(line.rawMaterialId)!;

        await tx.factoryInventory.update({
          where: { rawMaterialId: line.rawMaterialId },
          data: { quantity: { decrement: line.quantity } },
        });

        await tx.workerInventory.upsert({
          where: {
            workerId_rawMaterialId: {
              workerId: data.workerId,
              rawMaterialId: line.rawMaterialId,
            },
          },
          create: {
            workerId: data.workerId,
            rawMaterialId: line.rawMaterialId,
            quantity: line.quantity,
          },
          update: { quantity: { increment: line.quantity } },
        });

        created.push(
          await tx.transactionLog.create({
            data: {
              type: "ISSUE",
              date: new Date(data.date),
              workerId: worker.id,
              workerName: worker.name,
              rawMaterialId: material.id,
              rawMaterialName: material.name,
              quantity: line.quantity,
              notes: data.notes || null,
              imageData: data.imageData || null,
            },
          })
        );
      }

      return created;
    });

    await invalidateDashboardCache();
    return NextResponse.json({ count: logs.length, logs }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to issue material" },
      { status: 500 }
    );
  }
}
