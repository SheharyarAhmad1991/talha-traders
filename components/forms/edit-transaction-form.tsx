"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import { NotesWithVoice } from "@/components/forms/notes-with-voice";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import { localizedName, optionLabel } from "@/lib/i18n/localize";

type Option = { id: string; name: string; nameUr?: string | null; unit?: string };

type LogRecord = {
  id: string;
  type: "PURCHASE" | "ISSUE" | "RECEIVE";
  date: string;
  dealerId: string | null;
  workerId: string | null;
  rawMaterialId: string | null;
  finishedProductId: string | null;
  quantity: number | null;
  amountPaid: number | null;
  mazdooriPaid: number | null;
  materialConsumed: number | null;
  sendTo: "FACTORY" | "WORKER" | null;
  notes: string | null;
  extra: {
    materialsConsumed?: { rawMaterialId: string; quantity: number }[];
  } | null;
};

export function EditTransactionForm({
  log,
  dealers,
  workers,
  materials,
  products,
}: {
  log: LogRecord;
  dealers: Option[];
  workers: Option[];
  materials: Option[];
  products: Option[];
}) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(log.date.slice(0, 10));
  const [notes, setNotes] = useState(log.notes || "");
  const [dealerId, setDealerId] = useState(log.dealerId || "");
  const [workerId, setWorkerId] = useState(log.workerId || "");
  const [rawMaterialId, setRawMaterialId] = useState(log.rawMaterialId || "");
  const [finishedProductId, setFinishedProductId] = useState(
    log.finishedProductId || ""
  );
  const [quantity, setQuantity] = useState(String(log.quantity ?? ""));
  const [amountPaid, setAmountPaid] = useState(String(log.amountPaid ?? ""));
  const [mazdooriPaid, setMazdooriPaid] = useState(
    String(log.mazdooriPaid ?? "")
  );
  const [sendTo, setSendTo] = useState(log.sendTo || "FACTORY");
  const [materialsConsumed, setMaterialsConsumed] = useState(
    log.extra?.materialsConsumed?.length
      ? log.extra.materialsConsumed.map((m) => ({
          rawMaterialId: m.rawMaterialId,
          quantity: String(m.quantity),
        }))
      : [{ rawMaterialId: "", quantity: "" }]
  );

  const isPrimaryReceive = (log.materialConsumed ?? 0) > 0;

  const sendToOptions = useMemo(
    () => [
      { value: "FACTORY", label: t("factory") },
      { value: "WORKER", label: t("worker") },
    ],
    [t]
  );

  const dealerOptions = useMemo(
    () =>
      dealers.map((d) => ({
        value: d.id,
        label: localizedName(d, language),
      })),
    [dealers, language]
  );
  const workerOptions = useMemo(
    () =>
      workers.map((w) => ({
        value: w.id,
        label: localizedName(w, language),
      })),
    [workers, language]
  );
  const materialOptions = useMemo(
    () =>
      materials.map((m) => ({
        value: m.id,
        label: optionLabel(m, language),
      })),
    [materials, language]
  );
  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: p.id,
        label: optionLabel(p, language),
      })),
    [products, language]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const qty = Number(quantity);
    if (Number.isNaN(qty) || qty <= 0) {
      toast.error(t("quantityMustBePositive"));
      return;
    }

    if (log.type === "PURCHASE") {
      const paid = Number(amountPaid);
      if (Number.isNaN(paid) || paid < 0) {
        toast.error(t("amountCannotBeNegative"));
        return;
      }
    }

    if (log.type === "RECEIVE" && isPrimaryReceive) {
      const mazdoori = Number(mazdooriPaid || 0);
      if (Number.isNaN(mazdoori) || mazdoori < 0) {
        toast.error(t("mazdooriCannotBeNegative"));
        return;
      }
      for (const m of materialsConsumed) {
        const mq = Number(m.quantity);
        if (Number.isNaN(mq) || mq <= 0) {
          toast.error(t("quantityMustBePositive"));
          return;
        }
      }
    }

    setLoading(true);
    try {
      let body: Record<string, unknown> = {
        date,
        notes,
        quantity: qty,
      };

      if (log.type === "PURCHASE") {
        body = {
          ...body,
          dealerId,
          rawMaterialId,
          amountPaid: Number(amountPaid),
          sendTo,
          workerId: sendTo === "WORKER" ? workerId : undefined,
        };
      } else if (log.type === "ISSUE") {
        body = { ...body, workerId, rawMaterialId };
      } else {
        body = {
          ...body,
          workerId,
          finishedProductId,
          mazdooriPaid: Number(mazdooriPaid || 0),
        };
        if (isPrimaryReceive) {
          body.materialsConsumed = materialsConsumed.map((m) => ({
            rawMaterialId: m.rawMaterialId,
            quantity: Number(m.quantity),
          }));
        }
      }

      const res = await fetch(`/api/transactions/${log.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("updateFailed"));
      toast.success(t("recordUpdated"));
      router.push("/dashboard/statement");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("updateFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("editRecord")} ({log.type})
        </CardTitle>
        <CardDescription>
          {t("inventoryUpdateHint")}
          {log.type === "RECEIVE" && isPrimaryReceive
            ? " Deleting later will remove the whole receive batch."
            : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("date")}</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            {(log.type === "PURCHASE" ||
              log.type === "ISSUE" ||
              log.type === "RECEIVE") && (
              <div className="space-y-2">
                {log.type === "PURCHASE" ? (
                  <>
                    <Label>{t("dealer")}</Label>
                    <AppSelect
                      value={dealerId}
                      onValueChange={setDealerId}
                      options={dealerOptions}
                      placeholder={t("selectDealer")}
                    />
                  </>
                ) : (
                  <>
                    <Label>{t("worker")}</Label>
                    <AppSelect
                      value={workerId}
                      onValueChange={setWorkerId}
                      options={workerOptions}
                      placeholder={t("selectWorker")}
                    />
                  </>
                )}
              </div>
            )}

            {log.type === "PURCHASE" && (
              <>
                <div className="space-y-2">
                  <Label>{t("sendTo")}</Label>
                  <AppSelect
                    value={sendTo}
                    onValueChange={(v) =>
                      setSendTo(v as "FACTORY" | "WORKER")
                    }
                    options={sendToOptions}
                  />
                </div>
                {sendTo === "WORKER" && (
                  <div className="space-y-2">
                    <Label>{t("worker")}</Label>
                    <AppSelect
                      value={workerId}
                      onValueChange={setWorkerId}
                      options={workerOptions}
                      placeholder={t("selectWorker")}
                    />
                  </div>
                )}
              </>
            )}

            {(log.type === "PURCHASE" || log.type === "ISSUE") && (
              <div className="space-y-2">
                <Label>{t("material")}</Label>
                <AppSelect
                  value={rawMaterialId}
                  onValueChange={setRawMaterialId}
                  options={materialOptions}
                  placeholder={t("selectMaterial")}
                />
              </div>
            )}

            {log.type === "RECEIVE" && (
              <div className="space-y-2">
                <Label>{t("finishedProduct")}</Label>
                <AppSelect
                  value={finishedProductId}
                  onValueChange={setFinishedProductId}
                  options={productOptions}
                  placeholder={t("selectProduct")}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>{t("quantity")}</Label>
              <Input
                type="number"
                step="any"
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>

            {log.type === "PURCHASE" && (
              <div className="space-y-2">
                <Label>{t("amountPaid")}</Label>
                <Input
                  type="number"
                  step="any"
                  min={0}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  required
                />
              </div>
            )}

            {log.type === "RECEIVE" && isPrimaryReceive && (
              <div className="space-y-2">
                <Label>{t("mazdooriPaid")}</Label>
                <Input
                  type="number"
                  step="any"
                  min={0}
                  value={mazdooriPaid}
                  onChange={(e) => setMazdooriPaid(e.target.value)}
                />
              </div>
            )}
          </div>

          {log.type === "RECEIVE" && isPrimaryReceive && (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{t("materialsConsumed")}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setMaterialsConsumed((prev) => [
                      ...prev,
                      { rawMaterialId: "", quantity: "" },
                    ])
                  }
                >
                  <Plus data-icon="inline-start" />
                  {t("add")}
                </Button>
              </div>
              {materialsConsumed.map((row, index) => (
                <div
                  key={index}
                  className="grid gap-3 md:grid-cols-[1fr_120px_auto]"
                >
                  <AppSelect
                    value={row.rawMaterialId}
                    onValueChange={(v) =>
                      setMaterialsConsumed((prev) =>
                        prev.map((r, i) =>
                          i === index ? { ...r, rawMaterialId: v } : r
                        )
                      )
                    }
                    options={materialOptions}
                    placeholder={t("material")}
                  />
                  <Input
                    type="number"
                    step="any"
                    min={0}
                    value={row.quantity}
                    onChange={(e) =>
                      setMaterialsConsumed((prev) =>
                        prev.map((r, i) =>
                          i === index
                            ? { ...r, quantity: e.target.value }
                            : r
                        )
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={materialsConsumed.length === 1}
                    onClick={() =>
                      setMaterialsConsumed((prev) =>
                        prev.filter((_, i) => i !== index)
                      )
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <NotesWithVoice value={notes} onChange={setNotes} />

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? t("saving") : t("saveChanges")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/statement")}
            >
              {t("cancel")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
