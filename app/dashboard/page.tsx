import { prisma } from "@/lib/prisma";
import { DashboardHomeChrome } from "@/components/i18n/dashboard-home-chrome";
import { DashboardHomeBody } from "@/components/i18n/dashboard-home-body";

export default async function DashboardHomePage() {
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

  return (
    <div className="space-y-6">
      <DashboardHomeChrome />
      <DashboardHomeBody
        factoryStock={factoryStock}
        workerStock={workerStock}
        recentLogs={recentLogs}
        dealerCount={dealerCount}
        workerCount={workerCount}
      />
    </div>
  );
}
