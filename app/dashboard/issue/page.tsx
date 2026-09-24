import {
  getCachedFactoryStockPositive,
  getCachedMaterials,
  getCachedWorkers,
} from "@/lib/cached-data";
import { IssueForm } from "@/components/forms/issue-form";
import { PageHeader } from "@/components/i18n/page-header";

export default async function IssuePage() {
  const [workers, materials, initialFactoryStock] = await Promise.all([
    getCachedWorkers(),
    getCachedMaterials(),
    getCachedFactoryStockPositive(),
  ]);

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
