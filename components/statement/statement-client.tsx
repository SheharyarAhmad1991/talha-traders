"use client";

import { useEffect, useState } from "react";
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

const recordTypeOptions = [
  { value: "ALL", label: "All" },
  { value: "PURCHASE", label: "Purchase" },
  { value: "ISSUE", label: "Issue" },
  { value: "RECEIVE", label: "Receive" },
];

type LogRow = {
  id: string;
  type: "PURCHASE" | "ISSUE" | "RECEIVE";
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
  batchId?: string | null;
};

export function StatementClient() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [type, setType] = useState("ALL");
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      params.set("type", type);
      const res = await fetch(`/api/statement?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setRows(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onDelete(row: LogRow) {
    const batchNote =
      row.type === "RECEIVE" && row.batchId
        ? " This will delete the whole receive batch and restore deducted materials."
        : " Inventory will be reversed.";
    if (!confirm(`Delete this ${row.type} record?${batchNote}`)) return;

    setDeletingId(row.id);
    try {
      const res = await fetch(`/api/transactions/${row.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      toast.success("Record deleted");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  function getDetails(r: LogRow) {
    if (r.type === "PURCHASE") {
      return [
        r.dealerName,
        r.rawMaterialName,
        r.sendTo ? `To ${r.sendTo}` : null,
        r.workerName ? `(${r.workerName})` : null,
      ]
        .filter(Boolean)
        .join(" · ");
    }
    if (r.type === "ISSUE") {
      return [r.workerName, r.rawMaterialName].filter(Boolean).join(" · ");
    }
    return [
      r.workerName,
      r.finishedProductName,
      r.materialConsumed != null && r.materialConsumed > 0
        ? `Consumed ${r.materialConsumed}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  function getPayment(r: LogRow) {
    if (r.type === "PURCHASE") return r.amountPaid ?? "—";
    if (r.type === "RECEIVE") return r.mazdooriPaid ?? "—";
    return "—";
  }

  function downloadCsv() {
    if (rows.length === 0) {
      toast.message("No rows to download. Apply filters first.");
      return;
    }
    const headers = [
      "Date",
      "Type",
      "Dealer",
      "Worker",
      "Material",
      "Product",
      "Quantity",
      "Material Consumed",
      "Amount Paid",
      "Mazdoori Paid",
      "Send To",
      "Notes",
    ];
    const lines = rows.map((r) =>
      [
        format(new Date(r.date), "yyyy-MM-dd"),
        r.type,
        r.dealerName || "",
        r.workerName || "",
        r.rawMaterialName || "",
        r.finishedProductName || "",
        r.quantity ?? "",
        r.materialConsumed ?? "",
        r.amountPaid ?? "",
        r.mazdooriPaid ?? "",
        r.sendTo || "",
        (r.notes || "").replace(/,/g, ";"),
      ].join(",")
    );
    const blob = new Blob([[headers.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `umer-traders-statement-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  }

  async function downloadPdf() {
    if (rows.length === 0) {
      toast.message("No rows to download. Apply filters first.");
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
      doc.text("Umer Traders — Statement", 14, 16);
      doc.setFontSize(10);
      doc.text(
        [
          startDate ? `From: ${startDate}` : null,
          endDate ? `To: ${endDate}` : null,
          `Type: ${type}`,
          `Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`,
        ]
          .filter(Boolean)
          .join("  |  "),
        14,
        24
      );

      autoTable(doc, {
        startY: 30,
        head: [["Date", "Type", "Details", "Qty", "Payment", "Notes"]],
        body: rows.map((r) => [
          format(new Date(r.date), "dd MMM yyyy"),
          r.type,
          getDetails(r),
          r.quantity ?? "—",
          String(getPayment(r)),
          r.notes || "—",
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 30, 30] },
        columnStyles: {
          2: { cellWidth: 80 },
          5: { cellWidth: 45 },
        },
      });

      doc.save(`umer-traders-statement-${Date.now()}.pdf`);
      toast.success("PDF downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create PDF");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Download Statement</CardTitle>
          <CardDescription>
            View, edit, or delete purchase / issue / receive records. Filters
            and PDF/CSV export included.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Record Type</Label>
            <AppSelect
              value={type}
              onValueChange={setType}
              options={recordTypeOptions}
              placeholder="Record type"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={load} disabled={loading} className="w-full">
              {loading ? "Loading..." : "Apply Filters"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-4">
            <Button variant="outline" onClick={downloadCsv}>
              <Download data-icon="inline-start" />
              Download CSV
            </Button>
            <Button variant="outline" onClick={downloadPdf}>
              <Download data-icon="inline-start" />
              Download PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Records</CardTitle>
          <CardDescription>
            {rows.length} record(s) — use Edit or Delete on any row
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No records yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        {format(new Date(r.date), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{r.type}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs text-sm">
                        {getDetails(r)}
                      </TableCell>
                      <TableCell>{r.quantity ?? "—"}</TableCell>
                      <TableCell>{getPayment(r)}</TableCell>
                      <TableCell className="max-w-[160px] truncate text-sm text-muted-foreground">
                        {r.notes || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/dashboard/records/${r.id}/edit`}>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Edit"
                            >
                              <Pencil />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={deletingId === r.id}
                            onClick={() => onDelete(r)}
                            aria-label="Delete"
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
