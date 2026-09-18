import { prisma } from "@/lib/prisma";
import { IssueForm } from "@/components/forms/issue-form";

export default async function IssuePage() {
  const [workers, materials] = await Promise.all([
    prisma.worker.findMany({ orderBy: { name: "asc" } }),
    prisma.rawMaterial.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Issue to Worker
        </h2>
        <p className="text-sm text-muted-foreground">
          Factory se Labor — move material from factory stock to a worker.
        </p>
      </div>
      <IssueForm workers={workers} materials={materials} />
    </div>
  );
}
