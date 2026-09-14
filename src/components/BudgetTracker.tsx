"use client";

import { FormEvent, useMemo, useState } from "react";
import { useBudgetStore } from "@/data/sqlite-store";
import {
  type Expense,
  type YearMonth,
  currentYearMonth,
  filterByMonth,
  formatAddedDate,
  formatMoney,
  formatRangeLabel,
  formatYearMonth,
  isFutureYearMonth,
  isSameYearMonth,
  parseYearMonthInput,
  shiftYearMonth,
  sumAmounts,
  sanitizeAmountInput,
  summarizeByMonth,
  yearMonthInputValue,
} from "@/lib/budget";

type Tab = "items" | "summary";

export function BudgetTracker() {
  const { expenses, addExpense, deleteExpense, ready, loadError } =
    useBudgetStore();
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [tab, setTab] = useState<Tab>("items");
  const [selectedMonth, setSelectedMonth] = useState<YearMonth>(() =>
    currentYearMonth(),
  );
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [listError, setListError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null);

  const thisMonth = currentYearMonth();
  const visible = useMemo(
    () => filterByMonth(expenses, selectedMonth),
    [expenses, selectedMonth],
  );
  const total = useMemo(() => sumAmounts(visible), [visible]);
  const summaries = useMemo(() => summarizeByMonth(expenses), [expenses]);
  const allTimeTotal = useMemo(() => sumAmounts(expenses), [expenses]);
  const canGoNext = !isSameYearMonth(selectedMonth, thisMonth);

  function resetForm() {
    setDescription("");
    setAmount("");
    setRemarks("");
    setError("");
  }

  function closeSheet() {
    setOpen(false);
    resetForm();
  }

  function selectMonth(next: YearMonth) {
    if (isFutureYearMonth(next)) return;
    setSelectedMonth(next);
  }

  function openMonthFromSummary(year: number, month: number) {
    setSelectedMonth({ year, month });
    setTab("items");
  }

  function handleMonthInput(value: string) {
    const parsed = parseYearMonthInput(value);
    if (!parsed) return;
    selectMonth(parsed);
  }

  function closeDeleteConfirm() {
    if (deletingId) return;
    setPendingDelete(null);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeletingId(pendingDelete.id);
    setListError("");
    try {
      await deleteExpense(pendingDelete.id);
      setPendingDelete(null);
    } catch (deleteError) {
      setListError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete item.",
      );
    } finally {
      setDeletingId("");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = description.trim();
    const parsed = Number.parseFloat(amount);

    if (!trimmed) {
      setError("Add a short description.");
      return;
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }

    setSaving(true);
    try {
      await addExpense(trimmed, Math.round(parsed * 100) / 100, remarks);
      setSelectedMonth(currentYearMonth());
      setTab("items");
      closeSheet();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save item.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pt-6 sm:px-6 ${
        tab === "items" ? "pb-28" : "pb-8"
      }`}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Budget tracker
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            {tab === "items" ? formatYearMonth(selectedMonth) : "Monthly summary"}
          </h1>
        </div>
        <button
          type="button"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.assign("/login");
          }}
          className="mt-1 text-sm font-medium text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline"
        >
          Log out
        </button>
      </header>

      {loadError ? (
        <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </p>
      ) : null}

      {!ready ? (
        <p className="mb-4 text-sm text-slate-500">Loading items…</p>
      ) : null}

      <div className="mb-5 grid grid-cols-2 rounded-2xl bg-slate-200/70 p-1">
        <button
          type="button"
          onClick={() => setTab("items")}
          className={`h-10 rounded-xl text-sm font-semibold ${
            tab === "items" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
          }`}
        >
          Items
        </button>
        <button
          type="button"
          onClick={() => setTab("summary")}
          className={`h-10 rounded-xl text-sm font-semibold ${
            tab === "summary"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500"
          }`}
        >
          Summary
        </button>
      </div>

      {tab === "items" ? (
        <>
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => selectMonth(shiftYearMonth(selectedMonth, -1))}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg text-slate-900"
                aria-label="Previous month"
              >
                ‹
              </button>
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Filter by month</span>
                <input
                  type="month"
                  max={yearMonthInputValue(thisMonth)}
                  value={yearMonthInputValue(selectedMonth)}
                  onChange={(event) => handleMonthInput(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none focus:border-slate-400"
                />
              </label>
              <button
                type="button"
                onClick={() => selectMonth(shiftYearMonth(selectedMonth, 1))}
                disabled={!canGoNext}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg text-slate-900 disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Next month"
              >
                ›
              </button>
            </div>
            {!isSameYearMonth(selectedMonth, thisMonth) ? (
              <button
                type="button"
                onClick={() => setSelectedMonth(thisMonth)}
                className="mt-2 w-full py-1 text-center text-xs font-medium text-slate-500"
              >
                Jump to this month
              </button>
            ) : null}
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5">
            <p className="text-sm text-slate-500">Total for this filter</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums text-slate-900">
              {formatMoney(total)}
            </p>
            <p className="mt-3 text-sm text-slate-500">
              {formatRangeLabel(selectedMonth)} · {visible.length}{" "}
              {visible.length === 1 ? "item" : "items"}
            </p>
          </section>

          <section className="mt-6 flex min-h-0 flex-1 flex-col">
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-900">
                Added items
              </h2>
              <p className="text-xs text-slate-500">Newest first</p>
            </div>

            {listError ? (
              <p className="mb-3 text-sm text-red-600">{listError}</p>
            ) : null}

            {visible.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
                No items in this month. Tap Add to start tracking.
              </div>
            ) : (
              <ul className="space-y-2">
                {visible.map((expense) => (
                  <li
                    key={expense.id}
                    className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {expense.description}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatAddedDate(expense.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <p className="text-sm font-semibold tabular-nums text-slate-900">
                          {formatMoney(expense.amount)}
                        </p>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(expense)}
                          className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {expense.remarks ? (
                      <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-500">
                        {expense.remarks}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <section>
          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-5">
            <p className="text-sm text-slate-500">All months</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums text-slate-900">
              {formatMoney(allTimeTotal)}
            </p>
            <p className="mt-3 text-sm text-slate-500">
              {summaries.length} {summaries.length === 1 ? "month" : "months"} ·{" "}
              {expenses.length} {expenses.length === 1 ? "item" : "items"}
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {summaries.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">
                No months to summarize yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-3 font-medium">Month</th>
                      <th className="px-3 py-3 font-medium">Items</th>
                      <th className="px-3 py-3 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaries.map((summary) => (
                      <tr key={`${summary.year}-${summary.month}`}>
                        <td colSpan={3} className="p-0">
                          <button
                            type="button"
                            onClick={() =>
                              openMonthFromSummary(summary.year, summary.month)
                            }
                            className="grid w-full grid-cols-[1fr_auto_auto] items-center border-t border-slate-100 px-3 py-3 text-left text-slate-700"
                          >
                            <span className="font-medium text-slate-900">
                              {summary.label}
                            </span>
                            <span className="px-6 text-slate-500">
                              {summary.count}
                            </span>
                            <span className="text-right tabular-nums">
                              {formatMoney(summary.total)}
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-slate-500">
            Tap a month to open it in Items.
          </p>
        </section>
      )}

      {tab === "items" ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-lg px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="pointer-events-auto flex h-14 w-full items-center justify-center rounded-2xl bg-slate-900 text-base font-semibold text-white shadow-[0_10px_28px_-12px_rgba(15,23,42,0.45)] transition active:scale-[0.99]"
          >
            Add
          </button>
        </div>
      ) : null}

      {pendingDelete ? (
        <div className="fixed inset-0 z-30 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Close delete confirmation"
            className="absolute inset-0 bg-slate-900/35"
            onClick={closeDeleteConfirm}
          />
          <div className="relative z-10 w-full max-w-lg rounded-t-3xl border border-slate-200 bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl sm:mx-4 sm:rounded-3xl sm:pb-5">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 sm:hidden" />
            <h3 className="text-lg font-semibold text-slate-900">Delete item?</h3>
            <p className="mt-1 text-sm text-slate-500">
              This will remove{" "}
              <span className="font-medium text-slate-800">
                {pendingDelete.description}
              </span>{" "}
              ({formatMoney(pendingDelete.amount)}) from the list.
            </p>
            {listError ? (
              <p className="mt-3 text-sm text-red-600">{listError}</p>
            ) : null}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                disabled={Boolean(deletingId)}
                className="h-12 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={Boolean(deletingId)}
                className="h-12 rounded-xl bg-red-500 text-sm font-semibold text-white disabled:opacity-60"
              >
                {deletingId ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-30 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Close add form"
            className="absolute inset-0 bg-slate-900/35"
            onClick={closeSheet}
          />
          <form
            onSubmit={handleSubmit}
            className="relative z-10 max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-slate-200 bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl sm:mx-4 sm:rounded-3xl sm:pb-5"
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 sm:hidden" />
            <h3 className="text-lg font-semibold text-slate-900">Add item</h3>
            <p className="mt-1 text-sm text-slate-500">
              Date is set to now. After saving, the list jumps to this month.
            </p>

            <label className="mt-5 block text-sm font-medium text-slate-700">
              Description
              <input
                autoFocus
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="e.g. Lunch, jeep, groceries"
                className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-base text-slate-900 outline-none ring-slate-400 placeholder:text-slate-400 focus:border-slate-500 focus:bg-white focus:ring-2"
              />
            </label>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              Amount
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.]?[0-9]*"
                autoComplete="off"
                value={amount}
                onChange={(event) =>
                  setAmount(sanitizeAmountInput(event.target.value))
                }
                placeholder="0.00"
                className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-base text-slate-900 outline-none ring-slate-400 placeholder:text-slate-400 focus:border-slate-500 focus:bg-white focus:ring-2"
              />
            </label>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              Remarks
              <textarea
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                placeholder="Optional note"
                rows={3}
                className="mt-1.5 w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-base text-slate-900 outline-none ring-slate-400 placeholder:text-slate-400 focus:border-slate-500 focus:bg-white focus:ring-2"
              />
            </label>

            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={closeSheet}
                className="h-12 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-12 rounded-xl bg-slate-900 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
