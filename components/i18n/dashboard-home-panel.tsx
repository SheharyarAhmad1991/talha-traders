"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DashboardHomeBody } from "@/components/i18n/dashboard-home-body";
import { useLanguage } from "@/lib/i18n/language-context";
import type { DashboardSnapshot } from "@/lib/dashboard-data";
import { DATA_CHANGED_EVENT } from "@/lib/use-fresh-list";

function DashboardBodySkeleton() {
  const { t } = useLanguage();
  return (
    <div className="mt-6 space-y-4 animate-pulse" aria-busy>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-40 rounded-xl border bg-muted/40" />
        <div className="h-40 rounded-xl border bg-muted/40" />
      </div>
      <div className="h-48 rounded-xl border bg-muted/30" />
      <p className="text-sm text-muted-foreground">{t("loading")}</p>
    </div>
  );
}

export function DashboardHomePanel() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [data, setData] = useState<DashboardSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (force = false) => {
      let useForce = force;
      try {
        if (sessionStorage.getItem("umer:dash:force") === "1") {
          useForce = true;
          sessionStorage.removeItem("umer:dash:force");
        }
      } catch {
        /* ignore */
      }

      try {
        const url = useForce
          ? `/api/dashboard?fresh=1&_=${Date.now()}`
          : `/api/dashboard?_=${Date.now()}`;
        const res = await fetch(url, {
          cache: "no-store",
          credentials: "same-origin",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || t("failedToLoad"));
        setData(json as DashboardSnapshot);
        setError(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : t("failedToLoad"));
      }
    },
    [t]
  );

  useEffect(() => {
    void load(true);
  }, [load, pathname]);

  useEffect(() => {
    const onData = () => void load(true);
    window.addEventListener(DATA_CHANGED_EVENT, onData);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, onData);
  }, [load]);

  if (error && !data) {
    return <p className="mt-6 text-sm text-destructive">{error}</p>;
  }

  if (!data) return <DashboardBodySkeleton />;

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
