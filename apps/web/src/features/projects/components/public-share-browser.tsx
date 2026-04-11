"use client";

import {
  fetchPublicShare,
  fetchPublicShareEndpoint,
  type EndpointDetail,
  type MockReleaseDetail,
  type ModuleTreeItem,
  type ParameterDetail,
  type PublicShareShell,
  type ResponseDetail,
  type VersionDetail
} from "@api-hub/api-sdk";
import { useEffect, useMemo, useState } from "react";

import {
  countTreeNodes,
  filterProjectTree,
  findExistingEndpointId,
  findFirstEndpointId,
  findLatestMockRelease,
  findLiveVersion,
  formatEndpointStatus,
  groupParameters,
  groupResponses
} from "./project-docs-browser-utils";

type PublicShareBrowserProps = {
  shareCode: string;
};

type PublicShareEndpointState = {
  endpoint: EndpointDetail | null;
  parameters: ParameterDetail[];
  responses: ResponseDetail[];
  versions: VersionDetail[];
  mockReleases: MockReleaseDetail[];
};

const EMPTY_ENDPOINT_STATE: PublicShareEndpointState = {
  endpoint: null,
  parameters: [],
  responses: [],
  versions: [],
  mockReleases: []
};

export function PublicShareBrowser({ shareCode }: PublicShareBrowserProps) {
  const [shell, setShell] = useState<PublicShareShell | null>(null);
  const [modules, setModules] = useState<ModuleTreeItem[]>([]);
  const [selectedEndpointId, setSelectedEndpointId] = useState<number | null>(null);
  const [endpointState, setEndpointState] = useState<PublicShareEndpointState>(EMPTY_ENDPOINT_STATE);
  const [searchQuery, setSearchQuery] = useState("");
  const [shellError, setShellError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isLoadingShell, setIsLoadingShell] = useState(true);
  const [isLoadingEndpoint, setIsLoadingEndpoint] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadShell() {
      setIsLoadingShell(true);
      setShellError(null);
      setDetailError(null);

      try {
        const response = await fetchPublicShare(shareCode);
        if (!isMounted) {
          return;
        }

        setShell(response.data);
        setModules(response.data.tree.modules);
      } catch (loadError) {
        if (isMounted) {
          setShellError(loadError instanceof Error ? loadError.message : "Failed to load public share");
        }
      } finally {
        if (isMounted) {
          setIsLoadingShell(false);
        }
      }
    }

    void loadShell();

    return () => {
      isMounted = false;
    };
  }, [shareCode]);

  const filteredModules = useMemo(() => filterProjectTree(modules, searchQuery), [modules, searchQuery]);
  const activeCounts = useMemo(
    () => countTreeNodes(searchQuery.trim() ? filteredModules : modules),
    [filteredModules, modules, searchQuery]
  );
  const parameterSections = useMemo(() => groupParameters(endpointState.parameters), [endpointState.parameters]);
  const responseSections = useMemo(() => groupResponses(endpointState.responses), [endpointState.responses]);
  const liveVersion = useMemo(
    () => findLiveVersion(endpointState.versions, endpointState.endpoint?.releasedVersionId ?? null),
    [endpointState.endpoint?.releasedVersionId, endpointState.versions]
  );
  const latestMockRelease = useMemo(() => findLatestMockRelease(endpointState.mockReleases), [endpointState.mockReleases]);

  useEffect(() => {
    const nextEndpointId =
      findExistingEndpointId(filteredModules, selectedEndpointId) ?? findFirstEndpointId(filteredModules);

    if (nextEndpointId !== selectedEndpointId) {
      setSelectedEndpointId(nextEndpointId);
    }
  }, [filteredModules, selectedEndpointId]);

  useEffect(() => {
    if (selectedEndpointId === null) {
      setEndpointState(EMPTY_ENDPOINT_STATE);
      return;
    }

    const endpointId = selectedEndpointId;
    let isMounted = true;

    async function loadEndpoint() {
      setIsLoadingEndpoint(true);

      try {
        const response = await fetchPublicShareEndpoint(shareCode, endpointId);
        if (isMounted) {
          setEndpointState(response.data);
          setDetailError(null);
        }
      } catch (loadError) {
        if (isMounted) {
          setEndpointState(EMPTY_ENDPOINT_STATE);
          setDetailError(loadError instanceof Error ? loadError.message : "Failed to load shared endpoint");
        }
      } finally {
        if (isMounted) {
          setIsLoadingEndpoint(false);
        }
      }
    }

    void loadEndpoint();

    return () => {
      isMounted = false;
    };
  }, [selectedEndpointId, shareCode]);

  if (isLoadingShell) {
    return <main className="mx-auto min-h-screen max-w-[1480px] p-6 text-sm text-slate-500">Loading public documentation...</main>;
  }

  if (shellError) {
    return (
      <main className="mx-auto min-h-screen max-w-[1480px] p-6">
        <div className="rounded-[1.8rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{shellError}</div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-[1480px] flex-col gap-6 p-6 text-slate-900">
      <section className="overflow-hidden rounded-[2.4rem] border border-white/60 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(251,191,36,0.12),_transparent_28%),linear-gradient(145deg,_rgba(255,255,255,0.98),_rgba(241,245,249,0.92))] p-6 shadow-[0_30px_90px_rgba(15,23,42,0.10)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">Public Documentation Share</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950">{shell?.project.name}</h1>
              {shell?.project.projectKey ? (
                <span className="rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {shell.project.projectKey}
                </span>
              ) : null}
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">{shell?.project.description || "Shared read-only documentation surface."}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Badge label={shell?.share.name ?? "Shared docs"} tone="sky" />
              <Badge label={shell?.share.expiresAt ? `Expires ${formatDate(shell.share.expiresAt)}` : "No expiry"} tone="amber" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:w-[420px]">
            <StatCard label="Modules" value={activeCounts.moduleCount} />
            <StatCard label="Groups" value={activeCounts.groupCount} />
            <StatCard label="Endpoints" value={activeCounts.endpointCount} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Navigation</p>
            <h2 className="text-lg font-semibold text-slate-950">Search and browse endpoints</h2>
            <p className="text-sm leading-6 text-slate-600">Filter the shared tree by endpoint name, method, path, module, or group label.</p>
          </div>

          <label className="mt-5 block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Search docs</span>
            <input
              aria-label="Search docs"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search endpoints, modules, groups, paths"
              value={searchQuery}
            />
          </label>

          <div className="mt-5 space-y-4">
            {filteredModules.length === 0 ? (
              <div className="rounded-[1.7rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500">
                No endpoints match the current documentation search.
              </div>
            ) : (
              filteredModules.map((module) => (
                <section
                  className="rounded-[1.7rem] border border-slate-200/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.92))] p-4 shadow-[0_18px_45px_rgba(15,23,42,0.05)]"
                  key={module.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{module.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {module.groups.reduce((count, group) => count + group.endpoints.length, 0)} endpoints
                      </p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Module
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {module.groups.map((group) => (
                      <div key={group.id}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{group.name}</p>
                          <span className="text-[11px] text-slate-400">{group.endpoints.length} endpoints</span>
                        </div>
                        <div className="space-y-2">
                          {group.endpoints.map((treeEndpoint) => {
                            const isActive = treeEndpoint.id === selectedEndpointId;

                            return (
                              <button
                                aria-label={`${treeEndpoint.name} ${treeEndpoint.method} ${treeEndpoint.path}`}
                                className={`w-full rounded-[1.35rem] border px-4 py-3 text-left transition ${
                                  isActive
                                    ? "border-slate-900 bg-slate-950 text-white shadow-[0_18px_45px_rgba(15,23,42,0.18)]"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                                }`}
                                key={treeEndpoint.id}
                                onClick={() => setSelectedEndpointId(treeEndpoint.id)}
                                type="button"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold">{treeEndpoint.name}</p>
                                    <p className={`mt-2 truncate text-xs ${isActive ? "text-slate-300" : "text-slate-500"}`}>{treeEndpoint.path}</p>
                                  </div>
                                  <span className={methodBadgeClasses(treeEndpoint.method, isActive)}>{treeEndpoint.method}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </aside>

        <div className="space-y-6">
          {isLoadingEndpoint ? (
            <section className="rounded-[2rem] border border-white/60 bg-white/80 px-6 py-12 text-sm text-slate-500 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
              Loading shared endpoint...
            </section>
          ) : detailError ? (
            <section className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-700">
              {detailError}
            </section>
          ) : !selectedEndpointId ? (
            <section className="rounded-[2rem] border border-dashed border-slate-200 bg-white/78 px-6 py-12 text-center shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
              <p className="text-lg font-semibold text-slate-950">No endpoint selected</p>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {modules.length === 0
                  ? "This share does not expose any documented endpoints yet."
                  : "Adjust the search or choose a visible endpoint from the shared tree."}
              </p>
            </section>
          ) : endpointState.endpoint ? (
            <>
              <section className="overflow-hidden rounded-[2rem] border border-white/60 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.16),_transparent_25%),radial-gradient(circle_at_bottom_left,_rgba(15,23,42,0.06),_transparent_28%),linear-gradient(145deg,_rgba(255,255,255,0.98),_rgba(241,245,249,0.92))] p-6 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={methodBadgeClasses(endpointState.endpoint.method)}>{endpointState.endpoint.method}</span>
                      <Badge label={formatEndpointStatus(endpointState.endpoint.status)} tone="slate" />
                      {endpointState.endpoint.releasedVersionLabel ? <Badge label={endpointState.endpoint.releasedVersionLabel} tone="sky" /> : null}
                    </div>
                    <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{endpointState.endpoint.name}</h2>
                    <p className="mt-3 rounded-[1.4rem] border border-slate-200/80 bg-white/85 px-4 py-3 font-mono text-sm text-slate-700">{endpointState.endpoint.path}</p>
                    <p className="mt-4 text-sm leading-7 text-slate-600">
                      {endpointState.endpoint.description || "No endpoint description was written for this contract."}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:w-[360px]">
                    <MetricCard label="Parameters" value={String(endpointState.parameters.length)} />
                    <MetricCard label="Responses" value={String(endpointState.responses.length)} />
                    <MetricCard label="Versions" value={String(endpointState.versions.length)} />
                    <MetricCard label="Mock releases" value={String(endpointState.mockReleases.length)} />
                  </div>
                </div>
              </section>

              <ContractSections
                emptyState="No request parameters were documented for this endpoint."
                sections={parameterSections.map((section) => ({
                  id: section.id,
                  items: section.items.map((parameter) => ({
                    detail: parameter.description || "No field description.",
                    meta: [
                      parameter.dataType,
                      parameter.required ? "Required" : "Optional",
                      parameter.exampleValue ? `Example: ${parameter.exampleValue}` : null
                    ],
                    title: parameter.name
                  })),
                  label: section.label
                }))}
                title="Parameters and request surface"
              />

              <ContractSections
                emptyState="No response fields were documented for this endpoint."
                sections={responseSections.map((section) => ({
                  id: section.id,
                  items: section.items.map((response) => ({
                    detail: response.description || "No field description.",
                    meta: [
                      response.mediaType,
                      response.dataType,
                      response.required ? "Required" : "Optional",
                      response.exampleValue ? `Example: ${response.exampleValue}` : null
                    ],
                    title: response.name || "Unnamed field"
                  })),
                  label: section.label
                }))}
                title="Response envelopes and fields"
              />

              <div className="grid gap-6 xl:grid-cols-2">
                <section
                  aria-label="Version posture"
                  className="overflow-hidden rounded-[2rem] border border-slate-900/80 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_28%),linear-gradient(145deg,_rgba(15,23,42,0.98),_rgba(30,41,59,0.94),_rgba(51,65,85,0.92))] p-6 text-white shadow-[0_24px_64px_rgba(15,23,42,0.22)]"
                  role="region"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">Version posture</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight">Live version</h3>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <GlassMetricCard label="Current lane" value={formatEndpointStatus(endpointState.endpoint.status)} />
                    <GlassMetricCard label="Live snapshot" value={liveVersion?.version ?? "Draft lane"} />
                  </div>
                </section>

                <section className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Mock releases</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Published runtime snapshots</h3>
                  {latestMockRelease ? (
                    <div className="mt-5 rounded-[1.8rem] border border-emerald-200/80 bg-[linear-gradient(145deg,_rgba(236,253,245,0.96),_rgba(209,250,229,0.88))] p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Latest publication</p>
                      <p className="mt-3 text-2xl font-semibold text-slate-950">{`Release #${latestMockRelease.releaseNo}`}</p>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-[1.7rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500">
                      No mock releases have been published for this endpoint.
                    </div>
                  )}
                </section>
              </div>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function Badge({ label, tone }: { label: string; tone: "amber" | "sky" | "slate" }) {
  const toneClasses =
    tone === "amber" ? "bg-amber-100 text-amber-800" : tone === "sky" ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-600";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${toneClasses}`}>{label}</span>;
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.6rem] border border-white/60 bg-slate-950 px-5 py-4 text-white shadow-[0_18px_40px_rgba(15,23,42,0.20)]">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/82 px-4 py-4 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-3 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function GlassMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/12 bg-white/6 px-4 py-4 backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">{label}</p>
      <p className="mt-3 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function ContractSections({
  title,
  emptyState,
  sections
}: {
  title: string;
  emptyState: string;
  sections: Array<{
    id: string;
    label: string;
    items: Array<{
      title: string;
      detail: string;
      meta: Array<string | null>;
    }>;
  }>;
}) {
  return (
    <section className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Contract surface</p>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{title}</h3>

      {sections.length === 0 ? (
        <div className="mt-5 rounded-[1.7rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500">
          {emptyState}
        </div>
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {sections.map((section) => (
            <section className="rounded-[1.7rem] border border-slate-200/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.92))] p-5 shadow-[0_18px_42px_rgba(15,23,42,0.05)]" key={section.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-950">{section.label}</p>
                  <p className="mt-2 text-sm text-slate-500">{section.items.length} documented fields</p>
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {section.items.length}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {section.items.map((item) => (
                  <div className="rounded-[1.35rem] border border-slate-200 bg-white px-4 py-4" key={`${section.id}-${item.title}`}>
                    <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.meta.filter((metaItem): metaItem is string => Boolean(metaItem)).map((metaItem) => (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500" key={metaItem}>
                          {metaItem}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

function methodBadgeClasses(method: string, isActive = false) {
  const palette = isActive
    ? {
        DELETE: "bg-rose-400/20 text-rose-100",
        GET: "bg-emerald-400/20 text-emerald-100",
        PATCH: "bg-violet-400/20 text-violet-100",
        POST: "bg-sky-400/20 text-sky-100",
        PUT: "bg-amber-300/20 text-amber-100",
        fallback: "bg-white/15 text-white"
      }
    : {
        DELETE: "bg-rose-50 text-rose-700",
        GET: "bg-emerald-50 text-emerald-700",
        PATCH: "bg-violet-50 text-violet-700",
        POST: "bg-sky-50 text-sky-700",
        PUT: "bg-amber-50 text-amber-700",
        fallback: "bg-slate-100 text-slate-700"
      };

  return `rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${palette[method as keyof typeof palette] ?? palette.fallback}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric"
  }).format(new Date(value));
}
