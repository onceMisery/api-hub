"use client";

import { fetchMe, login } from "@api-hub/api-sdk";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { clearTokens, loadTokens, saveTokens } from "../../../lib/auth-store";

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
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Username</span>
        <input
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
