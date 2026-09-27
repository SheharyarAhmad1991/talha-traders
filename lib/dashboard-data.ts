import { prisma } from "@/lib/prisma";

export type DashboardSnapshot = {
  factoryStock: {
    id: string;
    rawMaterialId: string;
    quantity: number;
    rawMaterial: { name: string; nameUr: string | null; unit: string };
  }[];
  workerStock: {
    id: string;
    quantity: number;
    worker: { name: string; nameUr: string | null };
    rawMaterial: { name: string; nameUr: string | null; unit: string };
  }[];
  recentLogs: {
    id: string;
    date: string;
    type: string;
    dealerName: string | null;
    workerName: string | null;
    rawMaterialName: string | null;
    finishedProductName: string | null;
    quantity: number | null;
  }[];
  dealerCount: number;
  workerCount: number;
};

type RawPayload = {
  dealerCount: number;
  workerCount: number;
  factoryStock: DashboardSnapshot["factoryStock"] | null;
  workerStock: DashboardSnapshot["workerStock"] | null;
  recentLogs:
    | {
        id: string;
        date: string | Date;
        type: string;
        dealerName: string | null;
        workerName: string | null;
        rawMaterialName: string | null;
        finishedProductName: string | null;
        quantity: number | null;
      }[]
    | null;
};

/** One DB round-trip for the whole dashboard (vs 5 sequential queries). */
async function loadDashboardFromDb(): Promise<DashboardSnapshot> {
  const rows = await prisma.$queryRaw<[{ payload: RawPayload }]>`
    SELECT json_build_object(
      'dealerCount', (SELECT COUNT(*)::int FROM "Dealer"),
      'workerCount', (SELECT COUNT(*)::int FROM "Worker"),
      'factoryStock', (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'id', sub.id,
              'rawMaterialId', sub."rawMaterialId",
              'quantity', sub.quantity,
              'rawMaterial', sub.rm
            )
            ORDER BY sub.ord
          ),
          '[]'::json
        )
        FROM (
          SELECT
            fi.id,
            fi."rawMaterialId",
            fi.quantity,
            json_build_object(
              'name', rm.name,
              'nameUr', rm."nameUr",
              'unit', rm.unit
            ) AS rm,
            rm.name AS ord
          FROM "FactoryInventory" fi
          INNER JOIN "RawMaterial" rm ON rm.id = fi."rawMaterialId"
        ) sub
      ),
      'workerStock', (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'id', sub.id,
              'quantity', sub.quantity,
              'worker', sub.worker,
              'rawMaterial', sub.rm
            )
            ORDER BY sub.quantity DESC
          ),
          '[]'::json
        )
        FROM (
          SELECT
            wi.id,
            wi.quantity,
            json_build_object(
              'name', w.name,
              'nameUr', w."nameUr"
            ) AS worker,
            json_build_object(
              'name', rm.name,
              'nameUr', rm."nameUr",
              'unit', rm.unit
            ) AS rm
          FROM "WorkerInventory" wi
          INNER JOIN "Worker" w ON w.id = wi."workerId"
          INNER JOIN "RawMaterial" rm ON rm.id = wi."rawMaterialId"
          WHERE wi.quantity > 0
          ORDER BY wi.quantity DESC
          LIMIT 10
        ) sub
      ),
      'recentLogs', (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'id', sub.id,
              'date', sub.date,
              'type', sub.type,
              'dealerName', sub."dealerName",
              'workerName', sub."workerName",
              'rawMaterialName', sub."rawMaterialName",
              'finishedProductName', sub."finishedProductName",
              'quantity', sub.quantity
            )
            ORDER BY sub."createdAt" DESC
          ),
          '[]'::json
        )
        FROM (
          SELECT
            id,
            date,
            type::text AS type,
            "dealerName",
            "workerName",
            "rawMaterialName",
            "finishedProductName",
            quantity,
            "createdAt"
          FROM "TransactionLog"
          ORDER BY "createdAt" DESC
          LIMIT 8
        ) sub
      )
    ) AS payload
  `;

  const payload = rows[0]?.payload;
  if (!payload) {
    return {
      factoryStock: [],
      workerStock: [],
      recentLogs: [],
      dealerCount: 0,
      workerCount: 0,
    };
  }

  return {
    dealerCount: Number(payload.dealerCount) || 0,
    workerCount: Number(payload.workerCount) || 0,
    factoryStock: (payload.factoryStock || []).map((row) => ({
      ...row,
      quantity: Number(row.quantity),
    })),
    workerStock: (payload.workerStock || []).map((row) => ({
      ...row,
      quantity: Number(row.quantity),
    })),
    recentLogs: (payload.recentLogs || []).map((log) => ({
      id: log.id,
      type: log.type,
      dealerName: log.dealerName,
      workerName: log.workerName,
      rawMaterialName: log.rawMaterialName,
      finishedProductName: log.finishedProductName,
      quantity: log.quantity == null ? null : Number(log.quantity),
      date:
        typeof log.date === "string"
          ? log.date
          : new Date(log.date).toISOString(),
    })),
  };
}

/** Always live from PostgreSQL — inventory changes frequently. */
export async function getDashboardSnapshot(
  _opts?: { force?: boolean }
): Promise<DashboardSnapshot> {
  return loadDashboardFromDb();
}

/** Kept for call sites after purchase/issue/receive (no shared cache to clear). */
export async function invalidateDashboardCache() {
  // Dashboard and factory stock always read from DB.
}
