import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { receiveSchema } from "@/lib/validations";

export async function POST(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = receiveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const worker = await prisma.worker.findUnique({
      where: { id: data.workerId },
    });
    if (!worker) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    const productIds = data.products.map((p) => p.finishedProductId);
    const products = await prisma.finishedProduct.findMany({
      where: { id: { in: productIds } },
    });
    if (products.length !== new Set(productIds).size) {
      return NextResponse.json(
        { error: "One or more finished products not found" },
        { status: 404 }
      );
    }
    const productMap = new Map(products.map((p) => [p.id, p]));

    const materialIds = data.materialsConsumed.map((m) => m.rawMaterialId);
    const materials = await prisma.rawMaterial.findMany({
      where: { id: { in: materialIds } },
    });
    if (materials.length !== new Set(materialIds).size) {
      return NextResponse.json(
        { error: "One or more materials not found" },
        { status: 404 }
      );
    }
    const materialMap = new Map(materials.map((m) => [m.id, m]));

    for (const line of data.materialsConsumed) {
      const material = materialMap.get(line.rawMaterialId)!;
      const stock = await prisma.workerInventory.findUnique({
        where: {
          workerId_rawMaterialId: {
            workerId: data.workerId,
            rawMaterialId: line.rawMaterialId,
          },
        },
      });
      if (!stock || stock.quantity < line.quantity) {
        return NextResponse.json(
          {
            error: `Insufficient worker balance for ${material.name}. Available: ${stock?.quantity ?? 0} ${material.unit}`,
          },
          { status: 400 }
        );
      }
    }

    const totalConsumed = data.materialsConsumed.reduce(
      (sum, m) => sum + m.quantity,
      0
    );
    const consumedSummary = data.materialsConsumed
      .map((m) => {
        const mat = materialMap.get(m.rawMaterialId)!;
        return `${mat.name}: ${m.quantity} ${mat.unit}`;
      })
      .join(", ");

    const materialsPayload = data.materialsConsumed.map((m) => ({
      rawMaterialId: m.rawMaterialId,
      quantity: m.quantity,
    }));

    const batchId = randomUUID();

    const logs = await prisma.$transaction(async (tx) => {
      for (const line of data.materialsConsumed) {
        await tx.workerInventory.update({
          where: {
            workerId_rawMaterialId: {
              workerId: data.workerId,
              rawMaterialId: line.rawMaterialId,
            },
          },
          data: { quantity: { decrement: line.quantity } },
        });
      }

      const created = [];
      for (let i = 0; i < data.products.length; i += 1) {
        const line = data.products[i];
        const product = productMap.get(line.finishedProductId)!;
        created.push(
          await tx.transactionLog.create({
            data: {
              type: "RECEIVE",
              date: new Date(data.date),
              workerId: worker.id,
              workerName: worker.name,
              finishedProductId: product.id,
              finishedProductName: product.name,
              rawMaterialName: consumedSummary,
              quantity: line.quantity,
              materialConsumed: i === 0 ? totalConsumed : 0,
              mazdooriPaid: i === 0 ? data.mazdooriPaid : 0,
              notes:
                [
                  data.notes || null,
                  i === 0 ? `Consumed: ${consumedSummary}` : null,
                ]
                  .filter(Boolean)
                  .join(" | ") || null,
              imageData: data.imageData || null,
              batchId,
              extra: {
                materialsConsumed: materialsPayload,
                isPrimary: i === 0,
              },
            },
          })
        );
      }

      return created;
    });

    return NextResponse.json({ count: logs.length, logs, batchId }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to receive product" },
      { status: 500 }
    );
  }
}
