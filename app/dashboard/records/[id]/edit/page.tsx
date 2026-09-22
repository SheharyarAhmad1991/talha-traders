import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EditTransactionForm } from "@/components/forms/edit-transaction-form";

type Props = { params: Promise<{ id: string }> };

export default async function EditTransactionPage({ params }: Props) {
  const { id } = await params;
  const log = await prisma.transactionLog.findUnique({ where: { id } });
  if (!log) notFound();

  const dealers = await prisma.dealer.findMany({ orderBy: { name: "asc" } });
  const workers = await prisma.worker.findMany({ orderBy: { name: "asc" } });
  const materials = await prisma.rawMaterial.findMany({
    orderBy: { name: "asc" },
  });
  const products = await prisma.finishedProduct.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Edit Record
        </h2>
        <p className="text-sm text-muted-foreground">
          Update this transaction. Inventory will be adjusted automatically.
        </p>
      </div>
      <EditTransactionForm
        log={{
          ...log,
          date: log.date.toISOString(),
          extra: log.extra as {
            materialsConsumed?: { rawMaterialId: string; quantity: number }[];
          } | null,
        }}
        dealers={dealers}
        workers={workers}
        materials={materials}
        products={products}
      />
    </div>
  );
}
