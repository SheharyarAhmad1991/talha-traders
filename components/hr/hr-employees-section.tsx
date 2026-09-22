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

type Factory = { id: string; name: string };
type Employee = {
  id: string;
  name: string;
  factoryId: string;
  salaryType: "DAILY" | "MONTHLY";
  salaryAmount: number;
  factory?: Factory;
};

const salaryTypeOptions = [
  { value: "DAILY", label: "Daily Wage" },
  { value: "MONTHLY", label: "Monthly Fixed" },
];

export function HrEmployeesSection({
  factories: initialFactories,
  employees: initialEmployees,
}: {
  factories: Factory[];
  employees: Employee[];
}) {
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
          <CardTitle>Add Factories Employees</CardTitle>
          <CardDescription>
            Add employees with factory assignment and salary type.
          </CardDescription>
        </div>
        <Button onClick={openCreate} disabled={factories.length === 0}>
          <Plus className="size-4" />
          Add Employee
        </Button>
      </CardHeader>
      <CardContent>
        {factories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add an HR Factory first, then add employees.
          </p>
        ) : employees.length === 0 ? (
          <p className="text-sm text-muted-foreground">No employees yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Factory</TableHead>
                <TableHead>Salary Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.factory?.name || "—"}</TableCell>
                  <TableCell>
                    {item.salaryType === "DAILY" ? "Daily Wage" : "Monthly Fixed"}
                  </TableCell>
                  <TableCell>{item.salaryAmount}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(item)}
                        aria-label="Edit"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(item)}
                        aria-label="Delete"
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
              {editing ? "Edit Employee" : "Add Employee"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hr-emp-name">Employee Name</Label>
              <Input
                id="hr-emp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Assigned Factory</Label>
              <AppSelect
                value={factoryId}
                onValueChange={setFactoryId}
                options={factoryOptions}
                placeholder="Select factory"
              />
            </div>
            <div className="space-y-2">
              <Label>Salary Type</Label>
              <AppSelect
                value={salaryType}
                onValueChange={(v) =>
                  setSalaryType(v as "DAILY" | "MONTHLY")
                }
                options={salaryTypeOptions}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hr-emp-amount">Salary Amount</Label>
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
                {loading ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
