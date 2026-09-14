import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const SESSION_COOKIE = "budget_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set.");
  }
  return new TextEncoder().encode(secret);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export async function createSessionToken(username: string) {
  return new SignJWT({ sub: username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function readSession(token: string | undefined) {
  if (!token || !process.env.AUTH_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

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
