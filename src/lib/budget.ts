export function sanitizeAmountInput(value: string): string {
  const digitsOnly = value.replace(/[^\d.]/g, "");
  const firstDot = digitsOnly.indexOf(".");
  if (firstDot === -1) return digitsOnly;

  const whole = digitsOnly.slice(0, firstDot).replace(/\./g, "");
  const fraction = digitsOnly
    .slice(firstDot + 1)
    .replace(/\./g, "")
    .slice(0, 2);
  return `${whole}.${fraction}`;
}

export type Expense = {
  id: string;
  description: string;
  amount: number;
  remarks: string;
  createdAt: string;
};

export type YearMonth = {
  year: number;
  month: number;
};

export type MonthSummary = {
  year: number;
  month: number;
  label: string;
  total: number;
  count: number;
};

export function currentYearMonth(now = new Date()): YearMonth {
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function shiftYearMonth(value: YearMonth, delta: number): YearMonth {
  const date = new Date(value.year, value.month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function isSameYearMonth(a: YearMonth, b: YearMonth): boolean {
  return a.year === b.year && a.month === b.month;
}

export function isFutureYearMonth(value: YearMonth, now = new Date()): boolean {
  const current = currentYearMonth(now);
  return (
    value.year > current.year ||
    (value.year === current.year && value.month > current.month)
  );
}

export function endOfToday(now = new Date()): Date {
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );
}

export function monthRange(value: YearMonth, now = new Date()) {
  const start = new Date(value.year, value.month, 1, 0, 0, 0, 0);
  const isCurrent = isSameYearMonth(value, currentYearMonth(now));
  const end = isCurrent
    ? endOfToday(now)
    : new Date(value.year, value.month + 1, 0, 23, 59, 59, 999);
  return { start, end, isCurrent };
}

export function filterByMonth(
  expenses: Expense[],
  value: YearMonth,
  now = new Date(),
): Expense[] {
  const { start, end } = monthRange(value, now);
  return expenses
    .filter((expense) => {
      const date = new Date(expense.createdAt);
      if (Number.isNaN(date.getTime())) return false;
      return date >= start && date <= end;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function sumAmounts(expenses: Expense[]): number {
  return expenses.reduce((total, expense) => total + expense.amount, 0);
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
}

export function formatMonthLabel(date = new Date()): string {
  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatYearMonth(value: YearMonth): string {
  return formatMonthLabel(new Date(value.year, value.month, 1));
}

export function yearMonthInputValue(value: YearMonth): string {
  return `${value.year}-${String(value.month + 1).padStart(2, "0")}`;
}

export function parseYearMonthInput(value: string): YearMonth | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  if (month < 0 || month > 11) return null;
  return { year, month };
}

export function formatRangeLabel(value: YearMonth, now = new Date()): string {
  const { start, end, isCurrent } = monthRange(value, now);
  const formatter = new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
  });
  if (isCurrent) {
    return `${formatter.format(start)} – ${formatter.format(now)}`;
  }
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export function formatAddedDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(isoDate));
}

export function summarizeByMonth(expenses: Expense[]): MonthSummary[] {
  const groups = new Map<string, MonthSummary>();

  for (const expense of expenses) {
    const date = new Date(expense.createdAt);
    if (Number.isNaN(date.getTime())) continue;

    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const existing = groups.get(key);

    if (existing) {
      existing.total += expense.amount;
      existing.count += 1;
      continue;
    }

    groups.set(key, {
      year: date.getFullYear(),
      month: date.getMonth(),
      label: formatMonthLabel(date),
      total: expense.amount,
      count: 1,
    });
  }

  return [...groups.values()].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
}
