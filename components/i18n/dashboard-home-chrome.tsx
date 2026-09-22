"use client";

import Link from "next/link";
import {
  ShoppingCart,
  ArrowRightLeft,
  PackageCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/language-context";
import { PageHeader } from "@/components/i18n/page-header";

export function DashboardHomeChrome() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <PageHeader titleKey="dashboardHome" descriptionKey="runningBalances" />
      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/purchase">
          <Button>
            <ShoppingCart data-icon="inline-start" />
            {t("purchaseMaterial")}
          </Button>
        </Link>
        <Link href="/dashboard/issue">
          <Button variant="outline">
            <ArrowRightLeft data-icon="inline-start" />
            {t("issueToWorker")}
          </Button>
        </Link>
        <Link href="/dashboard/receive">
          <Button variant="outline">
            <PackageCheck data-icon="inline-start" />
            {t("receiveProduct")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
