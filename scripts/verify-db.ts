import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const counts = {
    Admin: await prisma.admin.count(),
    Dealer: await prisma.dealer.count(),
    Worker: await prisma.worker.count(),
    RawMaterial: await prisma.rawMaterial.count(),
    FinishedProduct: await prisma.finishedProduct.count(),
    FactoryInventory: await prisma.factoryInventory.count(),
    WorkerInventory: await prisma.workerInventory.count(),
    TransactionLog: await prisma.transactionLog.count(),
  };
  console.log("Tables verified in Supabase:");
  for (const [table, count] of Object.entries(counts)) {
    console.log(`  - ${table}: ${count} row(s)`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
