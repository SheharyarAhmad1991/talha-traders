"use client";

import { useMemo, useState } from "react";
import { useForm, Controller, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { purchaseSchema } from "@/lib/validations";
import { fileToBase64, todayInputValue } from "@/lib/utils-form";
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

type Option = { id: string; name: string; unit?: string };
type FormValues = z.infer<typeof purchaseSchema>;

export function PurchaseForm({
  dealers,
  materials,
  workers,
}: {
  dealers: Option[];
  materials: Option[];
  workers: Option[];
}) {
  const { t } = useLanguage();
  const sendToOptions = useMemo(
    () => [
      { value: "FACTORY", label: t("factory") },
      { value: "WORKER", label: t("worker") },
    ],
    [t]
  );
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const dealerOptions = useMemo(
    () => dealers.map((d) => ({ value: d.id, label: d.name })),
    [dealers]
  );
  const materialOptions = useMemo(
    () =>
      materials.map((m) => ({
        value: m.id,
        label: m.unit ? `${m.name} (${m.unit})` : m.name,
      })),
    [materials]
  );
  const workerOptions = useMemo(
    () => workers.map((w) => ({ value: w.id, label: w.name })),
    [workers]
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      date: todayInputValue(),
      dealerId: "",
      sendTo: "FACTORY",
      workerId: "",
      notes: "",
      lines: [{ rawMaterialId: "", quantity: undefined as unknown as number, amountPaid: undefined as unknown as number }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines",
  });

  const sendTo = useWatch({ control, name: "sendTo" });
  const workerId = useWatch({ control, name: "workerId" });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const imageData = await fileToBase64(imageFile);
      const res = await fetch("/api/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, imageData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      toast.success(`Purchase recorded (${data.count || values.lines.length} items)`);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("purchaseTitle")}</CardTitle>
        <CardDescription>
          Buy multiple materials from one dealer. Send all to factory or directly
          to a worker.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" {...register("date")} />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Dealer Name</Label>
              <Controller
                control={control}
                name="dealerId"
                render={({ field }) => (
                  <AppSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    options={dealerOptions}
                    placeholder="Select dealer"
                  />
                )}
              />
              {errors.dealerId && (
                <p className="text-sm text-destructive">
                  {errors.dealerId.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Send To</Label>
              <Controller
                control={control}
                name="sendTo"
                render={({ field }) => (
                  <AppSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    options={sendToOptions}
                    placeholder="Select destination"
                  />
                )}
              />
            </div>

            {sendTo === "WORKER" && (
              <div className="space-y-2">
                <Label>Worker</Label>
                <Controller
                  control={control}
                  name="workerId"
                  render={({ field }) => (
                    <AppSelect
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      options={workerOptions}
                      placeholder="Select worker"
                    />
                  )}
                />
                {errors.workerId && (
                  <p className="text-sm text-destructive">
                    {errors.workerId.message}
                  </p>
                )}
              </div>
            )}
          </div>

          {sendTo === "WORKER" && workerId ? (
            <WorkerPendingBalance workerId={workerId} />
          ) : null}

          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Materials</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    rawMaterialId: "",
                    quantity: undefined as unknown as number,
                    amountPaid: undefined as unknown as number,
                  })
                }
              >
                <Plus data-icon="inline-start" />
                Add Material
              </Button>
            </div>

            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-3 rounded-md border bg-muted/20 p-3 md:grid-cols-[1fr_120px_120px_auto]"
              >
                <div className="space-y-2">
                  <Label>Material</Label>
                  <Controller
                    control={control}
                    name={`lines.${index}.rawMaterialId`}
                    render={({ field: f }) => (
                      <AppSelect
                        value={f.value}
                        onValueChange={f.onChange}
                        options={materialOptions}
                        placeholder="Select material"
                      />
                    )}
                  />
                  {errors.lines?.[index]?.rawMaterialId && (
                    <p className="text-sm text-destructive">
                      {errors.lines[index]?.rawMaterialId?.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    step="any"
                    {...register(`lines.${index}.quantity`)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount Paid</Label>
                  <Input
                    type="number"
                    step="any"
                    {...register(`lines.${index}.amountPaid`, {
                      valueAsNumber: true,
                    })}
                  />
                  {errors.lines?.[index]?.amountPaid && (
                    <p className="text-sm text-destructive">
                      {errors.lines[index]?.amountPaid?.message}
                    </p>
                  )}
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                    aria-label="Remove line"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
            {errors.lines?.root && (
              <p className="text-sm text-destructive">{errors.lines.root.message}</p>
            )}
            {typeof errors.lines?.message === "string" && (
              <p className="text-sm text-destructive">{errors.lines.message}</p>
            )}
          </div>

          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <NotesWithVoice value={field.value || ""} onChange={field.onChange} />
            )}
          />

          <ImageUpload value={imageFile} onChange={setImageFile} />

          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Purchase"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
