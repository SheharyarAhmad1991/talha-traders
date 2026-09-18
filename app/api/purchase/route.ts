import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { purchaseSchema } from "@/lib/validations";

export async function POST(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = purchaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const dealer = await prisma.dealer.findUnique({
      where: { id: data.dealerId },
    });
    if (!dealer) {
      return NextResponse.json({ error: "Dealer not found" }, { status: 404 });
    }

    let workerName: string | null = null;
    if (data.sendTo === "WORKER") {
      const worker = await prisma.worker.findUnique({
        where: { id: data.workerId },
      });
      if (!worker) {
        return NextResponse.json({ error: "Worker not found" }, { status: 404 });
      }
      workerName = worker.name;
    }

    const materialIds = data.lines.map((l) => l.rawMaterialId);
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

    const logs = await prisma.$transaction(async (tx) => {
      const created = [];

      for (const line of data.lines) {
        const material = materialMap.get(line.rawMaterialId)!;

        if (data.sendTo === "FACTORY") {
          await tx.factoryInventory.upsert({
            where: { rawMaterialId: line.rawMaterialId },
            create: {
              rawMaterialId: line.rawMaterialId,
              quantity: line.quantity,
            },
            update: { quantity: { increment: line.quantity } },
          });
        } else {
          await tx.workerInventory.upsert({
            where: {
              workerId_rawMaterialId: {
                workerId: data.workerId!,
                rawMaterialId: line.rawMaterialId,
              },
            },
            create: {
              workerId: data.workerId!,
              rawMaterialId: line.rawMaterialId,
              quantity: line.quantity,
            },
            update: { quantity: { increment: line.quantity } },
          });
        }

        created.push(
          await tx.transactionLog.create({
            data: {
              type: "PURCHASE",
              date: new Date(data.date),
              dealerId: dealer.id,
              dealerName: dealer.name,
              workerId: data.sendTo === "WORKER" ? data.workerId : null,
              workerName,
              rawMaterialId: material.id,
              rawMaterialName: material.name,
              quantity: line.quantity,
              amountPaid: line.amountPaid,
              sendTo: data.sendTo,
              notes: data.notes || null,
              imageData: data.imageData || null,
            },
          })
        );
      }

      return created;
    });

    return NextResponse.json({ count: logs.length, logs }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to save purchase" },
      { status: 500 }
    );
  }
}
