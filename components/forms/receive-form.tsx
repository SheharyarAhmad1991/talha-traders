"use client";

import { useMemo, useState } from "react";
import { useForm, Controller, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { receiveSchema } from "@/lib/validations";
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

type Option = { id: string; name: string; unit?: string };
type FormValues = z.infer<typeof receiveSchema>;

export function ReceiveForm({
  workers,
  products,
  materials,
}: {
  workers: Option[];
  products: Option[];
  materials: Option[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const workerOptions = useMemo(
    () => workers.map((w) => ({ value: w.id, label: w.name })),
    [workers]
  );
  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: p.id,
        label: p.unit ? `${p.name} (${p.unit})` : p.name,
      })),
    [products]
  );
  const materialOptions = useMemo(
    () =>
      materials.map((m) => ({
        value: m.id,
        label: m.unit ? `${m.name} (${m.unit})` : m.name,
      })),
    [materials]
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(receiveSchema),
    defaultValues: {
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
    },
  });

  const productFields = useFieldArray({ control, name: "products" });
  const materialFields = useFieldArray({ control, name: "materialsConsumed" });

  const workerId = useWatch({ control, name: "workerId" });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const imageData = await fileToBase64(imageFile);
      const res = await fetch("/api/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, imageData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      toast.success(
        `Products received (${data.count || values.products.length} items)`
      );
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
        <CardTitle>Receive Product (Labor se Shop)</CardTitle>
        <CardDescription>
          Receive multiple finished products and deduct multiple raw materials
          from the worker.
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
              <Label>Worker Name</Label>
              <Controller
                control={control}
                name="workerId"
                render={({ field }) => (
                  <AppSelect
                    value={field.value}
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

            <div className="space-y-2">
              <Label htmlFor="mazdooriPaid">Mazdoori Paid</Label>
              <Input
                id="mazdooriPaid"
                type="number"
                step="any"
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
              <p className="text-sm font-medium">Finished Products Received</p>
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
                Add Product
              </Button>
            </div>
            {productFields.fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-3 rounded-md border bg-muted/20 p-3 md:grid-cols-[1fr_140px_auto]"
              >
                <div className="space-y-2">
                  <Label>Product</Label>
                  <Controller
                    control={control}
                    name={`products.${index}.finishedProductId`}
                    render={({ field: f }) => (
                      <AppSelect
                        value={f.value}
                        onValueChange={f.onChange}
                        options={productOptions}
                        placeholder="Select product"
                      />
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    step="any"
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
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Raw Materials Consumed</p>
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
                Add Material
              </Button>
            </div>
            {materialFields.fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-3 rounded-md border bg-muted/20 p-3 md:grid-cols-[1fr_140px_auto]"
              >
                <div className="space-y-2">
                  <Label>Material to Deduct</Label>
                  <Controller
                    control={control}
                    name={`materialsConsumed.${index}.rawMaterialId`}
                    render={({ field: f }) => (
                      <AppSelect
                        value={f.value}
                        onValueChange={f.onChange}
                        options={materialOptions}
                        placeholder="Select material"
                      />
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    step="any"
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

          <ImageUpload value={imageFile} onChange={setImageFile} />

          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Receive Product"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
