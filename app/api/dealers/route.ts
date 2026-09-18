import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { dealerSchema } from "@/lib/validations";

async function requireAuth() {
  const session = await getSession();
  if (!session) return null;
  return session;
}

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const dealers = await prisma.dealer.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(dealers);
}

export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const parsed = dealerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const dealer = await prisma.dealer.create({
    data: {
      name: parsed.data.name.trim(),
      phone: parsed.data.phone?.trim() || null,
    },
  });
  return NextResponse.json(dealer, { status: 201 });
}
