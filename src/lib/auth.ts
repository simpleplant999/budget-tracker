import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, readSession } from "@/lib/auth-session";

export {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  readSession,
  sessionCookieOptions,
} from "@/lib/auth-session";

export function authConfigured() {
  return Boolean(
    process.env.AUTH_USERNAME &&
      process.env.AUTH_PASSWORD &&
      process.env.AUTH_SECRET,
  );
}

async function secretsEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const a = new Uint8Array(leftHash);
  const b = new Uint8Array(rightHash);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function verifyCredentials(username: string, password: string) {
  const expectedUser = process.env.AUTH_USERNAME ?? "";
  const expectedPass = process.env.AUTH_PASSWORD ?? "";
  if (!expectedUser || !expectedPass) return false;

  const userOk = await secretsEqual(username.trim(), expectedUser);
  const passOk = await secretsEqual(password, expectedPass);
  return userOk && passOk;
}

export async function requireApiSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = await readSession(token);
  if (!user) {
    return NextResponse.json({ error: "Please log in." }, { status: 401 });
  }
  return null;
}
