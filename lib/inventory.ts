import { Prisma, type PrismaClient, type TransactionLog } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

export type ConsumedMaterial = {
  rawMaterialId: string;
  quantity: number;
};

export function getExtraMaterials(
  log: Pick<TransactionLog, "extra">
): ConsumedMaterial[] {
  const extra = log.extra as { materialsConsumed?: ConsumedMaterial[] } | null;
  if (!extra?.materialsConsumed || !Array.isArray(extra.materialsConsumed)) {
    return [];
  }
  return extra.materialsConsumed.filter(
    (m) => m?.rawMaterialId && typeof m.quantity === "number" && m.quantity > 0
  );
}

async function ensureFactoryQty(
  tx: Tx,
  rawMaterialId: string,
  delta: number
) {
  const row = await tx.factoryInventory.findUnique({ where: { rawMaterialId } });
  const next = (row?.quantity ?? 0) + delta;
  if (next < -0.0001) {
    throw new Error("Cannot reverse: factory stock would go negative");
  }
  await tx.factoryInventory.upsert({
    where: { rawMaterialId },
    create: { rawMaterialId, quantity: Math.max(0, next) },
    update: { quantity: Math.max(0, next) },
  });
}

async function ensureWorkerQty(
  tx: Tx,
  workerId: string,
  rawMaterialId: string,
  delta: number
) {
  const row = await tx.workerInventory.findUnique({
    where: { workerId_rawMaterialId: { workerId, rawMaterialId } },
  });
  const next = (row?.quantity ?? 0) + delta;
  if (next < -0.0001) {
    throw new Error("Cannot reverse: worker stock would go negative");
  }
  await tx.workerInventory.upsert({
    where: { workerId_rawMaterialId: { workerId, rawMaterialId } },
    create: { workerId, rawMaterialId, quantity: Math.max(0, next) },
    update: { quantity: Math.max(0, next) },
  });
}

/** Undo inventory effects of a saved transaction log. */
export async function reverseLogInventory(tx: Tx, log: TransactionLog) {
  if (log.type === "PURCHASE") {
    if (!log.rawMaterialId || log.quantity == null) return;
    if (log.sendTo === "FACTORY") {
      await ensureFactoryQty(tx, log.rawMaterialId, -log.quantity);
    } else if (log.sendTo === "WORKER" && log.workerId) {
      await ensureWorkerQty(tx, log.workerId, log.rawMaterialId, -log.quantity);
    }
    return;
  }

  if (log.type === "ISSUE") {
    if (!log.rawMaterialId || !log.workerId || log.quantity == null) return;
    await ensureFactoryQty(tx, log.rawMaterialId, log.quantity);
    await ensureWorkerQty(tx, log.workerId, log.rawMaterialId, -log.quantity);
    return;
  }

  if (log.type === "RECEIVE") {
    if (!log.workerId) return;
    const materials = getExtraMaterials(log);
    // Only the "primary" receive log in a batch stores materials to restore
    if (materials.length > 0 && (log.materialConsumed ?? 0) > 0) {
      for (const m of materials) {
        await ensureWorkerQty(tx, log.workerId, m.rawMaterialId, m.quantity);
      }
      return;
    }
    // Legacy single-material receive
    if (log.rawMaterialId && (log.materialConsumed ?? 0) > 0) {
      await ensureWorkerQty(
        tx,
        log.workerId,
        log.rawMaterialId,
        log.materialConsumed!
      );
    }
  }
}

/** Apply inventory effects like a new create. */
export async function applyLogInventory(
  tx: Tx,
  input: {
    type: TransactionLog["type"];
    sendTo?: TransactionLog["sendTo"] | null;
    workerId?: string | null;
    rawMaterialId?: string | null;
    quantity?: number | null;
    materialsConsumed?: ConsumedMaterial[];
    isPrimaryReceive?: boolean;
  }
) {
  if (input.type === "PURCHASE") {
    if (!input.rawMaterialId || input.quantity == null) return;
    if (input.sendTo === "FACTORY") {
      await ensureFactoryQty(tx, input.rawMaterialId, input.quantity);
    } else if (input.sendTo === "WORKER" && input.workerId) {
      await ensureWorkerQty(
        tx,
        input.workerId,
        input.rawMaterialId,
        input.quantity
      );
    }
    return;
  }

  if (input.type === "ISSUE") {
    if (!input.rawMaterialId || !input.workerId || input.quantity == null) return;
    await ensureFactoryQty(tx, input.rawMaterialId, -input.quantity);
    await ensureWorkerQty(
      tx,
      input.workerId,
      input.rawMaterialId,
      input.quantity
    );
    return;
  }

  if (input.type === "RECEIVE" && input.isPrimaryReceive && input.workerId) {
    for (const m of input.materialsConsumed || []) {
      await ensureWorkerQty(tx, input.workerId, m.rawMaterialId, -m.quantity);
    }
  }
}
