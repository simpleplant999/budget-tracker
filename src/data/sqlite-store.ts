"use client";

import { useCallback, useEffect, useState } from "react";
import { type Expense } from "@/lib/budget";

export function useBudgetStore() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch("/api/expenses");
    const data = (await response.json()) as {
      expenses?: Expense[];
      error?: string;
    };

    if (response.status === 401) {
      window.location.assign("/login");
      return;
    }

    if (!response.ok) {
      throw new Error(data.error ?? "Failed to load expenses.");
    }

    setExpenses(data.expenses ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;

    refresh()
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(
          error instanceof Error ? error.message : "Failed to load expenses.",
        );
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  async function addExpense(
    description: string,
    amount: number,
    remarks: string,
  ) {
    const response = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, amount, remarks }),
    });
    const data = (await response.json()) as { error?: string };

    if (response.status === 401) {
      window.location.assign("/login");
      return;
    }

    if (!response.ok) {
      throw new Error(data.error ?? "Failed to save expense.");
    }

    await refresh();
  }

  async function deleteExpense(id: string) {
    const response = await fetch(`/api/expenses/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const data = (await response.json()) as { error?: string };

    if (response.status === 401) {
      window.location.assign("/login");
      return;
    }

    if (!response.ok) {
      throw new Error(data.error ?? "Failed to delete expense.");
    }

    await refresh();
  }

  return { expenses, addExpense, deleteExpense, ready, loadError };
}
