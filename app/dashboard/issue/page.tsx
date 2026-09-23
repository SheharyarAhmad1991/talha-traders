import { prisma } from "@/lib/prisma";
import { IssueForm } from "@/components/forms/issue-form";
import { PageHeader } from "@/components/i18n/page-header";

export default async function IssuePage() {
  // Parallel queries — pool allows multiple connections in local/dev
  const [workers, materials, factoryStock] = await Promise.all([
    prisma.worker.findMany({ orderBy: { name: "asc" } }),
    prisma.rawMaterial.findMany({ orderBy: { name: "asc" } }),
    prisma.factoryInventory.findMany({
      where: { quantity: { gt: 0 } },
      include: { rawMaterial: true },
      orderBy: { rawMaterial: { name: "asc" } },
    }),
  ]);

  const initialFactoryStock = factoryStock.map((row) => ({
    rawMaterialId: row.rawMaterialId,
    materialName: row.rawMaterial.name,
    materialNameUr: row.rawMaterial.nameUr,
    unit: row.rawMaterial.unit,
    quantity: row.quantity,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader titleKey="issueToWorker" />
      <IssueForm
        workers={workers}
        materials={materials}
        initialFactoryStock={initialFactoryStock}
      />
    </div>
  );
}
