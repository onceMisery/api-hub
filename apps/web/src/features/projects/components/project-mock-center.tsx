"use client";

import {
  fetchProjectMockCenter,
  publishProjectMockCenterEndpoint,
  updateProjectMockAccess,
  type MockAccessMode,
  type ProjectMockCenterItem
} from "@api-hub/api-sdk";
import { useEffect, useMemo, useState } from "react";

type ProjectMockCenterProps = {
  projectId: number;
};

export function ProjectMockCenter({ projectId }: ProjectMockCenterProps) {
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

  return (
    <main className="mx-auto flex min-h-screen max-w-[1480px] flex-col gap-6 p-6 text-slate-900">
      <section className="overflow-hidden rounded-[2.4rem] border border-white/60 bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.06),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.12),_transparent_28%),linear-gradient(145deg,_rgba(255,255,255,0.98),_rgba(241,245,249,0.92))] p-6 shadow-[0_30px_90px_rgba(15,23,42,0.10)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">Mock Runtime Access</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Mock center</h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Control project-wide runtime posture, keep the shared token visible, and publish changed endpoints without hopping across editor tabs.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:w-[420px]">
            <HeroStat label="Visible endpoints" value={filteredItems.length} />
            <HeroStat label="Changed drafts" value={items.filter((item) => item.draftChanged).length} />
            <HeroStat label="Published" value={items.filter((item) => item.latestReleaseNo !== null).length} />
          </div>
        </div>
      </section>

      {error ? <div className="rounded-[1.8rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div> : null}

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Access policy</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Mode cards and runtime token</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">Choose whether runtime traffic stays private, accepts a shared project token, or becomes fully public.</p>

          <div className="mt-5 grid gap-3">
            {(
              [
                ["private", "Private mode", "Only signed-in project readers can hit runtime mock traffic."],
                ["token", "Token mode", "Bearer auth or X-ApiHub-Mock-Token can pass runtime access."],
                ["public", "Public mode", "Anonymous callers can hit runtime mock traffic without auth."]
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
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Mock access token</span>
            <input
              aria-label="Mock access token"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-400"
              onChange={(event) => setToken(event.target.value)}
              value={token}
            />
          </label>

          <div className="mt-4 rounded-[1.45rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Token preview</p>
            <p className="mt-2 break-all font-mono text-sm text-slate-700">{token || "No token set"}</p>
          </div>

          <div className="mt-4 rounded-[1.6rem] border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm leading-6 text-slate-600">
            {getRuntimeMessage(mode)}
          </div>

          <button
            className="mt-5 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            onClick={() => void handleSaveAccess()}
            type="button"
          >
            Save mock access
          </button>
          <button
            className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={() => void handleRegenerateToken()}
            type="button"
          >
            Regenerate token
          </button>
        </section>

        <section className="rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Publish center</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Endpoint release posture</h2>
            </div>

            <label className="block w-full max-w-md space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Search endpoints</span>
              <input
                aria-label="Search endpoints"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search endpoint names, methods, paths, or groups"
                value={searchQuery}
              />
            </label>
          </div>

          {isLoading ? (
            <div className="mt-5 rounded-[1.7rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500">
              Loading mock center...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="mt-5 rounded-[1.7rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500">
              No endpoints match the current search.
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
                      <p className="mt-2 text-sm text-slate-500">{[item.moduleName, item.groupName].filter(Boolean).join(" / ") || "Ungrouped"}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${item.draftChanged ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                      {item.draftChanged ? "Draft drift" : "In sync"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <MiniStat label="Release" value={item.latestReleaseNo === null ? "Not published" : `Release #${item.latestReleaseNo}`} />
                    <MiniStat label="Rules" value={`${item.enabledRuleCount}/${item.totalRuleCount}`} />
                    <MiniStat label="Responses" value={String(item.responseFieldCount)} />
                  </div>

                  <div className="mt-4 rounded-[1.35rem] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
                    {item.mockEnabled
                      ? item.latestReleaseAt
                        ? `Latest runtime snapshot published ${formatPublishTime(item.latestReleaseAt)}.`
                        : "Mock enabled but not published yet."
                      : "Mock disabled"}
                  </div>

                  <button
                    className="mt-4 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    disabled={!item.mockEnabled}
                    onClick={() => void handlePublish(item.endpointId)}
                    type="button"
                  >
                    Publish endpoint
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
    <div className="rounded-[1.6rem] border border-white/60 bg-slate-950 px-5 py-4 text-white shadow-[0_18px_40px_rgba(15,23,42,0.20)]">
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

function getRuntimeMessage(mode: MockAccessMode) {
  switch (mode) {
    case "public":
      return "Public traffic is allowed for every caller.";
    case "token":
      return "Mock requests can use project auth or the shared X-ApiHub-Mock-Token header.";
    default:
      return "Only signed-in users with project read access can call runtime mock traffic.";
  }
}

function formatPublishTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric"
  }).format(new Date(value));
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
