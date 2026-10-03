import {
  getCachedDealers,
  getCachedMaterials,
  getCachedProducts,
  getCachedWorkers,
} from "@/lib/cached-data";
import { SettingsClient } from "@/components/i18n/settings-client";

export default async function SettingsPage() {
  const [dealers, workers, materials, products] = await Promise.all([
    getCachedDealers(),
    getCachedWorkers(),
    getCachedMaterials(),
    getCachedProducts(),
  ]);

  return (
    <SettingsClient
      dealers={dealers}
      workers={workers}
      materials={materials}
      products={products}
    />
  );
}
