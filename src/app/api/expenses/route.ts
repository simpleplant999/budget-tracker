import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { insertExpense, listExpenses } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const denied = await requireApiSession();
  if (denied) return denied;

  try {
    const expenses = await listExpenses();
    return NextResponse.json({ expenses });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load expenses.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await requireApiSession();
  if (denied) return denied;

  try {
    const body = (await request.json()) as {
      description?: unknown;
      amount?: unknown;
      remarks?: unknown;
    };

    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const amount = typeof body.amount === "number" ? body.amount : Number.NaN;
    const remarks = typeof body.remarks === "string" ? body.remarks.trim() : "";

    if (!description) {
      return NextResponse.json(
        { error: "Add a short description." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Enter an amount greater than 0." },
        { status: 400 },
      );
    }

    const expense = await insertExpense(
      description,
      Math.round(amount * 100) / 100,
      remarks,
    );
    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save expense.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
