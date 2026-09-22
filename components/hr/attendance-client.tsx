"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { todayInputValue } from "@/lib/utils-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
type AttendanceRow = {
  employeeId: string;
  name: string;
  isPresent: boolean;
  bonusAmount: number;
};

export function AttendanceClient({ factories }: { factories: Factory[] }) {
  const [date, setDate] = useState(todayInputValue());
  const [factoryId, setFactoryId] = useState("");
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const factoryOptions = useMemo(
    () => factories.map((f) => ({ value: f.id, label: f.name })),
    [factories]
  );

  const loadRows = useCallback(async () => {
    if (!factoryId || !date) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/hr/attendance?date=${encodeURIComponent(date)}&factoryId=${encodeURIComponent(factoryId)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setRows(
        (data.rows || []).map((r: AttendanceRow) => ({
          employeeId: r.employeeId,
          name: r.name,
          isPresent: r.isPresent ?? true,
          bonusAmount: r.bonusAmount ?? 0,
        }))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [date, factoryId]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  function updateRow(
    employeeId: string,
    patch: Partial<Pick<AttendanceRow, "isPresent" | "bonusAmount">>
  ) {
    setRows((prev) =>
      prev.map((r) => (r.employeeId === employeeId ? { ...r, ...patch } : r))
    );
  }

  async function onSave() {
    if (!factoryId || !date) {
      toast.error("Select date and factory");
      return;
    }
    if (rows.length === 0) {
      toast.error("No employees to save");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/hr/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          factoryId,
          rows: rows.map((r) => ({
            employeeId: r.employeeId,
            isPresent: r.isPresent,
            bonusAmount: Number(r.bonusAmount) || 0,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      toast.success("Attendance saved");
      await loadRows();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Mark Attendance
        </h2>
        <p className="text-sm text-muted-foreground">
          Select a factory and mark present/absent with optional bonus.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Attendance defaults to Present (ON). Turn OFF for absentees only.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="att-date">Date</Label>
            <Input
              id="att-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employees</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!factoryId ? (
            <p className="text-sm text-muted-foreground">
              Select a factory to load employees.
            </p>
          ) : loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No employees assigned to this factory.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Present</TableHead>
                  <TableHead>Bonus</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.employeeId}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={row.isPresent}
                          onCheckedChange={(checked) =>
                            updateRow(row.employeeId, {
                              isPresent: checked === true,
                            })
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          {row.isPresent ? "Yes" : "No"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        className="max-w-[140px]"
                        value={
                          row.bonusAmount === 0 ? "" : String(row.bonusAmount)
                        }
                        placeholder="0"
                        onChange={(e) =>
                          updateRow(row.employeeId, {
                            bonusAmount:
                              e.target.value === ""
                                ? 0
                                : Number(e.target.value),
                          })
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Button
            onClick={onSave}
            disabled={saving || !factoryId || rows.length === 0}
          >
            {saving ? "Saving…" : "Save Attendance"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
