import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BudgetTracker } from "@/components/BudgetTracker";
import { SESSION_COOKIE, readSession } from "@/lib/auth-session";

export default async function Home() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = await readSession(token);
  if (!user) {
    redirect("/login");
  }

  return <BudgetTracker />;
}
