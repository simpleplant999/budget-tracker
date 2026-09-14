"use client";

import { FormEvent, useState } from "react";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Wrong username or password.");
        return;
      }

      window.location.assign("/");
    } catch {
      setError("Failed to log in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-4 py-10 sm:px-6">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
        Budget tracker
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
        Log in
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Only you can open this account.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 rounded-3xl border border-slate-200 bg-white px-5 py-5"
      >
        <label className="block text-sm font-medium text-slate-700">
          Username
          <input
            autoFocus
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-base text-slate-900 outline-none ring-slate-400 placeholder:text-slate-400 focus:border-slate-500 focus:bg-white focus:ring-2"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-base text-slate-900 outline-none ring-slate-400 placeholder:text-slate-400 focus:border-slate-500 focus:bg-white focus:ring-2"
          />
        </label>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>
    </div>
  );
}
