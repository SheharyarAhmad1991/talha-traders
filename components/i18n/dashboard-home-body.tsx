"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Warehouse, Users, Minus } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/language-context";
import { localizedName, localizeText } from "@/lib/i18n/localize";
import { autoUrduUnit } from "@/lib/i18n/auto-urdu";
import { FactoryDeductDialog } from "@/components/forms/factory-deduct-dialog";

type FactoryRow = {
  id: string;
  rawMaterialId: string;
  quantity: number;
  rawMaterial: { name: string; nameUr?: string | null; unit: string };
};
type WorkerRow = {
  id: string;
  quantity: number;
  worker: { name: string; nameUr?: string | null };
  rawMaterial: { name: string; nameUr?: string | null; unit: string };
};
type LogRow = {
  id: string;
  date: string | Date;
  type: string;
  dealerName: string | null;
  workerName: string | null;
  rawMaterialName: string | null;
  finishedProductName: string | null;
  quantity: number | null;
};

export function DashboardHomeBody({
  factoryStock,
  workerStock,
  recentLogs,
  dealerCount,
  workerCount,
}: {
  factoryStock: FactoryRow[];
  workerStock: WorkerRow[];
  recentLogs: LogRow[];
  dealerCount: number;
  workerCount: number;
}) {
  const { t, language } = useLanguage();
  const [deductOpen, setDeductOpen] = useState(false);
  const [deductMaterialId, setDeductMaterialId] = useState<string | null>(null);

  const deductMaterials = useMemo(
    () =>
      factoryStock
        .filter((row) => Number(row.quantity) > 0)
        .map((row) => ({
          rawMaterialId: row.rawMaterialId,
          quantity: row.quantity,
          name: row.rawMaterial.name,
          nameUr: row.rawMaterial.nameUr,
          unit: row.rawMaterial.unit,
        })),
    [factoryStock]
  );

  function openDeduct(materialId: string) {
    setDeductMaterialId(materialId);
    setDeductOpen(true);
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("factoryMaterials")}</CardDescription>
            <CardTitle className="text-3xl">
              {factoryStock.filter((s) => s.quantity > 0).length}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <Warehouse className="size-4" />
            {t("itemsWithStock")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("workerBalances")}</CardDescription>
            <CardTitle className="text-3xl">{workerStock.length}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="size-4" />
            {t("activeMaterialLines")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("dealers")}</CardDescription>
            <CardTitle className="text-3xl">{dealerCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("worker")}</CardDescription>
            <CardTitle className="text-3xl">{workerCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("factoryInventory")}</CardTitle>
            <CardDescription>{t("currentStockAtFactory")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("material")}</TableHead>
                    <TableHead className="text-end">{t("quantity")}</TableHead>
                    <TableHead className="text-end">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {factoryStock.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="py-6 text-center text-muted-foreground"
                      >
                        {t("noFactoryStock")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    factoryStock.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          {localizedName(row.rawMaterial, language)}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {row.quantity}{" "}
                          {language === "ur"
                            ? autoUrduUnit(row.rawMaterial.unit) ||
                              row.rawMaterial.unit
                            : row.rawMaterial.unit}
                        </TableCell>
                        <TableCell className="text-end">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={!(row.quantity > 0)}
                            onClick={() => openDeduct(row.rawMaterialId)}
                            aria-label={t("deduct")}
                          >
                            <Minus data-icon="inline-start" />
                            {t("deduct")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("workerMaterialBalances")}</CardTitle>
            <CardDescription>{t("topPendingBalances")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("worker")}</TableHead>
                    <TableHead>{t("material")}</TableHead>
                    <TableHead className="text-end">{t("qty")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workerStock.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="py-6 text-center text-muted-foreground"
                      >
                        {t("noWorkerBalances")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    workerStock.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          {localizedName(row.worker, language)}
                        </TableCell>
                        <TableCell>
                          {localizedName(row.rawMaterial, language)}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {row.quantity}{" "}
                          {language === "ur"
                            ? autoUrduUnit(row.rawMaterial.unit) ||
                              row.rawMaterial.unit
                            : row.rawMaterial.unit}
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

      <Card>
        <CardHeader>
          <CardTitle>{t("recentActivity")}</CardTitle>
          <CardDescription>{t("latestLogs")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("type")}</TableHead>
                  <TableHead>{t("summary")}</TableHead>
                  <TableHead className="text-end">{t("qty")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLogs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-6 text-center text-muted-foreground"
                    >
                      {t("noTransactions")}
                    </TableCell>
                  </TableRow>
                ) : (
                  recentLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {format(new Date(log.date), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {log.type === "PURCHASE"
                            ? t("purchase")
                            : log.type === "ISSUE"
                              ? t("issue")
                              : log.type === "RECEIVE"
                                ? t("receive")
                                : log.type === "DEDUCT"
                                  ? t("deduct")
                                  : localizeText(log.type, language)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {[
                          localizeText(log.dealerName, language),
                          localizeText(log.workerName, language),
                          localizeText(log.rawMaterialName, language),
                          localizeText(log.finishedProductName, language),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {log.quantity ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <FactoryDeductDialog
        open={deductOpen}
        onOpenChange={setDeductOpen}
        materials={deductMaterials}
        initialMaterialId={deductMaterialId}
      />
    </>
  );
}
