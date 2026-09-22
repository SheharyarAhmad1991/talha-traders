"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { todayInputValue } from "@/lib/utils-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Factory = { id: string; name: string };
type SalaryRow = {
  employeeId: string;
  name: string;
  totalPresents: number;
  totalBonus: number;
  finalSalary: number;
};

export function SalaryStatementClient({
  factories,
}: {
  factories: Factory[];
}) {
  const [startDate, setStartDate] = useState(todayInputValue());
  const [endDate, setEndDate] = useState(todayInputValue());
  const [factoryId, setFactoryId] = useState("");
  const [rows, setRows] = useState<SalaryRow[]>([]);
  const [loading, setLoading] = useState(false);

  const factoryOptions = useMemo(
    () => factories.map((f) => ({ value: f.id, label: f.name })),
    [factories]
  );

  const factoryName =
    factories.find((f) => f.id === factoryId)?.name || "Factory";

  async function onLoad() {
    if (!startDate || !endDate || !factoryId) {
      toast.error("Select start date, end date, and factory");
      return;
    }
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        startDate,
        endDate,
        factoryId,
      });
      const res = await fetch(`/api/hr/salary?${qs.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setRows(data.rows || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  function downloadCsv() {
    if (rows.length === 0) {
      toast.error("Load statement first");
      return;
    }
    const header = ["Employee Name", "Total Presents", "Total Bonus", "Final Salary"];
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [
          `"${r.name.replace(/"/g, '""')}"`,
          r.totalPresents,
          r.totalBonus,
          r.finalSalary,
        ].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hr-salary-${factoryName}-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadPdf() {
    if (rows.length === 0) {
      toast.error("Load statement first");
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("HR Salary Statement", 14, 16);
    doc.setFontSize(10);
    doc.text(`Factory: ${factoryName}`, 14, 24);
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 30);
    autoTable(doc, {
      startY: 36,
      head: [["Employee Name", "Total Presents", "Total Bonus", "Final Salary"]],
      body: rows.map((r) => [
        r.name,
        String(r.totalPresents),
        String(r.totalBonus),
        String(r.finalSalary),
      ]),
    });
    doc.save(`hr-salary-${factoryName}-${startDate}-to-${endDate}.pdf`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Salary Statement
          </h2>
          <p className="text-sm text-muted-foreground">
            Calculate salary from attendance between start and end dates.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={downloadCsv} disabled={rows.length === 0}>
            <Download className="size-4" />
            Download CSV
          </Button>
          <Button onClick={downloadPdf} disabled={rows.length === 0}>
            <Download className="size-4" />
            Download Statement
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Daily wage = presents × rate + bonus. Monthly = fixed salary + bonus.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="sal-start">Start Date</Label>
            <Input
              id="sal-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sal-end">End Date</Label>
            <Input
              id="sal-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Factory</Label>
            <AppSelect
              value={factoryId}
              onValueChange={setFactoryId}
              options={factoryOptions}
              placeholder="Select factory"
            />
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={onLoad} disabled={loading}>
              {loading ? "Loading…" : "Load Statement"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Set filters and click Load Statement.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Total Presents</TableHead>
                  <TableHead>Total Bonus</TableHead>
                  <TableHead>Final Salary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.employeeId}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.totalPresents}</TableCell>
                    <TableCell>{row.totalBonus}</TableCell>
                    <TableCell>{row.finalSalary}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
