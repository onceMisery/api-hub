"use client";

import { fetchMe, login } from "@api-hub/api-sdk";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { clearTokens, loadTokens, saveTokens } from "../../../lib/auth-store";

const SEEDED_ACCOUNTS = [
  { username: "admin", label: "Admin", description: "Full project admin workspace access" },
  { username: "editor", label: "Editor", description: "Writable endpoint editing without member admin" },
  { username: "tester", label: "Tester", description: "Read-only docs with debug execution access" },
  { username: "viewer", label: "Viewer", description: "Read-only project browsing" }
] as const;

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const { accessToken, refreshToken } = loadTokens();
    if (!accessToken && !refreshToken) {
      return;
    }

    let isMounted = true;

    void fetchMe()
      .then(() => {
        if (isMounted) {
          router.replace("/console/projects");
        }
      })
      .catch(() => {
        if (isMounted) {
          clearTokens();
        }
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await login({ username, password });
      saveTokens(response.data.accessToken, response.data.refreshToken);
      router.push("/console/projects");
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-3 rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Seeded Accounts</p>
          <p className="mt-2 text-sm text-slate-600">Use these shortcuts to verify project roles locally. Default password is `123456`.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {SEEDED_ACCOUNTS.map((account) => (
            <button
              aria-label={`Use ${account.username} account`}
              className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
              key={account.username}
              onClick={() => {
                setUsername(account.username);
                setPassword("123456");
                setError(null);
              }}
              type="button"
            >
              <p className="text-sm font-semibold text-slate-900">{account.label}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">@{account.username}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{account.description}</p>
            </button>
          ))}
        </div>
      </div>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Username</span>
        <input
          aria-label="Username"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
          name="username"
          onChange={(event) => setUsername(event.target.value)}
          placeholder="admin"
          value={username}
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Password</span>
        <input
          aria-label="Password"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="123456"
          type="password"
          value={password}
        />
      </label>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <button
        className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Signing in..." : "Enter Console"}
      </button>
    </form>
  );
}
