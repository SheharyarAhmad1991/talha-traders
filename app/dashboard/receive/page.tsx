import {
  getCachedMaterials,
  getCachedProducts,
  getCachedWorkers,
} from "@/lib/cached-data";
import { ReceiveForm } from "@/components/forms/receive-form";
import { PageHeader } from "@/components/i18n/page-header";

export default async function ReceivePage() {
  const [workers, products, materials] = await Promise.all([
    getCachedWorkers(),
    getCachedProducts(),
    getCachedMaterials(),
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
