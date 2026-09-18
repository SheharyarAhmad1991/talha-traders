"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type CrudItem = {
  id: string;
  name: string;
  phone?: string | null;
  unit?: string | null;
};

type FieldConfig =
  | { key: "name"; label: string; type: "text" }
  | { key: "phone"; label: string; type: "text" }
  | { key: "unit"; label: string; type: "text" };

type Props = {
  title: string;
  description: string;
  endpoint: string;
  items: CrudItem[];
  fields: FieldConfig[];
};

export function CrudSection({
  title,
  description,
  endpoint,
  items: initialItems,
  fields,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState<CrudItem[]>(initialItems);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CrudItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const reloadItems = useCallback(async () => {
    const res = await fetch(endpoint, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data)) {
      setItems(data);
    }
  }, [endpoint]);

  // Always load latest rows from the API (avoids stale empty table after save)
  useEffect(() => {
    void reloadItems();
  }, [reloadItems]);

  function openCreate() {
    setEditing(null);
    setFormError(null);
    const defaults: Record<string, string> = {};
    fields.forEach((f) => {
      defaults[f.key] = "";
    });
    setFormValues(defaults);
    setOpen(true);
  }

  function openEdit(item: CrudItem) {
    setEditing(item);
    setFormError(null);
    const defaults: Record<string, string> = {};
    fields.forEach((f) => {
      defaults[f.key] = (item[f.key] as string) || "";
    });
    setFormValues(defaults);
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    for (const field of fields) {
      if (
        (field.key === "name" || field.key === "unit") &&
        !formValues[field.key]?.trim()
      ) {
        setFormError(`${field.label} is required`);
        return;
      }
    }

    setLoading(true);
    try {
      const url = editing ? `${endpoint}/${editing.id}` : endpoint;
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValues),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      // Update table immediately, then reload from server for accuracy
      if (editing) {
        setItems((prev) => prev.map((i) => (i.id === editing.id ? data : i)));
        toast.success("Updated successfully");
      } else {
        setItems((prev) => [data, ...prev]);
        toast.success("Created successfully");
      }

      setOpen(false);
      await reloadItems();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this record?")) return;
    try {
      const res = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Deleted");
      await reloadItems();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus data-icon="inline-start" />
          Add
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {fields.map((f) => (
                  <TableHead key={f.key}>{f.label}</TableHead>
                ))}
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={fields.length + 1}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No records yet. Click Add to create one.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    {fields.map((f) => (
                      <TableCell key={f.key}>
                        {(item[f.key] as string) || "—"}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(item)}
                          aria-label="Edit"
                        >
                          <Pencil />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onDelete(item.id)}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit ${title}` : `Add ${title}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            {fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={`${title}-${field.key}`}>{field.label}</Label>
                <Input
                  id={`${title}-${field.key}`}
                  value={formValues[field.key] ?? ""}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                  placeholder={field.label}
                  autoComplete="off"
                />
              </div>
            ))}
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
