"use client";

import {
  fetchProjectMockCenter,
  publishProjectMockCenterEndpoint,
  updateProjectMockAccess,
  type MockAccessMode,
  type ProjectMockCenterItem
} from "@api-hub/api-sdk";
import { useEffect, useMemo, useState } from "react";

import { useI18n } from "../../../lib/ui-preferences";

type ProjectMockCenterProps = {
  projectId: number;
};

export function ProjectMockCenter({ projectId }: ProjectMockCenterProps) {
  const { t } = useI18n();
  const [mode, setMode] = useState<MockAccessMode>("private");
  const [token, setToken] = useState("");
  const [items, setItems] = useState<ProjectMockCenterItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void reloadCenter();
  }, [projectId]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return items;
    }

    return items.filter((item) =>
      `${item.endpointName} ${item.method} ${item.path} ${item.moduleName ?? ""} ${item.groupName ?? ""}`.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);
  const runtimeBaseUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return `/mock/${projectId}`;
    }

    return new URL(`/mock/${projectId}`, window.location.origin).toString();
  }, [projectId]);

  return (
    <main className="mx-auto flex min-h-screen max-w-[1480px] flex-col gap-6 p-6 text-slate-900">
      <section className="overflow-hidden rounded-[2.4rem] border border-slate-900/80 bg-[linear-gradient(180deg,#1d2028_0%,#0b0d11_100%)] p-6 text-white shadow-[0_30px_90px_rgba(15,23,42,0.20)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">{t("mockCenter.heroEyebrow")}</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">{t("mockCenter.heroTitle")}</h1>
            <p className="mt-4 text-sm leading-7 text-slate-300">{t("mockCenter.heroSubtitle")}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:w-[420px]">
            <HeroStat label={t("mockCenter.visibleEndpoints")} value={filteredItems.length} />
            <HeroStat label={t("mockCenter.changedDrafts")} value={items.filter((item) => item.draftChanged).length} />
            <HeroStat label={t("mockCenter.published")} value={items.filter((item) => item.latestReleaseNo !== null).length} />
          </div>
        </div>
      </section>

      {error ? <div className="rounded-[1.8rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div> : null}

      <section className="overflow-hidden rounded-[2rem] border border-sky-200/80 bg-[linear-gradient(135deg,_rgba(239,246,255,0.98),_rgba(224,242,254,0.86))] p-5 shadow-[0_20px_55px_rgba(14,116,144,0.10)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">{t("mockCenter.runtimeBase")}</p>
            <h2 className="mt-2 break-all text-2xl font-semibold tracking-tight text-slate-950">{runtimeBaseUrl}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{t("mockCenter.runtimeBaseDetail")}</p>
          </div>
          <div className="rounded-[1.4rem] border border-white/70 bg-white/75 px-4 py-3 text-sm text-slate-600 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
            {t("mockCenter.runtimeBaseHint")}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="app-shell-card rounded-[2rem] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{t("mockCenter.heroEyebrow")}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{t("mockCenter.runtimeCardTitle")}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">{t("mockCenter.runtimeTitle")}</p>

          <div className="mt-5 grid gap-3">
            {(
              [
                ["private", t("mockCenter.mode.private.label"), t("mockCenter.mode.private.detail")],
                ["token", t("mockCenter.mode.token.label"), t("mockCenter.mode.token.detail")],
                ["public", t("mockCenter.mode.public.label"), t("mockCenter.mode.public.detail")]
              ] as const
            ).map(([optionValue, label, detail]) => {
              const checked = mode === optionValue;

              return (
                <label
                  className={`flex cursor-pointer items-start gap-4 rounded-[1.6rem] border px-4 py-4 transition ${
                    checked ? "border-slate-900 bg-slate-950 text-white shadow-[0_20px_45px_rgba(15,23,42,0.18)]" : "border-slate-200 bg-white text-slate-800"
                  }`}
                  key={optionValue}
                >
                  <input
                    aria-label={label}
                    checked={checked}
                    className="mt-1"
                    name="mock-access-mode"
                    onChange={() => setMode(optionValue)}
                    type="radio"
                  />
                  <div>
                    <p className="text-sm font-semibold">{label}</p>
                    <p className={`mt-2 text-sm leading-6 ${checked ? "text-slate-300" : "text-slate-500"}`}>{detail}</p>
                  </div>
                </label>
              );
            })}
          </div>

          <label className="mt-5 block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{t("mockCenter.runtimeToken")}</span>
            <input
              aria-label={t("mockCenter.runtimeToken")}
              className="app-input w-full rounded-2xl px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-400"
              onChange={(event) => setToken(event.target.value)}
              value={token}
            />
          </label>

          <div className="mt-4 rounded-[1.45rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("mockCenter.runtimeTokenPreview")}</p>
            <p className="mt-2 break-all font-mono text-sm text-slate-700">{token || t("mockCenter.runtimeTokenEmpty")}</p>
          </div>

          <div className="mt-4 rounded-[1.6rem] border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm leading-6 text-slate-600">
            {getRuntimeMessage(mode, t)}
          </div>

          <button
            className="app-button-primary mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition hover:opacity-90"
            onClick={() => void handleSaveAccess()}
            type="button"
          >
            {t("mockCenter.saveAccess")}
          </button>
          <button
            className="app-button-secondary mt-3 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition hover:opacity-90"
            onClick={() => void handleRegenerateToken()}
            type="button"
          >
            {t("mockCenter.regenerateToken")}
          </button>
        </section>

        <section className="app-shell-card rounded-[2rem] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{t("mockCenter.publishEyebrow")}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{t("mockCenter.publishTitle")}</h2>
            </div>

            <label className="block w-full max-w-md space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{t("mockCenter.publishSearch")}</span>
              <input
                aria-label={t("mockCenter.publishSearch")}
                className="app-input w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t("mockCenter.publishSearchPlaceholder")}
                value={searchQuery}
              />
            </label>
          </div>

          {isLoading ? (
            <div className="mt-5 rounded-[1.7rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500">
              {t("mockCenter.loading")}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="mt-5 rounded-[1.7rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500">
              {t("mockCenter.emptySearch")}
            </div>
          ) : (
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {filteredItems.map((item) => (
                <article
                  aria-label={item.endpointName}
                  className="rounded-[1.8rem] border border-slate-200/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.92))] p-5 shadow-[0_18px_42px_rgba(15,23,42,0.05)]"
                  key={item.endpointId}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={methodPillClasses(item.method)}>{item.method}</span>
                        <h3 className="text-lg font-semibold text-slate-950">{item.endpointName}</h3>
                      </div>
                      <p className="mt-2 font-mono text-sm text-slate-600">{item.path}</p>
                      <p className="mt-2 text-sm text-slate-500">
                        {[item.moduleName, item.groupName].filter(Boolean).join(" / ") || t("mockCenter.searchUngrouped")}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                        item.draftChanged ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {item.draftChanged ? t("mockCenter.runtimeDrift") : t("mockCenter.runtimeInSync")}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <MiniStat
                      label={t("mockCenter.releaseLabel")}
                      value={
                        item.latestReleaseNo === null
                          ? t("mockCenter.releaseNotPublished")
                          : t("mockCenter.releaseValue", { count: item.latestReleaseNo })
                      }
                    />
                    <MiniStat label={t("mockCenter.rules")} value={`${item.enabledRuleCount}/${item.totalRuleCount}`} />
                    <MiniStat label={t("mockCenter.responses")} value={String(item.responseFieldCount)} />
                  </div>

                  <div className="mt-4 rounded-[1.35rem] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
                    {item.mockEnabled
                      ? item.latestReleaseAt
                        ? t("mockCenter.runtimeLatestPublished", { time: formatPublishTime(item.latestReleaseAt) })
                        : t("mockCenter.mockEnabledNotPublished")
                      : t("mockCenter.mockDisabled")}
                  </div>

                  <button
                    className="app-button-primary mt-4 rounded-full px-4 py-3 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!item.mockEnabled}
                    onClick={() => void handlePublish(item.endpointId)}
                    type="button"
                  >
                    {t("mockCenter.publishAction")}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );

  async function reloadCenter() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchProjectMockCenter(projectId);
      setMode(response.data.settings.mode);
      setToken(response.data.settings.token ?? "");
      setItems(response.data.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load mock center");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveAccess() {
    setError(null);

    try {
      await updateProjectMockAccess(projectId, {
        mode,
        token
      });
      await reloadCenter();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update mock access");
    }
  }

  async function handlePublish(endpointId: number) {
    setError(null);

    try {
      await publishProjectMockCenterEndpoint(projectId, endpointId);
      await reloadCenter();
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Failed to publish mock endpoint");
    }
  }

  async function handleRegenerateToken() {
    setError(null);

    try {
      await updateProjectMockAccess(projectId, {
        mode,
        regenerateToken: true
      });
      await reloadCenter();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to regenerate mock token");
    }
  }
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.6rem] border border-white/12 bg-white/6 px-5 py-4 text-white shadow-[0_18px_40px_rgba(15,23,42,0.20)]">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function getRuntimeMessage(mode: MockAccessMode, t: (key: string, values?: Record<string, string | number>) => string) {
  switch (mode) {
    case "public":
      return t("mockCenter.runtime.public");
    case "token":
      return t("mockCenter.runtime.token");
    default:
      return t("mockCenter.runtime.private");
  }
}

function formatPublishTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  const hours = `${date.getUTCHours()}`.padStart(2, "0");
  const minutes = `${date.getUTCMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes} UTC`;
}

function methodPillClasses(method: string) {
  const palette: Record<string, string> = {
    DELETE: "bg-rose-50 text-rose-700",
    GET: "bg-emerald-50 text-emerald-700",
    PATCH: "bg-violet-50 text-violet-700",
    POST: "bg-sky-50 text-sky-700",
    PUT: "bg-amber-50 text-amber-700"
  };

  return `rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${palette[method] ?? "bg-slate-100 text-slate-700"}`;
}
