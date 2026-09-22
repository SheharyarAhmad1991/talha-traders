"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n/language-context";

type BalanceRow = {
  rawMaterialId?: string;
  materialName: string;
  unit: string;
  quantity: number;
};

export function WorkerPendingBalance({ workerId }: { workerId?: string }) {
  const { t } = useLanguage();
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workerId) {
      setBalances([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/inventory?workerId=${encodeURIComponent(workerId)}`, {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || t("failedToLoad"));
        if (!Array.isArray(data)) throw new Error(t("failedToLoad"));
        if (!cancelled) setBalances(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setBalances([]);
          setError(err instanceof Error ? err.message : t("failedToLoad"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [workerId, t]);

  if (!workerId) return null;

  const total = balances.reduce((sum, b) => sum + Number(b.quantity || 0), 0);

  return (
    <div className="space-y-2 rounded-lg border border-primary/20 bg-muted/40 p-3">
      <p className="text-sm font-medium">
        {t("workerPendingBalance")}
        {!loading && balances.length > 0 ? ` (${t("total")}: ${total})` : ""}
      </p>
      {loading && (
        <p className="text-sm text-muted-foreground">{t("loadingBalance")}</p>
      )}
      {!loading && error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {!loading && !error && balances.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("noPendingBalance")}</p>
      )}
      {!loading && !error && balances.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {balances.map((b) => (
            <Badge
              key={`${b.rawMaterialId || b.materialName}-${b.unit}`}
              variant="secondary"
            >
              {b.materialName}: {b.quantity} {b.unit}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function FactoryStockPanel() {
  const { t } = useLanguage();
  const [stocks, setStocks] = useState<BalanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/inventory", { cache: "no-store", credentials: "same-origin" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || t("failedToLoad"));
        if (!cancelled && Array.isArray(data)) {
          setStocks(data.filter((s: BalanceRow) => Number(s.quantity) > 0));
        }
      })
      .catch(() => {
        if (!cancelled) setStocks([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <p className="text-sm font-medium">{t("factoryAvailableStock")}</p>
      {loading && (
        <p className="text-sm text-muted-foreground">{t("loadingFactoryStock")}</p>
      )}
      {!loading && stocks.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("noFactoryStockAvailable")}</p>
      )}
      {!loading && stocks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {stocks.map((b) => (
            <Badge
              key={`${b.rawMaterialId || b.materialName}-${b.unit}`}
              variant="outline"
            >
              {b.materialName}: {b.quantity} {b.unit}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
