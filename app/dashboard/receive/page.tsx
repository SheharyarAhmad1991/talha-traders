import { prisma } from "@/lib/prisma";
import { ReceiveForm } from "@/components/forms/receive-form";

export default async function ReceivePage() {
  const [workers, products, materials] = await Promise.all([
    prisma.worker.findMany({ orderBy: { name: "asc" } }),
    prisma.finishedProduct.findMany({ orderBy: { name: "asc" } }),
    prisma.rawMaterial.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Receive Product
        </h2>
        <p className="text-sm text-muted-foreground">
          Labor se Shop — receive finished goods and log mazdoori paid.
        </p>
      </div>
      <ReceiveForm
        workers={workers}
        products={products}
        materials={materials}
      />
    </div>
  );
}
