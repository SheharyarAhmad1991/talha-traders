import { prisma } from "@/lib/prisma";
import { IssueForm } from "@/components/forms/issue-form";
import { PageHeader } from "@/components/i18n/page-header";

export default async function IssuePage() {
  const [workers, materials] = await Promise.all([
    prisma.worker.findMany({ orderBy: { name: "asc" } }),
    prisma.rawMaterial.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader titleKey="issueToWorker" />
      <IssueForm workers={workers} materials={materials} />
    </div>
  );
}
