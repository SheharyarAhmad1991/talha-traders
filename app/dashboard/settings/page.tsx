import {
  getCachedDealers,
  getCachedHrEmployees,
  getCachedHrFactories,
  getCachedMaterials,
  getCachedProducts,
  getCachedWorkers,
} from "@/lib/cached-data";
import { SettingsClient } from "@/components/i18n/settings-client";

export default async function SettingsPage() {
  const [dealers, workers, materials, products, hrFactories, hrEmployees] =
    await Promise.all([
      getCachedDealers(),
      getCachedWorkers(),
      getCachedMaterials(),
      getCachedProducts(),
      getCachedHrFactories(),
      getCachedHrEmployees(),
    ]);

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
