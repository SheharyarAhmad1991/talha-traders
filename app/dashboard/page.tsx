import { Suspense } from "react";
import { getDashboardSnapshot } from "@/lib/dashboard-data";
import { DashboardHomeChrome } from "@/components/i18n/dashboard-home-chrome";
import { DashboardHomeBody } from "@/components/i18n/dashboard-home-body";

export const dynamic = "force-dynamic";

function DashboardBodySkeleton() {
  return (
    <div className="mt-6 space-y-4 animate-pulse" aria-busy>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-40 rounded-xl border bg-muted/40" />
        <div className="h-40 rounded-xl border bg-muted/40" />
      </div>
      <div className="h-48 rounded-xl border bg-muted/30" />
      <p className="text-sm text-muted-foreground">Loading balances…</p>
    </div>
  );
}

async function DashboardHomeData() {
  // Single lean SQL snapshot — only fields the home UI renders (no imageData)
  const data = await getDashboardSnapshot();
  return (
    <DashboardHomeBody
      factoryStock={data.factoryStock}
      workerStock={data.workerStock}
      recentLogs={data.recentLogs}
      dealerCount={data.dealerCount}
      workerCount={data.workerCount}
    />
  );
}

export default function DashboardHomePage() {
  return (
    <div className="space-y-6">
      <DashboardHomeChrome />
      <Suspense fallback={<DashboardBodySkeleton />}>
        <DashboardHomeData />
      </Suspense>
    </div>
  );
}
