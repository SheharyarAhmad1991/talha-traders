import { prisma } from "@/lib/prisma";
import { ReceiveForm } from "@/components/forms/receive-form";
import { PageHeader } from "@/components/i18n/page-header";

export default async function ReceivePage() {
  const [workers, products, materials] = await Promise.all([
    prisma.worker.findMany({ orderBy: { name: "asc" } }),
    prisma.finishedProduct.findMany({ orderBy: { name: "asc" } }),
    prisma.rawMaterial.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader titleKey="receiveProduct" />
      <ReceiveForm
        workers={workers}
        products={products}
        materials={materials}
      />
    </div>
  );
}
