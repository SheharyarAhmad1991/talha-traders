import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Deduped per request via React cache() — middleware already gates auth
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return <DashboardShell userName={session.name}>{children}</DashboardShell>;
}
