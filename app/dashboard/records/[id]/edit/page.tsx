import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  getCachedDealers,
  getCachedMaterials,
  getCachedProducts,
  getCachedWorkers,
} from "@/lib/cached-data";
import { EditTransactionForm } from "@/components/forms/edit-transaction-form";

type Props = { params: Promise<{ id: string }> };

export default async function EditTransactionPage({ params }: Props) {
  const { id } = await params;
  // Only fields the edit form needs — skip imageData / timestamps
  const log = await prisma.transactionLog.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      date: true,
      dealerId: true,
      workerId: true,
      rawMaterialId: true,
      finishedProductId: true,
      quantity: true,
      amountPaid: true,
      mazdooriPaid: true,
      materialConsumed: true,
      sendTo: true,
      notes: true,
      extra: true,
    },
  });
  if (!log) notFound();
  // Deduct records are deleted from statement only (no edit form)
  if (log.type === "DEDUCT") notFound();

  const [dealers, workers, materials, products] = await Promise.all([
    getCachedDealers(),
    getCachedWorkers(),
    getCachedMaterials(),
    getCachedProducts(),
  ]);

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
          type: log.type as "PURCHASE" | "ISSUE" | "RECEIVE",
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
