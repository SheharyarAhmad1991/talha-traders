import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
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

/** One connection at a time + short cache — avoids 60s pool waits */
const getDashboardSnapshot = unstable_cache(
  async () => {
    const factoryStock = await prisma.factoryInventory.findMany({
      include: { rawMaterial: true },
      orderBy: { rawMaterial: { name: "asc" } },
    });
    const workerStock = await prisma.workerInventory.findMany({
      where: { quantity: { gt: 0 } },
      include: { worker: true, rawMaterial: true },
      orderBy: { quantity: "desc" },
      take: 10,
    });
    const recentLogs = await prisma.transactionLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    });
    const dealerCount = await prisma.dealer.count();
    const workerCount = await prisma.worker.count();
    return {
      factoryStock,
      workerStock,
      recentLogs,
      dealerCount,
      workerCount,
    };
  },
  ["dashboard-home-snapshot"],
  { revalidate: 20, tags: ["dashboard-home"] }
);

async function DashboardHomeData() {
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
