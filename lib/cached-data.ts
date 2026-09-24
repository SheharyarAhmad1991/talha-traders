import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  CACHE_KEYS,
  cacheDel,
  cacheGet,
  cacheSet,
} from "@/lib/app-cache";

export const CACHE_TAGS = {
  dealers: "dealers",
  workers: "workers",
  materials: "materials",
  products: "products",
  hrFactories: "hr-factories",
  hrEmployees: "hr-employees",
} as const;

const MASTER_TTL_SECONDS = 30;

const TAG_TO_KEY: Record<string, string> = {
  [CACHE_TAGS.dealers]: CACHE_KEYS.dealers,
  [CACHE_TAGS.workers]: CACHE_KEYS.workers,
  [CACHE_TAGS.materials]: CACHE_KEYS.materials,
  [CACHE_TAGS.products]: CACHE_KEYS.products,
  [CACHE_TAGS.hrFactories]: CACHE_KEYS.hrFactories,
  [CACHE_TAGS.hrEmployees]: CACHE_KEYS.hrEmployees,
};

/** Bust Next data cache + memory/Redis after Settings create/update/delete */
export async function invalidateMasterTag(tag: string) {
  revalidateTag(tag, { expire: 0 });
  const key = TAG_TO_KEY[tag];
  if (key) await cacheDel(key);
  // Materials change also affects factory stock lines
  if (tag === CACHE_TAGS.materials) {
    await cacheDel(CACHE_KEYS.factoryStock, CACHE_KEYS.dashboard);
  }
}

async function cachedList<T>(
  key: string,
  loader: () => Promise<T>
): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit) return hit;
  const data = await loader();
  await cacheSet(key, data, MASTER_TTL_SECONDS);
  return data;
}

export async function getCachedDealers() {
  return cachedList(CACHE_KEYS.dealers, () =>
    prisma.dealer.findMany({ orderBy: { name: "asc" } })
  );
}

export async function getCachedWorkers() {
  return cachedList(CACHE_KEYS.workers, () =>
    prisma.worker.findMany({ orderBy: { name: "asc" } })
  );
}

export async function getCachedMaterials() {
  return cachedList(CACHE_KEYS.materials, () =>
    prisma.rawMaterial.findMany({ orderBy: { name: "asc" } })
  );
}

export async function getCachedProducts() {
  return cachedList(CACHE_KEYS.products, () =>
    prisma.finishedProduct.findMany({ orderBy: { name: "asc" } })
  );
}

export async function getCachedHrFactories() {
  return cachedList(CACHE_KEYS.hrFactories, () =>
    prisma.hRFactory.findMany({ orderBy: { name: "asc" } })
  );
}

export async function getCachedHrEmployees() {
  return cachedList(CACHE_KEYS.hrEmployees, () =>
    prisma.hREmployee.findMany({
      include: { factory: true },
      orderBy: { name: "asc" },
    })
  );
}

export type FactoryStockRow = {
  rawMaterialId: string;
  materialName: string;
  materialNameUr: string | null;
  unit: string;
  quantity: number;
};

export async function getCachedFactoryStockPositive(): Promise<
  FactoryStockRow[]
> {
  const hit = await cacheGet<FactoryStockRow[]>(CACHE_KEYS.factoryStock);
  if (hit) return hit;

  const rows = await prisma.factoryInventory.findMany({
    where: { quantity: { gt: 0 } },
    include: {
      rawMaterial: {
        select: { name: true, nameUr: true, unit: true },
      },
    },
    orderBy: { rawMaterial: { name: "asc" } },
  });

  const mapped = rows.map((row) => ({
    rawMaterialId: row.rawMaterialId,
    materialName: row.rawMaterial.name,
    materialNameUr: row.rawMaterial.nameUr,
    unit: row.rawMaterial.unit,
    quantity: row.quantity,
  }));

  await cacheSet(CACHE_KEYS.factoryStock, mapped, 45);
  return mapped;
}
