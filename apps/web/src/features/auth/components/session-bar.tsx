"use client";

import { fetchMe, logout } from "@api-hub/api-sdk";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { clearTokens, loadTokens } from "../../../lib/auth-store";

export function SessionBar() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

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
          setDisplayName(response.data.displayName || response.data.username);
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

  return (
    <section className="rounded-[1.8rem] border border-white/60 bg-white/70 px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Session</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{displayName ?? "Loading session..."}</p>
        </div>
        <button
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-400"
          disabled={isSigningOut}
          onClick={handleSignOut}
          type="button"
        >
          {isSigningOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </section>
  );
}
