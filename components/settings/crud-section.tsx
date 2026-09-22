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
import { useLanguage } from "@/lib/i18n/language-context";
import { localizedName } from "@/lib/i18n/localize";

type CrudItem = {
  id: string;
  name: string;
  nameUr?: string | null;
  phone?: string | null;
  unit?: string | null;
};

type FieldConfig =
  | { key: "name"; label: string; type: "text" }
  | { key: "nameUr"; label: string; type: "text" }
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
  const { t, language } = useLanguage();
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
        setFormError(`${field.label} ${t("fieldRequired")}`);
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
        throw new Error(data.error || t("somethingWrong"));
      }

      if (editing) {
        setItems((prev) => prev.map((i) => (i.id === editing.id ? data : i)));
        toast.success(t("updatedSuccess"));
      } else {
        setItems((prev) => [data, ...prev]);
        toast.success(t("createdSuccess"));
      }

      setOpen(false);
      await reloadItems();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("requestFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    try {
      const res = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("failedToDelete"));
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success(t("deletedSuccess"));
      await reloadItems();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("failedToDelete"));
    }
  }

  function cellValue(item: CrudItem, key: FieldConfig["key"]) {
    if (key === "name") {
      return localizedName(item, language) || "—";
    }
    return (item[key] as string) || "—";
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
          {t("add")}
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
                <TableHead className="w-28 text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={fields.length + 1}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {t("noRecordsYet")}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    {fields.map((f) => (
                      <TableCell key={f.key}>{cellValue(item, f.key)}</TableCell>
                    ))}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(item)}
                          aria-label={t("edit")}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onDelete(item.id)}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? `${t("edit")} ${title}` : `${t("add")} ${title}`}
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
                  placeholder={
                    field.key === "nameUr" ? t("nameUrHint") : field.label
                  }
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
                {t("cancel")}
              </Button>
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
