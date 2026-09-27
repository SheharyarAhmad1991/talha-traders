"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/lib/i18n/language-context";
import { localizedName } from "@/lib/i18n/localize";
import { notifyDataChanged } from "@/lib/use-fresh-list";

export type DeductMaterialOption = {
  rawMaterialId: string;
  quantity: number;
  name: string;
  nameUr?: string | null;
  unit: string;
};

export function FactoryDeductDialog({
  open,
  onOpenChange,
  materials,
  initialMaterialId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materials: DeductMaterialOption[];
  initialMaterialId?: string | null;
}) {
  const { t, language } = useLanguage();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const selected = useMemo(
    () =>
      materials.find((m) => m.rawMaterialId === initialMaterialId) ?? null,
    [materials, initialMaterialId]
  );

  useEffect(() => {
    if (!open) return;
    setDate(format(new Date(), "yyyy-MM-dd"));
    setQuantity("");
    setPrice("");
    setNotes("");
  }, [open, initialMaterialId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) {
      toast.error(t("selectMaterial"));
      return;
    }
    const qty = Number(quantity);
    if (Number.isNaN(qty) || qty <= 0) {
      toast.error(t("quantityMustBePositive"));
      return;
    }
    if (qty > selected.quantity) {
      toast.error(
        t("insufficientFactoryStock").replace(
          "{available}",
          `${selected.quantity} ${selected.unit}`
        )
      );
      return;
    }
    const priceTrimmed = price.trim();
    let amountPaid: number | undefined;
    if (priceTrimmed !== "") {
      amountPaid = Number(priceTrimmed);
      if (Number.isNaN(amountPaid) || amountPaid < 0) {
        toast.error(t("priceCannotBeNegative"));
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch("/api/factory-deduct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          rawMaterialId: selected.rawMaterialId,
          quantity: qty,
          amountPaid,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("failedToSave"));
      toast.success(t("deductSuccess"));
      notifyDataChanged();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("failedToSave"));
    } finally {
      setLoading(false);
    }
  }

  const materialLabel = selected
    ? localizedName(
        { name: selected.name, nameUr: selected.nameUr },
        language
      )
    : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("deductMaterial")}</DialogTitle>
          <DialogDescription>{t("deductMaterialDesc")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="deduct-date">{t("date")}</Label>
            <Input
              id="deduct-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{t("material")}</Label>
            <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium">
              {materialLabel}
            </p>
            {selected ? (
              <p className="text-xs text-muted-foreground">
                {t("available")}: {selected.quantity} {selected.unit}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="deduct-qty">{t("quantityToDeduct")}</Label>
            <Input
              id="deduct-qty"
              type="number"
              step="any"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deduct-price">{t("price")}</Label>
            <Input
              id="deduct-price"
              type="number"
              step="any"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={t("priceOptional")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deduct-notes">{t("notes")}</Label>
            <Input
              id="deduct-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("deductNotesPlaceholder")}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={loading || !selected}>
              {loading ? t("saving") : t("deduct")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
