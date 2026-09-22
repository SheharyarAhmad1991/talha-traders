"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type Factory = { id: string; name: string };
type Employee = {
  id: string;
  name: string;
  factoryId: string;
  salaryType: "DAILY" | "MONTHLY";
  salaryAmount: number;
  factory?: Factory;
};

export function HrEmployeesSection({
  factories: initialFactories,
  employees: initialEmployees,
}: {
  factories: Factory[];
  employees: Employee[];
}) {
  const { t } = useLanguage();
  const salaryTypeOptions = useMemo(
    () => [
      { value: "DAILY", label: t("dailyWage") },
      { value: "MONTHLY", label: t("monthlyFixed") },
    ],
    [t]
  );
  const router = useRouter();
  const [factories, setFactories] = useState(initialFactories);
  const [employees, setEmployees] = useState(initialEmployees);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [factoryId, setFactoryId] = useState("");
  const [salaryType, setSalaryType] = useState<"DAILY" | "MONTHLY">("DAILY");
  const [salaryAmount, setSalaryAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const factoryOptions = useMemo(
    () => factories.map((f) => ({ value: f.id, label: f.name })),
    [factories]
  );

  const reload = useCallback(async () => {
    const [fRes, eRes] = await Promise.all([
      fetch("/api/hr/factories", { cache: "no-store" }),
      fetch("/api/hr/employees", { cache: "no-store" }),
    ]);
    if (fRes.ok) {
      const data = await fRes.json();
      if (Array.isArray(data)) setFactories(data);
    }
    if (eRes.ok) {
      const data = await eRes.json();
      if (Array.isArray(data)) setEmployees(data);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  function openCreate() {
    setEditing(null);
    setFormError(null);
    setName("");
    setFactoryId(factories[0]?.id || "");
    setSalaryType("DAILY");
    setSalaryAmount("");
    setOpen(true);
  }

  function openEdit(item: Employee) {
    setEditing(item);
    setFormError(null);
    setName(item.name);
    setFactoryId(item.factoryId);
    setSalaryType(item.salaryType);
    setSalaryAmount(String(item.salaryAmount));
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Employee name is required");
      return;
    }
    if (!factoryId) {
      setFormError("Factory is required");
      return;
    }
    if (!salaryAmount || Number(salaryAmount) <= 0) {
      setFormError("Salary amount must be greater than 0");
      return;
    }

    setLoading(true);
    try {
      const url = editing
        ? `/api/hr/employees/${editing.id}`
        : "/api/hr/employees";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          factoryId,
          salaryType,
          salaryAmount: Number(salaryAmount),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      toast.success(editing ? "Employee updated" : "Employee added");
      setOpen(false);
      await reload();
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(item: Employee) {
    if (!confirm(`Delete employee "${item.name}"?`)) return;
    const res = await fetch(`/api/hr/employees/${item.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to delete");
      return;
    }
    toast.success("Employee deleted");
    await reload();
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>{t("addFactoriesEmployees")}</CardTitle>
          <CardDescription>
            {t("employee")} · {t("factory")} · {t("dailyWage")} / {t("monthlySalary")}
          </CardDescription>
        </div>
        <Button onClick={openCreate} disabled={factories.length === 0}>
          <Plus className="size-4" />
          {t("add")} {t("employee")}
        </Button>
      </CardHeader>
      <CardContent>
        {factories.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noFactories")}</p>
        ) : employees.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noEmployees")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("factory")}</TableHead>
                <TableHead>{t("salaryType")}</TableHead>
                <TableHead>{t("salaryAmount")}</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.factory?.name || "—"}</TableCell>
                  <TableCell>
                    {item.salaryType === "DAILY"
                      ? t("dailyWage")
                      : t("monthlyFixed")}
                  </TableCell>
                  <TableCell>{item.salaryAmount}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(item)}
                        aria-label={t("edit")}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(item)}
                        aria-label={t("delete")}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing
                ? `${t("edit")} ${t("employee")}`
                : `${t("add")} ${t("employee")}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hr-emp-name">{t("employeeName")}</Label>
              <Input
                id="hr-emp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
            <div className="space-y-2">
              <Label>{t("salaryType")}</Label>
              <AppSelect
                value={salaryType}
                onValueChange={(v) =>
                  setSalaryType(v as "DAILY" | "MONTHLY")
                }
                options={salaryTypeOptions}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hr-emp-amount">{t("salaryAmount")}</Label>
              <Input
                id="hr-emp-amount"
                type="number"
                min={0}
                step="any"
                value={salaryAmount}
                onChange={(e) => setSalaryAmount(e.target.value)}
              />
            </div>
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? t("saving") : t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
