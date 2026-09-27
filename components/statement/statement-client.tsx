"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { Download, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n/language-context";
import { localizeText } from "@/lib/i18n/localize";

type LogRow = {
  id: string;
  type: "PURCHASE" | "ISSUE" | "RECEIVE" | "DEDUCT";
  date: string;
  dealerName: string | null;
  workerName: string | null;
  rawMaterialName: string | null;
  finishedProductName: string | null;
  quantity: number | null;
  materialConsumed: number | null;
  amountPaid: number | null;
  mazdooriPaid: number | null;
  sendTo: string | null;
  notes: string | null;
};

export function StatementClient() {
  const { t, language } = useLanguage();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [type, setType] = useState("ALL");
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const recordTypeOptions = useMemo(
    () => [
      { value: "ALL", label: t("all") },
      { value: "PURCHASE", label: t("purchase") },
      { value: "ISSUE", label: t("issue") },
      { value: "RECEIVE", label: t("receive") },
      { value: "DEDUCT", label: t("deduct") },
    ],
    [t]
  );

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      params.set("type", type);
      params.set("_", String(Date.now()));
      const res = await fetch(`/api/statement?${params.toString()}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("failedToLoad"));
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("failedToLoad"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onDelete(row: LogRow) {
    if (!confirm(t("deleteConfirm"))) return;

    setDeletingId(row.id);
    try {
      const res = await fetch(`/api/transactions/${row.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("failedToDelete"));
      toast.success(t("recordDeleted"));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("failedToDelete"));
    } finally {
      setDeletingId(null);
    }
  }

  function typeLabel(value: string) {
    if (value === "PURCHASE") return t("purchase");
    if (value === "ISSUE") return t("issue");
    if (value === "RECEIVE") return t("receive");
    if (value === "DEDUCT") return t("deduct");
    if (value === "ALL") return t("all");
    return value;
  }

  function getDetails(r: LogRow) {
    if (r.type === "PURCHASE") {
      return [
        localizeText(r.dealerName, language),
        localizeText(r.rawMaterialName, language),
        r.sendTo
          ? `${t("sendTo")} ${
              r.sendTo === "WORKER"
                ? t("worker")
                : r.sendTo === "FACTORY"
                  ? t("factory")
                  : localizeText(r.sendTo, language)
            }`
          : null,
        r.workerName ? `(${localizeText(r.workerName, language)})` : null,
        r.notes || null,
      ]
        .filter(Boolean)
        .join(" · ");
    }
    if (r.type === "ISSUE") {
      return [
        localizeText(r.workerName, language),
        localizeText(r.rawMaterialName, language),
        r.notes || null,
      ]
        .filter(Boolean)
        .join(" · ");
    }
    if (r.type === "DEDUCT") {
      return [
        localizeText(r.rawMaterialName, language),
        t("factory"),
        r.notes || null,
      ]
        .filter(Boolean)
        .join(" · ");
    }
    return [
      localizeText(r.workerName, language),
      localizeText(r.finishedProductName, language),
      r.materialConsumed != null && r.materialConsumed > 0
        ? `${t("consumed")} ${r.materialConsumed}`
        : null,
      r.notes || null,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  function getPayment(r: LogRow) {
    if (r.type === "PURCHASE") return r.amountPaid ?? "—";
    if (r.type === "RECEIVE") return r.mazdooriPaid ?? "—";
    return "—";
  }

  function csvEscape(value: string | number) {
    const s = String(value ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  function downloadCsv() {
    if (rows.length === 0) {
      toast.message(t("loadFiltersFirst"));
      return;
    }
    const headers = [
      t("date"),
      t("type"),
      t("dealer"),
      t("worker"),
      t("material"),
      t("product"),
      t("quantity"),
      t("materialsConsumed"),
      t("amountPaid"),
      t("mazdooriPaid"),
      t("sendTo"),
      t("notes"),
    ];
    const lines = rows.map((r) =>
      [
        format(new Date(r.date), "yyyy-MM-dd"),
        typeLabel(r.type),
        r.dealerName || "",
        r.workerName || "",
        r.rawMaterialName || "",
        r.finishedProductName || "",
        r.quantity ?? "",
        r.materialConsumed ?? "",
        r.amountPaid ?? "",
        r.mazdooriPaid ?? "",
        r.sendTo === "WORKER"
          ? t("worker")
          : r.sendTo === "FACTORY"
            ? t("factory")
            : r.sendTo || "",
        r.notes || "",
      ]
        .map(csvEscape)
        .join(",")
    );
    const blob = new Blob(
      [["\uFEFF" + headers.join(","), ...lines].join("\n")],
      { type: "text/csv;charset=utf-8;" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `talha-traders-statement-${type.toLowerCase()}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("csvDownloaded"));
  }

  async function downloadPdf() {
    if (rows.length === 0) {
      toast.message(t("loadFiltersFirst"));
      return;
    }

    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      doc.setFontSize(16);
      doc.text("Talha Traders — Statement", 14, 16);
      doc.setFontSize(10);
      doc.text(
        [
          startDate ? `${t("from")}: ${startDate}` : null,
          endDate ? `${t("to")}: ${endDate}` : null,
          `${t("type")}: ${typeLabel(type)}`,
          `${t("generated")}: ${format(new Date(), "dd MMM yyyy HH:mm")}`,
        ]
          .filter(Boolean)
          .join("  |  "),
        14,
        24
      );

      autoTable(doc, {
        startY: 30,
        head: [
          [
            t("date"),
            t("type"),
            t("details"),
            t("qty"),
            t("payment"),
          ],
        ],
        body: rows.map((r) => [
          format(new Date(r.date), "dd MMM yyyy"),
          typeLabel(r.type),
          getDetails(r),
          r.quantity ?? "—",
          String(getPayment(r)),
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 30, 30] },
        columnStyles: {
          2: { cellWidth: 100 },
        },
      });

      doc.save(
        `talha-traders-statement-${type.toLowerCase()}-${Date.now()}.pdf`
      );
      toast.success(t("pdfDownloaded"));
    } catch (err) {
      console.error(err);
      toast.error(t("failedToSave"));
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("downloadStatement")}</CardTitle>
          <CardDescription>{t("statementDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">{t("startDate")}</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">{t("endDate")}</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("recordType")}</Label>
            <AppSelect
              value={type}
              onValueChange={setType}
              options={recordTypeOptions}
              placeholder={t("recordType")}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={load} disabled={loading} className="w-full">
              {loading ? t("loading") : t("applyFilters")}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-4">
            <Button variant="outline" onClick={downloadCsv}>
              <Download data-icon="inline-start" />
              {t("downloadCsv")}
            </Button>
            <Button variant="outline" onClick={downloadPdf}>
              <Download data-icon="inline-start" />
              {t("downloadPdf")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("records")}</CardTitle>
          <CardDescription>
            {rows.length} {t("recordsCount")} — {t("useEditOrDelete")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("type")}</TableHead>
                  <TableHead>{t("details")}</TableHead>
                  <TableHead>{t("qty")}</TableHead>
                  <TableHead>{t("payment")}</TableHead>
                  <TableHead className="w-28 text-end">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-muted-foreground"
                    >
                      {t("noRecords")}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        {format(new Date(r.date), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{typeLabel(r.type)}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs text-sm">
                        {getDetails(r)}
                      </TableCell>
                      <TableCell>{r.quantity ?? "—"}</TableCell>
                      <TableCell>{getPayment(r)}</TableCell>
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-1">
                          {r.type !== "DEDUCT" ? (
                            <Link href={`/dashboard/records/${r.id}/edit`}>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={t("edit")}
                              >
                                <Pencil />
                              </Button>
                            </Link>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={deletingId === r.id}
                            onClick={() => onDelete(r)}
                            aria-label={t("delete")}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
