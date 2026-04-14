"use client";

import { fetchMe, login } from "@api-hub/api-sdk";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { clearTokens, loadTokens, saveTokens } from "../../../lib/auth-store";
import { useI18n } from "../../../lib/ui-preferences";

const SEEDED_ACCOUNTS = [
  { username: "admin", labelKey: "login.account.admin" },
  { username: "editor", labelKey: "login.account.editor" },
  { username: "tester", labelKey: "login.account.tester" },
  { username: "viewer", labelKey: "login.account.viewer" }
] as const;

export function LoginForm() {
  const router = useRouter();
  const { t } = useI18n();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("123456");
  const [showPassword, setShowPassword] = useState(false);
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
      setError(submissionError instanceof Error ? submissionError.message : t("login.form.error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--console-text)]">{t("login.form.username")}</label>
        <input
          aria-label={t("login.form.username")}
          autoComplete="username"
          className="console-input w-full rounded-2xl px-4 py-3 text-[var(--console-text)] outline-none transition focus:border-[var(--app-accent-border)]"
          name="username"
          onChange={(event) => setUsername(event.target.value)}
          placeholder={t("login.form.usernamePlaceholder")}
          value={username}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--console-text)]">{t("login.form.password")}</label>
        <div className="relative">
          <input
            aria-label={t("login.form.password")}
            autoComplete="current-password"
            className="console-input w-full rounded-2xl px-4 py-3 pr-12 text-[var(--console-text)] outline-none transition focus:border-[var(--app-accent-border)]"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t("login.form.passwordPlaceholder")}
            type={showPassword ? "text" : "password"}
            value={password}
          />
          <button
            aria-label={showPassword ? t("login.form.hidePassword") : t("login.form.showPassword")}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-[var(--console-muted)] transition hover:bg-white/70 hover:text-[var(--console-text)] dark:hover:bg-white/10"
            onClick={() => setShowPassword((current) => !current)}
            type="button"
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-500 dark:text-rose-200">{error}</p> : null}

      <button
        className="gradient-bg w-full rounded-full px-4 py-3 font-medium text-white shadow-glow transition-fast hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? t("login.form.submitting") : t("login.form.submit")}
      </button>

      <div className="pt-2">
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--console-border)]" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[var(--console-card-elevated)] px-3 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-[var(--console-muted)]">
              {t("login.form.quickAccounts")}
            </span>
          </div>
        </div>
        <p className="mb-3 text-xs leading-6 text-[var(--console-muted)]">{t("login.form.quickAccountsHint")}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {SEEDED_ACCOUNTS.map((account) => {
            const accountLabel = t(account.labelKey);

            return (
              <button
                aria-label={t("login.form.useAccount", { role: accountLabel })}
                className="rounded-[1.2rem] border border-[var(--console-border)] bg-white/55 px-4 py-3 text-left transition hover:border-[var(--app-accent-border)] hover:bg-white/75 dark:bg-white/5 dark:hover:bg-white/10"
                key={account.username}
                onClick={() => {
                  setUsername(account.username);
                  setPassword("123456");
                  setError(null);
                }}
                type="button"
              >
                <p className="text-sm font-semibold text-[var(--console-text)]">{accountLabel}</p>
                <p className="mt-1 text-[0.65rem] uppercase tracking-[0.28em] text-[var(--console-muted)]">@{account.username}</p>
              </button>
            );
          })}
        </div>
      </div>
    </form>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M2.25 12s3.75-6 9.75-6 9.75 6 9.75 6-3.75 6-9.75 6-9.75-6-9.75-6Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M3 3 21 21M10.584 10.587A2.999 2.999 0 0 0 13.5 13.5m3.383 3.383A10.632 10.632 0 0 1 12 18c-6 0-9.75-6-9.75-6a18.09 18.09 0 0 1 4.38-4.785m3.198-1.63A10.87 10.87 0 0 1 12 6c6 0 9.75 6 9.75 6a18.162 18.162 0 0 1-2.927 3.755"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}
