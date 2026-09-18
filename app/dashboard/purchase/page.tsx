import { prisma } from "@/lib/prisma";
import { PurchaseForm } from "@/components/forms/purchase-form";

export default async function PurchasePage() {
  const [dealers, materials, workers] = await Promise.all([
    prisma.dealer.findMany({ orderBy: { name: "asc" } }),
    prisma.rawMaterial.findMany({ orderBy: { name: "asc" } }),
    prisma.worker.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Purchase Material
        </h2>
        <p className="text-sm text-muted-foreground">
          Kacha Maal Aana — record purchases and route stock to factory or worker.
        </p>
      </div>
      <PurchaseForm
        dealers={dealers}
        materials={materials}
        workers={workers}
      />
    </div>
  );
}
