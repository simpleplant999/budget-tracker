import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { deleteExpense } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const denied = await requireApiSession();
  if (denied) return denied;

  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Missing item id." }, { status: 400 });
    }

    const deleted = await deleteExpense(id);
    if (!deleted) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete expense.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
