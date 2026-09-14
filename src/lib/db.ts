import { mkdir } from "node:fs/promises";
import path from "node:path";
import { createClient, type Client, type Row } from "@libsql/client";
import { type Expense } from "@/lib/budget";

const globalForDb = globalThis as typeof globalThis & {
  budgetDb?: Client;
  budgetDbReady?: Promise<void>;
};

function databaseUrl() {
  if (process.env.TURSO_DATABASE_URL) {
    return process.env.TURSO_DATABASE_URL;
  }

  if (process.env.VERCEL) {
    throw new Error(
      "File SQLite is not persistent on Vercel. Set TURSO_DATABASE_URL (and TURSO_AUTH_TOKEN) to use hosted SQLite.",
    );
  }

  return `file:${path.join(process.cwd(), "data", "budget.db")}`;
}

async function createDb(): Promise<Client> {
  const url = databaseUrl();

  if (url.startsWith("file:")) {
    await mkdir(path.join(process.cwd(), "data"), { recursive: true });
  }

  return createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}

async function migrate(db: Client) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      remarks TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    )
  `);
}

export async function getDb() {
  if (!globalForDb.budgetDb) {
    globalForDb.budgetDb = await createDb();
  }

  if (!globalForDb.budgetDbReady) {
    globalForDb.budgetDbReady = migrate(globalForDb.budgetDb);
  }

  await globalForDb.budgetDbReady;
  return globalForDb.budgetDb;
}

export function rowToExpense(row: Row): Expense {
  return {
    id: String(row.id),
    description: String(row.description),
    amount: Number(row.amount),
    remarks: String(row.remarks ?? ""),
    createdAt: String(row.created_at),
  };
}

export async function listExpenses(): Promise<Expense[]> {
  const db = await getDb();
  const result = await db.execute(
    "SELECT id, description, amount, remarks, created_at FROM expenses ORDER BY created_at DESC",
  );
  return result.rows.map(rowToExpense);
}

export async function insertExpense(
  description: string,
  amount: number,
  remarks: string,
): Promise<Expense> {
  const expense: Expense = {
    id: crypto.randomUUID(),
    description,
    amount,
    remarks,
    createdAt: new Date().toISOString(),
  };

  const db = await getDb();
  await db.execute({
    sql: `
      INSERT INTO expenses (id, description, amount, remarks, created_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    args: [
      expense.id,
      expense.description,
      expense.amount,
      expense.remarks,
      expense.createdAt,
    ],
  });

  return expense;
}

export async function deleteExpense(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.execute({
    sql: "DELETE FROM expenses WHERE id = ?",
    args: [id],
  });
  return Number(result.rowsAffected ?? 0) > 0;
}
