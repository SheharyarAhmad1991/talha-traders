import { prisma } from "@/lib/prisma";
import { SettingsClient } from "@/components/i18n/settings-client";

export default async function SettingsPage() {
  const [dealers, workers, materials, products, hrFactories, hrEmployees] =
    await Promise.all([
      prisma.dealer.findMany({ orderBy: { name: "asc" } }),
      prisma.worker.findMany({ orderBy: { name: "asc" } }),
      prisma.rawMaterial.findMany({ orderBy: { name: "asc" } }),
      prisma.finishedProduct.findMany({ orderBy: { name: "asc" } }),
      prisma.hRFactory.findMany({ orderBy: { name: "asc" } }),
      prisma.hREmployee.findMany({
        include: { factory: true },
        orderBy: { name: "asc" },
      }),
    ]);

  return (
    <SettingsClient
      dealers={dealers}
      workers={workers}
      materials={materials}
      products={products}
      hrFactories={hrFactories}
      hrEmployees={hrEmployees}
    />
  );
}
