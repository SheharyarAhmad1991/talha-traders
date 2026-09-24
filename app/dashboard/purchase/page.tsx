import {
  getCachedDealers,
  getCachedMaterials,
  getCachedWorkers,
} from "@/lib/cached-data";
import { PurchaseForm } from "@/components/forms/purchase-form";
import { PageHeader } from "@/components/i18n/page-header";

export default async function PurchasePage() {
  const [dealers, materials, workers] = await Promise.all([
    getCachedDealers(),
    getCachedMaterials(),
    getCachedWorkers(),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader titleKey="purchaseMaterial" />
      <PurchaseForm
        dealers={dealers}
        materials={materials}
        workers={workers}
      />
    </div>
  );
}
