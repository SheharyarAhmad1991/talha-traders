"use client";

import { useMemo, useState } from "react";
import { useForm, Controller, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { issueSchema } from "@/lib/validations";
import { filesToImageData, todayInputValue } from "@/lib/utils-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import { ImageUpload } from "@/components/forms/image-upload";
import { NotesWithVoice } from "@/components/forms/notes-with-voice";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  WorkerPendingBalance,
  FactoryStockPanel,
} from "@/components/forms/balance-panels";
import { useLanguage } from "@/lib/i18n/language-context";
import { optionLabel } from "@/lib/i18n/localize";
import { useFreshList, notifyDataChanged } from "@/lib/use-fresh-list";

type Option = { id: string; name: string; nameUr?: string | null; unit?: string };
type FormValues = z.infer<typeof issueSchema>;

const emptyIssueValues = (): FormValues => ({
  date: todayInputValue(),
  workerId: "",
  notes: "",
  lines: [{ rawMaterialId: "", quantity: undefined as unknown as number }],
});

export function IssueForm({
  workers: initialWorkers,
  materials: initialMaterials,
  initialFactoryStock,
}: {
  workers: Option[];
  materials: Option[];
  initialFactoryStock?: {
    rawMaterialId?: string;
    materialName: string;
    materialNameUr?: string | null;
    unit: string;
    quantity: number;
  }[];
}) {
  const { t, language } = useLanguage();
  const workers = useFreshList<Option>("/api/workers", initialWorkers);
  const materials = useFreshList<Option>("/api/materials", initialMaterials);
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const workerOptions = useMemo(
    () =>
      workers.map((w) => ({
        value: w.id,
        label: optionLabel(w, language),
      })),
    [workers, language]
  );
  const materialOptions = useMemo(
    () =>
      materials.map((m) => ({
        value: m.id,
        label: optionLabel(m, language),
      })),
    [materials, language]
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(issueSchema),
    defaultValues: emptyIssueValues(),
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines",
  });

  const workerId = useWatch({ control, name: "workerId" });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const imageData = await filesToImageData(imageFiles);
      const res = await fetch("/api/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, imageData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("failedToSave"));
      toast.success(
        `${t("materialIssued")} (${data.count || values.lines.length} ${t("itemsCount")})`
      );
      reset(emptyIssueValues());
      setImageFiles([]);
      try {
        sessionStorage.removeItem("umer:dashboard:v1");
        sessionStorage.setItem("umer:dash:force", "1");
      } catch {
        /* ignore */
      }
      notifyDataChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("failedToSave"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("issueTitle")}</CardTitle>
        <CardDescription>{t("issueDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">{t("date")}</Label>
              <Input id="date" type="date" {...register("date")} />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t("workerName")}</Label>
              <Controller
                control={control}
                name="workerId"
                render={({ field }) => (
                  <AppSelect
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    options={workerOptions}
                    placeholder={t("selectWorker")}
                  />
                )}
              />
              {errors.workerId && (
                <p className="text-sm text-destructive">
                  {errors.workerId.message}
                </p>
              )}
            </div>
          </div>

          <FactoryStockPanel initialData={initialFactoryStock} />

          {workerId ? <WorkerPendingBalance workerId={workerId} /> : null}

          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{t("materialsToIssue")}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    rawMaterialId: "",
                    quantity: undefined as unknown as number,
                  })
                }
              >
                <Plus data-icon="inline-start" />
                {t("addMaterial")}
              </Button>
            </div>

            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-3 rounded-md border bg-muted/20 p-3 md:grid-cols-[1fr_140px_auto]"
              >
                <div className="space-y-2">
                  <Label>{t("material")}</Label>
                  <Controller
                    control={control}
                    name={`lines.${index}.rawMaterialId`}
                    render={({ field: f }) => (
                      <AppSelect
                        value={f.value}
                        onValueChange={f.onChange}
                        options={materialOptions}
                        placeholder={t("selectMaterial")}
                      />
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("quantity")}</Label>
                  <Input
                    type="number"
                    step="any"
                    {...register(`lines.${index}.quantity`)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                    aria-label={t("removeLine")}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <NotesWithVoice value={field.value || ""} onChange={field.onChange} />
            )}
          />

          <ImageUpload value={imageFiles} onChange={setImageFiles} />

          <Button type="submit" disabled={loading}>
            {loading ? t("saving") : t("issueMaterial")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
