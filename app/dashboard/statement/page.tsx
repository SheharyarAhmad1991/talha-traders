import { StatementClient } from "@/components/statement/statement-client";
import { PageHeader } from "@/components/i18n/page-header";

export default function StatementPage() {
  return (
    <div className="space-y-4">
      <PageHeader titleKey="downloadStatement" />
      <StatementClient />
    </div>
  );
}
