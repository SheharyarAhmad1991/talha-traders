import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const dealerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  nameUr: z.string().optional(),
  phone: z.string().optional(),
});

export const workerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  nameUr: z.string().optional(),
  phone: z.string().optional(),
});

export const rawMaterialSchema = z.object({
  name: z.string().min(1, "Name is required"),
  nameUr: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
});

export const finishedProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  nameUr: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
});

const purchaseLineSchema = z.object({
  rawMaterialId: z.string().min(1, "Material is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  amountPaid: z.coerce
    .number({
      required_error: "Amount paid is required",
      invalid_type_error: "Amount paid is required",
    })
    .min(0, "Amount cannot be negative"),
});

export const purchaseSchema = z
  .object({
    date: z.string().min(1, "Date is required"),
    dealerId: z.string().min(1, "Dealer is required"),
    sendTo: z.enum(["FACTORY", "WORKER"]),
    workerId: z.string().optional(),
    notes: z.string().optional(),
    imageData: z.string().optional(),
    lines: z.array(purchaseLineSchema).min(1, "Add at least one material"),
  })
  .superRefine((data, ctx) => {
    if (data.sendTo === "WORKER" && !data.workerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Moulder is required when Send To is Moulder",
        path: ["workerId"],
      });
    }
  });

const issueLineSchema = z.object({
  rawMaterialId: z.string().min(1, "Material is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
});

export const issueSchema = z.object({
  date: z.string().min(1, "Date is required"),
  workerId: z.string().min(1, "Moulder is required"),
  notes: z.string().optional(),
  imageData: z.string().optional(),
  lines: z.array(issueLineSchema).min(1, "Add at least one material"),
});

const receiveProductLineSchema = z.object({
  finishedProductId: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
});

const receiveMaterialLineSchema = z.object({
  rawMaterialId: z.string().min(1, "Material is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
});

export const receiveSchema = z.object({
  date: z.string().min(1, "Date is required"),
  workerId: z.string().min(1, "Moulder is required"),
  mazdooriPaid: z.coerce.number().min(0, "Mazdoori cannot be negative"),
  notes: z.string().optional(),
  imageData: z.string().optional(),
  products: z
    .array(receiveProductLineSchema)
    .min(1, "Add at least one finished product"),
  materialsConsumed: z
    .array(receiveMaterialLineSchema)
    .min(1, "Add at least one material to deduct"),
});

export const statementFilterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  type: z
    .enum(["ALL", "PURCHASE", "ISSUE", "RECEIVE", "DEDUCT"])
    .default("ALL"),
});

export const factoryDeductSchema = z.object({
  date: z.string().min(1, "Date is required"),
  rawMaterialId: z.string().min(1, "Material is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  notes: z.string().optional(),
});

// --- HR & Payroll ---

export const hrFactorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  nameUr: z.string().optional(),
});

export const hrEmployeeSchema = z.object({
  name: z.string().min(1, "Employee name is required"),
  nameUr: z.string().optional(),
  factoryId: z.string().min(1, "Factory is required"),
  salaryType: z.enum(["DAILY", "MONTHLY"]),
  salaryAmount: z.coerce.number().positive("Salary amount must be greater than 0"),
});

export const hrAttendanceSaveSchema = z.object({
  date: z.string().min(1, "Date is required"),
  factoryId: z.string().min(1, "Factory is required"),
  rows: z
    .array(
      z.object({
        employeeId: z.string().min(1),
        isPresent: z.boolean(),
        bonusAmount: z.coerce.number().min(0).default(0),
      })
    )
    .min(1, "No employees to save"),
});

export const hrSalaryFilterSchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  factoryId: z.string().min(1, "Factory is required"),
});
