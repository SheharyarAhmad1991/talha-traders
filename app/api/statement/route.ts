import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { statementFilterSchema } from "@/lib/validations";
import type { Prisma, TransactionType } from "@prisma/client";

export async function GET(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = statementFilterSchema.safeParse({
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    type: searchParams.get("type") || "ALL",
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid filters" }, { status: 400 });
  }

  const { startDate, endDate, type } = parsed.data;
  const where: Prisma.TransactionLogWhereInput = {};

  if (type !== "ALL") {
    where.type = type as TransactionType;
  }

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.date.lte = end;
    }
  }

  const logs = await prisma.transactionLog.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(logs);
}
