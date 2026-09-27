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

/** Dropdown / settings projections — never pull unused columns. */
export const dealerSelect = {
  id: true,
  name: true,
  nameUr: true,
  phone: true,
} as const;

export const workerSelect = {
  id: true,
  name: true,
  nameUr: true,
  phone: true,
} as const;

export const materialSelect = {
  id: true,
  name: true,
  nameUr: true,
  unit: true,
} as const;

export const productSelect = {
  id: true,
  name: true,
  nameUr: true,
  unit: true,
} as const;

export const hrFactorySelect = {
  id: true,
  name: true,
  nameUr: true,
} as const;

export const hrEmployeeSelect = {
  id: true,
  name: true,
  nameUr: true,
  factoryId: true,
  salaryType: true,
  salaryAmount: true,
  factory: { select: { id: true, name: true, nameUr: true } },
} as const;

const TAG_TO_KEY: Record<string, string> = {
  [CACHE_TAGS.dealers]: CACHE_KEYS.dealers,
  [CACHE_TAGS.workers]: CACHE_KEYS.workers,
  [CACHE_TAGS.materials]: CACHE_KEYS.materials,
  [CACHE_TAGS.products]: CACHE_KEYS.products,
  [CACHE_TAGS.hrFactories]: CACHE_KEYS.hrFactories,
  [CACHE_TAGS.hrEmployees]: CACHE_KEYS.hrEmployees,
};

/** Bust Next data cache + memory after Settings create/update/delete */
export async function invalidateMasterTag(tag: string) {
  revalidateTag(tag, { expire: 0 });
  const key = TAG_TO_KEY[tag];
  if (key) await cacheDel(key);
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
    prisma.dealer.findMany({
      select: dealerSelect,
      orderBy: { name: "asc" },
    })
  );
}

export async function getCachedWorkers() {
  return cachedList(CACHE_KEYS.workers, () =>
    prisma.worker.findMany({
      select: workerSelect,
      orderBy: { name: "asc" },
    })
  );
}

export async function getCachedMaterials() {
  return cachedList(CACHE_KEYS.materials, () =>
    prisma.rawMaterial.findMany({
      select: materialSelect,
      orderBy: { name: "asc" },
    })
  );
}

export async function getCachedProducts() {
  return cachedList(CACHE_KEYS.products, () =>
    prisma.finishedProduct.findMany({
      select: productSelect,
      orderBy: { name: "asc" },
    })
  );
}

export async function getCachedHrFactories() {
  return cachedList(CACHE_KEYS.hrFactories, () =>
    prisma.hRFactory.findMany({
      select: hrFactorySelect,
      orderBy: { name: "asc" },
    })
  );
}

export async function getCachedHrEmployees() {
  return cachedList(CACHE_KEYS.hrEmployees, () =>
    prisma.hREmployee.findMany({
      select: hrEmployeeSelect,
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

/** Only positive stock rows + material name/unit — no full material model. */
export async function getCachedFactoryStockPositive(): Promise<
  FactoryStockRow[]
> {
  const rows = await prisma.factoryInventory.findMany({
    where: { quantity: { gt: 0 } },
    select: {
      rawMaterialId: true,
      quantity: true,
      rawMaterial: { select: { name: true, nameUr: true, unit: true } },
    },
    orderBy: { rawMaterial: { name: "asc" } },
  });

  return rows.map((row) => ({
    rawMaterialId: row.rawMaterialId,
    materialName: row.rawMaterial.name,
    materialNameUr: row.rawMaterial.nameUr,
    unit: row.rawMaterial.unit,
    quantity: row.quantity,
  }));
}
