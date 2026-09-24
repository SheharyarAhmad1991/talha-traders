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
import { useLanguage } from "@/lib/i18n/language-context";
import { localizedName } from "@/lib/i18n/localize";
import { useFreshList } from "@/lib/use-fresh-list";

type Factory = { id: string; name: string; nameUr?: string | null };
type SalaryRow = {
  employeeId: string;
  name: string;
  nameUr?: string | null;
  totalPresents: number;
  totalBonus: number;
  finalSalary: number;
};

export function SalaryStatementClient({
  factories: initialFactories,
}: {
  factories: Factory[];
}) {
  const { t, language } = useLanguage();
  const factories = useFreshList<Factory>("/api/hr/factories", initialFactories);
  const [startDate, setStartDate] = useState(todayInputValue());
  const [endDate, setEndDate] = useState(todayInputValue());
  const [factoryId, setFactoryId] = useState("");
  const [rows, setRows] = useState<SalaryRow[]>([]);
  const [loading, setLoading] = useState(false);

  const factoryOptions = useMemo(
    () =>
      factories.map((f) => ({
        value: f.id,
        label: localizedName(f, language),
      })),
    [factories, language]
  );

  const selectedFactory = factories.find((f) => f.id === factoryId);
  const factoryName = selectedFactory
    ? localizedName(selectedFactory, language)
    : t("factory");

  function displayName(row: SalaryRow) {
    return localizedName(row, language);
  }

  async function onLoad() {
    if (!startDate || !endDate || !factoryId) {
      toast.error(t("selectSalaryFilters"));
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
      if (!res.ok) throw new Error(data.error || t("failedToLoad"));
      setRows(data.rows || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("failedToLoad"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  function downloadCsv() {
    if (rows.length === 0) {
      toast.error(t("loadStatementFirst"));
      return;
    }
    const header = [
      t("employeeName"),
      t("totalPresents"),
      t("totalBonus"),
      t("finalSalary"),
    ];
    const lines = [
      header.join(","),
      ...rows.map((r) => {
        const name = displayName(r);
        return [
          `"${name.replace(/"/g, '""')}"`,
          r.totalPresents,
          r.totalBonus,
          r.finalSalary,
        ].join(",");
      }),
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
      toast.error(t("loadStatementFirst"));
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(t("hrSalaryStatement"), 14, 16);
    doc.setFontSize(10);
    doc.text(`${t("factory")}: ${factoryName}`, 14, 24);
    doc.text(
      `${t("period")}: ${startDate} ${t("to")} ${endDate}`,
      14,
      30
    );
    autoTable(doc, {
      startY: 36,
      head: [
        [
          t("employeeName"),
          t("totalPresents"),
          t("totalBonus"),
          t("finalSalary"),
        ],
      ],
      body: rows.map((r) => [
        displayName(r),
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
            {t("salaryStatement")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("salaryCalcDesc")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={downloadCsv} disabled={rows.length === 0}>
            <Download className="size-4" />
            {t("downloadCsv")}
          </Button>
          <Button onClick={downloadPdf} disabled={rows.length === 0}>
            <Download className="size-4" />
            {t("downloadStatementBtn")}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("filters")}</CardTitle>
          <CardDescription>{t("salaryHint")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="sal-start">{t("startDate")}</Label>
            <Input
              id="sal-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sal-end">{t("endDate")}</Label>
            <Input
              id="sal-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("factory")}</Label>
            <AppSelect
              value={factoryId}
              onValueChange={setFactoryId}
              options={factoryOptions}
              placeholder={t("selectFactory")}
            />
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={onLoad} disabled={loading}>
              {loading ? t("loading") : t("loadStatement")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("salaryStatement")}</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("setFiltersHint")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("employeeName")}</TableHead>
                  <TableHead>{t("totalPresents")}</TableHead>
                  <TableHead>{t("totalBonus")}</TableHead>
                  <TableHead>{t("finalSalary")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.employeeId}>
                    <TableCell>{displayName(row)}</TableCell>
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
