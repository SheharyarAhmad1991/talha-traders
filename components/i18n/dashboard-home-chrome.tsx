"use client";

import { PageHeader } from "@/components/i18n/page-header";

export function DashboardHomeChrome() {
  return (
    <div className="space-y-6">
      <PageHeader titleKey="dashboardHome" descriptionKey="runningBalances" />
    </div>
  );
}
