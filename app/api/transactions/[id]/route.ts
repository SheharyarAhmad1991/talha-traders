import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { reverseLogInventory } from "@/lib/inventory";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const log = await prisma.transactionLog.findUnique({ where: { id } });
  if (!log) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }
  return NextResponse.json(log);
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const log = await prisma.transactionLog.findUnique({ where: { id } });
    if (!log) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Receive batches: deleting any item deletes the whole batch + restores materials once
      if (log.type === "RECEIVE" && log.batchId) {
        const batchLogs = await tx.transactionLog.findMany({
          where: { batchId: log.batchId },
        });
        const primary =
          batchLogs.find((l) => (l.materialConsumed ?? 0) > 0) || batchLogs[0];
        if (primary) {
          await reverseLogInventory(tx, primary);
        }
        await tx.transactionLog.deleteMany({ where: { batchId: log.batchId } });
        return;
      }

      await reverseLogInventory(tx, log);
      await tx.transactionLog.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to delete record";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const existing = await prisma.transactionLog.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    if (existing.type === "PURCHASE") {
      const quantity = Number(body.quantity);
      const amountPaid = Number(body.amountPaid);
      const rawMaterialId = String(body.rawMaterialId || "");
      const dealerId = String(body.dealerId || "");
      const sendTo = body.sendTo === "WORKER" ? "WORKER" : "FACTORY";
      const workerId =
        sendTo === "WORKER" ? String(body.workerId || "") : null;
      const date = String(body.date || "");
      const notes = body.notes ? String(body.notes) : null;

      if (
        !date ||
        !dealerId ||
        !rawMaterialId ||
        !(quantity > 0) ||
        body.amountPaid === "" ||
        body.amountPaid === null ||
        body.amountPaid === undefined ||
        Number.isNaN(amountPaid) ||
        amountPaid < 0
      ) {
        return NextResponse.json(
          { error: "Amount paid is required for purchase" },
          { status: 400 }
        );
      }
      if (sendTo === "WORKER" && !workerId) {
        return NextResponse.json({ error: "Worker is required" }, { status: 400 });
      }

      const dealer = await prisma.dealer.findUnique({ where: { id: dealerId } });
      const material = await prisma.rawMaterial.findUnique({
        where: { id: rawMaterialId },
      });
      if (!dealer || !material) {
        return NextResponse.json({ error: "Dealer or material not found" }, { status: 404 });
      }
      let workerName: string | null = null;
      if (workerId) {
        const worker = await prisma.worker.findUnique({ where: { id: workerId } });
        if (!worker) {
          return NextResponse.json({ error: "Worker not found" }, { status: 404 });
        }
        workerName = worker.name;
      }

      const updated = await prisma.$transaction(async (tx) => {
        await reverseLogInventory(tx, existing);

        if (sendTo === "FACTORY") {
          await tx.factoryInventory.upsert({
            where: { rawMaterialId },
            create: { rawMaterialId, quantity },
            update: { quantity: { increment: quantity } },
          });
        } else {
          await tx.workerInventory.upsert({
            where: {
              workerId_rawMaterialId: {
                workerId: workerId!,
                rawMaterialId,
              },
            },
            create: { workerId: workerId!, rawMaterialId, quantity },
            update: { quantity: { increment: quantity } },
          });
        }

        return tx.transactionLog.update({
          where: { id },
          data: {
            date: new Date(date),
            dealerId: dealer.id,
            dealerName: dealer.name,
            workerId,
            workerName,
            rawMaterialId: material.id,
            rawMaterialName: material.name,
            quantity,
            amountPaid,
            sendTo,
            notes,
          },
        });
      });

      return NextResponse.json(updated);
    }

    if (existing.type === "ISSUE") {
      const quantity = Number(body.quantity);
      const rawMaterialId = String(body.rawMaterialId || "");
      const workerId = String(body.workerId || "");
      const date = String(body.date || "");
      const notes = body.notes ? String(body.notes) : null;

      if (!date || !workerId || !rawMaterialId || !(quantity > 0)) {
        return NextResponse.json({ error: "Invalid issue data" }, { status: 400 });
      }

      const worker = await prisma.worker.findUnique({ where: { id: workerId } });
      const material = await prisma.rawMaterial.findUnique({
        where: { id: rawMaterialId },
      });
      if (!worker || !material) {
        return NextResponse.json({ error: "Worker or material not found" }, { status: 404 });
      }

      const updated = await prisma.$transaction(async (tx) => {
        await reverseLogInventory(tx, existing);

        const factoryStock = await tx.factoryInventory.findUnique({
          where: { rawMaterialId },
        });
        if (!factoryStock || factoryStock.quantity < quantity) {
          throw new Error(
            `Insufficient factory stock for ${material.name}. Available: ${factoryStock?.quantity ?? 0}`
          );
        }

        await tx.factoryInventory.update({
          where: { rawMaterialId },
          data: { quantity: { decrement: quantity } },
        });
        await tx.workerInventory.upsert({
          where: {
            workerId_rawMaterialId: { workerId, rawMaterialId },
          },
          create: { workerId, rawMaterialId, quantity },
          update: { quantity: { increment: quantity } },
        });

        return tx.transactionLog.update({
          where: { id },
          data: {
            date: new Date(date),
            workerId: worker.id,
            workerName: worker.name,
            rawMaterialId: material.id,
            rawMaterialName: material.name,
            quantity,
            notes,
          },
        });
      });

      return NextResponse.json(updated);
    }

    if (existing.type === "RECEIVE") {
      const quantity = Number(body.quantity);
      const finishedProductId = String(body.finishedProductId || "");
      const workerId = String(body.workerId || existing.workerId || "");
      const date = String(body.date || "");
      const notes = body.notes ? String(body.notes) : null;
      const mazdooriPaid = Number(body.mazdooriPaid ?? existing.mazdooriPaid ?? 0);
      type MaterialLine = { rawMaterialId: string; quantity: number };
      const materialsConsumed: MaterialLine[] | null = Array.isArray(
        body.materialsConsumed
      )
        ? (body.materialsConsumed as { rawMaterialId: string; quantity: number }[]).map(
            (m) => ({
              rawMaterialId: String(m.rawMaterialId),
              quantity: Number(m.quantity),
            })
          )
        : null;

      if (!date || !workerId || !finishedProductId || !(quantity > 0)) {
        return NextResponse.json({ error: "Invalid receive data" }, { status: 400 });
      }

      const worker = await prisma.worker.findUnique({ where: { id: workerId } });
      const product = await prisma.finishedProduct.findUnique({
        where: { id: finishedProductId },
      });
      if (!worker || !product) {
        return NextResponse.json({ error: "Worker or product not found" }, { status: 404 });
      }

      const isPrimary = (existing.materialConsumed ?? 0) > 0;
      const updated = await prisma.$transaction(async (tx) => {
        // If primary and materials provided, reverse old materials then apply new
        if (isPrimary && materialsConsumed) {
          await reverseLogInventory(tx, existing);

          for (const m of materialsConsumed) {
            const stock = await tx.workerInventory.findUnique({
              where: {
                workerId_rawMaterialId: {
                  workerId,
                  rawMaterialId: m.rawMaterialId,
                },
              },
            });
            if (!stock || stock.quantity < m.quantity) {
              throw new Error("Insufficient worker material balance for update");
            }
            await tx.workerInventory.update({
              where: {
                workerId_rawMaterialId: {
                  workerId,
                  rawMaterialId: m.rawMaterialId,
                },
              },
              data: { quantity: { decrement: m.quantity } },
            });
          }

          const mats = await tx.rawMaterial.findMany({
            where: { id: { in: materialsConsumed.map((m) => m.rawMaterialId) } },
          });
          const map = new Map(mats.map((m) => [m.id, m]));
          const summary = materialsConsumed
            .map((m) => {
              const mat = map.get(m.rawMaterialId);
              return mat ? `${mat.name}: ${m.quantity} ${mat.unit}` : m.rawMaterialId;
            })
            .join(", ");
          const totalConsumed = materialsConsumed.reduce((s, m) => s + m.quantity, 0);

          // Sync batch siblings summary fields lightly
          if (existing.batchId) {
            await tx.transactionLog.updateMany({
              where: { batchId: existing.batchId, NOT: { id } },
              data: {
                workerId: worker.id,
                workerName: worker.name,
                rawMaterialName: summary,
                date: new Date(date),
              },
            });
          }

          return tx.transactionLog.update({
            where: { id },
            data: {
              date: new Date(date),
              workerId: worker.id,
              workerName: worker.name,
              finishedProductId: product.id,
              finishedProductName: product.name,
              quantity,
              mazdooriPaid,
              materialConsumed: totalConsumed,
              rawMaterialName: summary,
              notes,
              extra: {
                materialsConsumed,
                isPrimary: true,
              },
            },
          });
        }

        return tx.transactionLog.update({
          where: { id },
          data: {
            date: new Date(date),
            workerId: worker.id,
            workerName: worker.name,
            finishedProductId: product.id,
            finishedProductName: product.name,
            quantity,
            notes,
            mazdooriPaid: isPrimary ? mazdooriPaid : existing.mazdooriPaid,
          },
        });
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Unsupported type" }, { status: 400 });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to update record";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
