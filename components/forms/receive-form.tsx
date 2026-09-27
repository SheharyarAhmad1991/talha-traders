"use client";

import { useMemo, useState } from "react";
import { useForm, Controller, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { receiveSchema } from "@/lib/validations";
import { filesToImageData, todayInputValue } from "@/lib/utils-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import { ImageUpload } from "@/components/forms/image-upload";
import { NotesWithVoice } from "@/components/forms/notes-with-voice";
import { WorkerPendingBalance } from "@/components/forms/balance-panels";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLanguage } from "@/lib/i18n/language-context";
import { optionLabel } from "@/lib/i18n/localize";
import { useFreshList, notifyDataChanged } from "@/lib/use-fresh-list";

type Option = { id: string; name: string; nameUr?: string | null; unit?: string };
type FormValues = z.infer<typeof receiveSchema>;

const emptyReceiveValues = (): FormValues => ({
  date: todayInputValue(),
  workerId: "",
  mazdooriPaid: undefined as unknown as number,
  notes: "",
  products: [
    {
      finishedProductId: "",
      quantity: undefined as unknown as number,
    },
  ],
  materialsConsumed: [
    {
      rawMaterialId: "",
      quantity: undefined as unknown as number,
    },
  ],
});

export function ReceiveForm({
  workers: initialWorkers,
  products: initialProducts,
  materials: initialMaterials,
}: {
  workers: Option[];
  products: Option[];
  materials: Option[];
}) {
  const { t, language } = useLanguage();
  const workers = useFreshList<Option>("/api/workers", initialWorkers);
  const products = useFreshList<Option>("/api/products", initialProducts);
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
  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: p.id,
        label: optionLabel(p, language),
      })),
    [products, language]
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
    resolver: zodResolver(receiveSchema),
    defaultValues: emptyReceiveValues(),
  });

  const productFields = useFieldArray({ control, name: "products" });
  const materialFields = useFieldArray({ control, name: "materialsConsumed" });

  const workerId = useWatch({ control, name: "workerId" });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const imageData = await filesToImageData(imageFiles);
      const res = await fetch("/api/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, imageData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("failedToSave"));
      toast.success(
        `${t("productsReceived")} (${data.count || values.products.length} ${t("itemsCount")})`
      );
      reset(emptyReceiveValues());
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
        <CardTitle>{t("receiveTitle")}</CardTitle>
        <CardDescription>{t("receiveDesc")}</CardDescription>
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
                    value={field.value}
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

            <div className="space-y-2">
              <Label htmlFor="mazdooriPaid">{t("mazdooriPaid")}</Label>
              <Input
                id="mazdooriPaid"
                type="number"
                step="any"
                min={0}
                {...register("mazdooriPaid")}
              />
              {errors.mazdooriPaid && (
                <p className="text-sm text-destructive">
                  {errors.mazdooriPaid.message}
                </p>
              )}
            </div>
          </div>

          {workerId ? <WorkerPendingBalance workerId={workerId} /> : null}

          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{t("finishedProductsReceived")}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  productFields.append({
                    finishedProductId: "",
                    quantity: undefined as unknown as number,
                  })
                }
              >
                <Plus data-icon="inline-start" />
                {t("addProduct")}
              </Button>
            </div>
            {productFields.fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-3 rounded-md border bg-muted/20 p-3 md:grid-cols-[1fr_140px_auto]"
              >
                <div className="space-y-2">
                  <Label>{t("product")}</Label>
                  <Controller
                    control={control}
                    name={`products.${index}.finishedProductId`}
                    render={({ field: f }) => (
                      <AppSelect
                        value={f.value}
                        onValueChange={f.onChange}
                        options={productOptions}
                        placeholder={t("selectProduct")}
                      />
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("quantity")}</Label>
                  <Input
                    type="number"
                    step="any"
                    min={0}
                    {...register(`products.${index}.quantity`)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={productFields.fields.length === 1}
                    onClick={() => productFields.remove(index)}
                    aria-label={t("removeLine")}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{t("rawMaterialsConsumed")}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  materialFields.append({
                    rawMaterialId: "",
                    quantity: undefined as unknown as number,
                  })
                }
              >
                <Plus data-icon="inline-start" />
                {t("addMaterial")}
              </Button>
            </div>
            {materialFields.fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-3 rounded-md border bg-muted/20 p-3 md:grid-cols-[1fr_140px_auto]"
              >
                <div className="space-y-2">
                  <Label>{t("materialToDeduct")}</Label>
                  <Controller
                    control={control}
                    name={`materialsConsumed.${index}.rawMaterialId`}
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
                    min={0}
                    {...register(`materialsConsumed.${index}.quantity`)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={materialFields.fields.length === 1}
                    onClick={() => materialFields.remove(index)}
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
            {loading ? t("saving") : t("receiveProduct")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
