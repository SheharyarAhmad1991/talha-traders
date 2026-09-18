"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

type BalanceRow = {
  rawMaterialId?: string;
  materialName: string;
  unit: string;
  quantity: number;
};

export function WorkerPendingBalance({ workerId }: { workerId?: string }) {
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
        if (!r.ok) throw new Error(data.error || "Failed to load balance");
        if (!Array.isArray(data)) throw new Error("Invalid balance response");
        if (!cancelled) setBalances(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setBalances([]);
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [workerId]);

  if (!workerId) return null;

  const total = balances.reduce((sum, b) => sum + Number(b.quantity || 0), 0);

  return (
    <div className="space-y-2 rounded-lg border border-primary/20 bg-muted/40 p-3">
      <p className="text-sm font-medium">
        Worker pending material balance
        {!loading && balances.length > 0 ? ` (total: ${total})` : ""}
      </p>
      {loading && (
        <p className="text-sm text-muted-foreground">Loading balance…</p>
      )}
      {!loading && error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {!loading && !error && balances.length === 0 && (
        <p className="text-sm text-muted-foreground">No pending balance</p>
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
  const [stocks, setStocks] = useState<BalanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/inventory", { cache: "no-store", credentials: "same-origin" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load factory stock");
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
  }, []);

  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <p className="text-sm font-medium">Factory available stock</p>
      {loading && (
        <p className="text-sm text-muted-foreground">Loading factory stock…</p>
      )}
      {!loading && stocks.length === 0 && (
        <p className="text-sm text-muted-foreground">No factory stock available</p>
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
