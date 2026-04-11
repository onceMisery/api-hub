"use client";

import { fetchMe, logout } from "@api-hub/api-sdk";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { clearTokens, loadTokens } from "../../../lib/auth-store";
import { useAppPreferences } from "../../../lib/ui-preferences";

type SessionBarProps = {
  backHref?: Route;
};

export function SessionBar({ backHref }: SessionBarProps = {}) {
  const router = useRouter();
  const [session, setSession] = useState<{ displayName: string; username: string; email: string | null } | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { locale, setLocale, setTheme, theme, t } = useAppPreferences();

  useEffect(() => {
    const { accessToken, refreshToken } = loadTokens();
    if (!accessToken && !refreshToken) {
      clearTokens();
      router.replace("/login");
      return;
    }

    let isMounted = true;

    void fetchMe()
      .then((response) => {
        if (isMounted) {
          setSession({
            displayName: response.data.displayName || response.data.username,
            username: response.data.username,
            email: response.data.email
          });
        }
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        clearTokens();
        router.replace("/login");
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      await logout();
    } finally {
      clearTokens();
      router.replace("/login");
      setIsSigningOut(false);
    }
  }

  function handleThemeCycle() {
    if (theme === "system") {
      setTheme("dark");
      return;
    }

    if (theme === "dark") {
      setTheme("light");
      return;
    }

    setTheme("system");
  }

  const nextLocale = locale === "zh-CN" ? "en-US" : "zh-CN";
  const localeLabel = locale === "zh-CN" ? t("session.changeToEnglish") : t("session.changeToChinese");
  const themeLabel =
    theme === "system"
      ? t("session.themeDark")
      : theme === "dark"
        ? t("session.themeLight")
        : t("session.themeSystem");

  return (
    <section className="app-shell-card rounded-[1.8rem] px-5 py-4 backdrop-blur">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          {backHref ? (
            <Link
              className="app-button-secondary inline-flex w-fit items-center rounded-2xl px-4 py-2 text-sm font-medium transition hover:opacity-90"
              href={backHref}
            >
              {t("session.backToProjects")}
            </Link>
          ) : null}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{t("session.title")}</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{session?.displayName ?? t("session.loading")}</p>
            {session ? (
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>@{session.username}</span>
                {session.email ? <span>{session.email}</span> : null}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            aria-label={localeLabel}
            className="app-button-secondary rounded-2xl px-4 py-2 text-sm font-medium transition hover:opacity-90"
            onClick={() => setLocale(nextLocale)}
            type="button"
          >
            {locale === "zh-CN" ? "EN" : "中"}
          </button>
          <button
            aria-label={themeLabel}
            className="app-button-secondary rounded-2xl px-4 py-2 text-sm font-medium transition hover:opacity-90"
            onClick={handleThemeCycle}
            type="button"
          >
            {theme === "system" ? "Auto" : theme === "dark" ? "Dark" : "Light"}
          </button>
          <button
            className="app-button-primary rounded-2xl px-4 py-2 text-sm font-medium transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSigningOut}
            onClick={handleSignOut}
            type="button"
          >
            {isSigningOut ? t("session.signingOut") : t("session.signOut")}
          </button>
        </div>
      </div>
    </section>
  );
}
