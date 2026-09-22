import { prisma } from "@/lib/prisma";
import { SettingsClient } from "@/components/i18n/settings-client";

export default async function SettingsPage() {
  // Sequential queries — connection_limit=1 cannot handle Promise.all safely
  const dealers = await prisma.dealer.findMany({ orderBy: { name: "asc" } });
  const workers = await prisma.worker.findMany({ orderBy: { name: "asc" } });
  const materials = await prisma.rawMaterial.findMany({
    orderBy: { name: "asc" },
  });
  const products = await prisma.finishedProduct.findMany({
    orderBy: { name: "asc" },
  });
  const hrFactories = await prisma.hRFactory.findMany({
    orderBy: { name: "asc" },
  });
  const hrEmployees = await prisma.hREmployee.findMany({
    include: { factory: true },
    orderBy: { name: "asc" },
  });

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
