import { getCachedHrFactories } from "@/lib/cached-data";
import { SalaryStatementClient } from "@/components/hr/salary-statement-client";

export default async function SalaryStatementPage() {
  const factories = await getCachedHrFactories();
  return <SalaryStatementClient factories={factories} />;
}
