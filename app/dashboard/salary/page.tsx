import { prisma } from "@/lib/prisma";
import { SalaryStatementClient } from "@/components/hr/salary-statement-client";

export default async function SalaryStatementPage() {
  const factories = await prisma.hRFactory.findMany({
    orderBy: { name: "asc" },
  });

  return <SalaryStatementClient factories={factories} />;
}
