import { StatementClient } from "@/components/statement/statement-client";

export default function StatementPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Download Statement
        </h2>
        <p className="text-sm text-muted-foreground">
          Filter and export transaction history.
        </p>
      </div>
      <StatementClient />
    </div>
  );
}
