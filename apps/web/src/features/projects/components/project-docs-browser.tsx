"use client";

import {
  fetchEndpoint,
  fetchEndpointMockReleases,
  fetchEndpointParameters,
  fetchEndpointResponses,
  fetchEndpointVersions,
  fetchProject,
  fetchProjectTree,
  isApiRequestError,
  type EndpointDetail,
  type MockReleaseDetail,
  type ModuleTreeItem,
  type ParameterDetail,
  type ProjectDetail,
  type ResponseDetail,
  type VersionDetail
} from "@api-hub/api-sdk";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { SessionBar } from "../../auth/components/session-bar";
import { useI18n } from "../../../lib/ui-preferences";
import { formatProjectAccess } from "./project-catalog-utils";
import {
  countTreeNodes,
  filterProjectTree,
  findExistingEndpointId,
  findFirstEndpointId,
  findLatestMockRelease,
  findLiveVersion,
  groupParameters,
  groupResponses
} from "./project-docs-browser-utils";

type ProjectDocsBrowserProps = {
  projectId: number;
};

export function ProjectDocsBrowser({ projectId }: ProjectDocsBrowserProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [modules, setModules] = useState<ModuleTreeItem[]>([]);
  const [selectedEndpointId, setSelectedEndpointId] = useState<number | null>(null);
  const [endpoint, setEndpoint] = useState<EndpointDetail | null>(null);
  const [parameters, setParameters] = useState<ParameterDetail[]>([]);
  const [responses, setResponses] = useState<ResponseDetail[]>([]);
  const [versions, setVersions] = useState<VersionDetail[]>([]);
  const [mockReleases, setMockReleases] = useState<MockReleaseDetail[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isLoadingShell, setIsLoadingShell] = useState(true);
  const [isLoadingEndpoint, setIsLoadingEndpoint] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadShell() {
      setIsLoadingShell(true);
      setError(null);
      setDetailError(null);

      try {
        const [projectResponse, treeResponse] = await Promise.all([fetchProject(projectId), fetchProjectTree(projectId)]);
        if (!isMounted) {
          return;
        }

        setProject(projectResponse.data);
        setModules(treeResponse.data.modules);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        if (handleUnauthorized(loadError)) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Failed to load project documentation");
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
  }, [projectId]);

  const filteredModules = useMemo(() => filterProjectTree(modules, searchQuery), [modules, searchQuery]);
  const treeCounts = useMemo(() => countTreeNodes(modules), [modules]);
  const filteredCounts = useMemo(() => countTreeNodes(filteredModules), [filteredModules]);
  const parameterSections = useMemo(() => groupParameters(parameters), [parameters]);
  const responseSections = useMemo(() => groupResponses(responses), [responses]);
  const latestMockRelease = useMemo(() => findLatestMockRelease(mockReleases), [mockReleases]);
  const liveVersion = useMemo(
    () => findLiveVersion(versions, endpoint?.releasedVersionId ?? null),
    [endpoint?.releasedVersionId, versions]
  );

  useEffect(() => {
    const nextEndpointId =
      findExistingEndpointId(filteredModules, selectedEndpointId) ?? findFirstEndpointId(filteredModules);

    if (nextEndpointId !== selectedEndpointId) {
      setSelectedEndpointId(nextEndpointId);
    }
  }, [filteredModules, selectedEndpointId]);

  useEffect(() => {
    if (!selectedEndpointId) {
      setEndpoint(null);
      setParameters([]);
      setResponses([]);
      setVersions([]);
      setMockReleases([]);
      setDetailError(null);
      return;
    }

    const endpointId = selectedEndpointId;
    let isMounted = true;

    async function loadEndpointDetails() {
      setIsLoadingEndpoint(true);
      setDetailError(null);

      try {
        const [endpointResponse, parameterResponse, responseResponse, versionResponse, mockReleaseResponse] = await Promise.all([
          fetchEndpoint(endpointId),
          fetchEndpointParameters(endpointId),
          fetchEndpointResponses(endpointId),
          fetchEndpointVersions(endpointId),
          fetchEndpointMockReleases(endpointId)
        ]);

        if (!isMounted) {
          return;
        }

        setEndpoint(endpointResponse.data);
        setParameters(parameterResponse.data);
        setResponses(responseResponse.data);
        setVersions(versionResponse.data);
        setMockReleases(mockReleaseResponse.data);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        if (handleUnauthorized(loadError)) {
          return;
        }

        setDetailError(loadError instanceof Error ? loadError.message : "Failed to load endpoint details");
      } finally {
        if (isMounted) {
          setIsLoadingEndpoint(false);
        }
      }
    }

    void loadEndpointDetails();

    return () => {
      isMounted = false;
    };
  }, [selectedEndpointId]);

  const accessLabel = formatProjectAccessLabel(project?.currentUserRole, t);
  const activeCounts = searchQuery.trim() ? filteredCounts : treeCounts;

  return (
    <main className="mx-auto flex min-h-screen max-w-[1480px] flex-col gap-6 p-6 text-slate-900">
      <SessionBar />
      <section className="overflow-hidden rounded-[2.4rem] border border-slate-900/80 bg-[linear-gradient(180deg,#1d2028_0%,#0b0d11_100%)] p-6 text-white shadow-[0_30px_90px_rgba(15,23,42,0.20)] backdrop-blur">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">{t("docs.page.eyebrow")}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-semibold tracking-tight text-white">{project?.name ?? `Project #${projectId}`}</h1>
              {project?.projectKey ? (
                <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                  {project.projectKey}
                </span>
              ) : null}
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              {project?.description || t("docs.page.description")}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Badge label={accessLabel} tone="slate" />
              <Badge label={t("docs.badge.readOnly")} tone="amber" />
              <Badge label={t("docs.badge.browseMode")} tone="sky" />
            </div>
          </div>

          <div className="grid gap-3 xl:w-[440px]">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label={t("docs.stats.modules")} value={activeCounts.moduleCount} />
              <StatCard label={t("docs.stats.groups")} value={activeCounts.groupCount} />
              <StatCard label={t("docs.stats.endpoints")} value={activeCounts.endpointCount} />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                className="rounded-full border border-white/12 bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                href={`/console/projects/${projectId}`}
              >
                {t("docs.openWorkbench")}
              </Link>
              <div className="rounded-full border border-white/12 bg-white/8 px-4 py-3 text-sm text-slate-300">
                {searchQuery.trim()
                  ? t("docs.filteredEndpoints", { count: filteredCounts.endpointCount })
                  : t("docs.authenticatedData")}
              </div>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-[2rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div>
      ) : null}

      {isLoadingShell ? (
        <section className="rounded-[2rem] border border-white/60 bg-white/80 px-6 py-12 text-sm text-slate-500 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
          {t("docs.loadingShell")}
        </section>
      ) : (
        <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <NavigationRail
            filteredModules={filteredModules}
            onSearchChange={setSearchQuery}
            onSelectEndpoint={setSelectedEndpointId}
            searchQuery={searchQuery}
            selectedEndpointId={selectedEndpointId}
            stats={activeCounts}
          />
          <div className="space-y-6">
            {!selectedEndpointId ? (
              <section className="rounded-[2rem] border border-dashed border-slate-200 bg-white/78 px-6 py-12 text-center shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
                <p className="text-lg font-semibold text-slate-950">{t("docs.empty.title")}</p>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {modules.length === 0
                    ? t("docs.empty.noEndpoints")
                    : t("docs.empty.select")}
                </p>
              </section>
            ) : isLoadingEndpoint ? (
              <section className="rounded-[2rem] border border-white/60 bg-white/80 px-6 py-12 text-sm text-slate-500 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
                {t("docs.loadingEndpoint")}
              </section>
            ) : detailError ? (
              <section className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-700">
                {detailError}
              </section>
            ) : endpoint ? (
              <>
                <EndpointHero
                  endpoint={endpoint}
                  latestMockRelease={latestMockRelease}
                  mockReleaseCount={mockReleases.length}
                  parameterCount={parameters.length}
                  responseCount={responses.length}
                  versionCount={versions.length}
                />
                <ParameterSurface sections={parameterSections} />
                <ResponseSurface sections={responseSections} />
                <div className="grid gap-6 xl:grid-cols-2">
                  <VersionPosture endpoint={endpoint} liveVersion={liveVersion} versions={versions} />
                  <MockReleasePosture latestMockRelease={latestMockRelease} mockReleases={mockReleases} />
                </div>
              </>
            ) : null}
          </div>
        </section>
      )}
    </main>
  );

  function handleUnauthorized(loadError: unknown) {
    if (isApiRequestError(loadError) && loadError.status === 401) {
      router.replace("/login");
      return true;
    }

    return false;
  }
}

function NavigationRail({
  filteredModules,
  stats,
  searchQuery,
  selectedEndpointId,
  onSearchChange,
  onSelectEndpoint
}: {
  filteredModules: ModuleTreeItem[];
  stats: { endpointCount: number; groupCount: number; moduleCount: number };
  searchQuery: string;
  selectedEndpointId: number | null;
  onSearchChange: (value: string) => void;
  onSelectEndpoint: (endpointId: number | null) => void;
}) {
  const { t } = useI18n();

  return (
    <aside className="rounded-[2rem] border border-white/60 bg-white/78 p-5 shadow-[0_24px_64px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{t("docs.navigation.eyebrow")}</p>
        <h2 className="text-lg font-semibold text-slate-950">{t("docs.navigation.title")}</h2>
        <p className="text-sm leading-6 text-slate-600">{t("docs.navigation.detail")}</p>
      </div>

      <label className="mt-5 block space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{t("docs.navigation.search")}</span>
        <input
          aria-label={t("docs.navigation.search")}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("docs.navigation.searchPlaceholder")}
          value={searchQuery}
        />
      </label>

      <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
        <MiniStatCard label={t("docs.stats.modules")} value={stats.moduleCount} />
        <MiniStatCard label={t("docs.stats.groups")} value={stats.groupCount} />
        <MiniStatCard label={t("docs.stats.endpoints")} value={stats.endpointCount} />
      </div>

      <div className="mt-5 space-y-4">
        {filteredModules.length === 0 ? (
          <div className="rounded-[1.7rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500">
            {t("docs.emptySearch")}
          </div>
        ) : (
          filteredModules.map((module) => (
            <section
              className="rounded-[1.7rem] border border-slate-200/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.94),_rgba(248,250,252,0.88))] p-4 shadow-[0_18px_45px_rgba(15,23,42,0.05)]"
              key={module.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{module.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {module.groups.length} groups · {module.groups.reduce((count, group) => count + group.endpoints.length, 0)} endpoints
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
                            aria-pressed={isActive}
                            className={`w-full rounded-[1.35rem] border px-4 py-3 text-left transition ${
                              isActive
                                ? "border-slate-900 bg-slate-950 text-white shadow-[0_18px_45px_rgba(15,23,42,0.18)]"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                            }`}
                            key={treeEndpoint.id}
                            onClick={() => onSelectEndpoint(treeEndpoint.id)}
                            type="button"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{treeEndpoint.name}</p>
                                <p className={`mt-2 truncate text-xs ${isActive ? "text-slate-300" : "text-slate-500"}`}>
                                  {`${treeEndpoint.method} · ${treeEndpoint.path}`}
                                </p>
                              </div>
                              <span className={getMethodBadgeClasses(treeEndpoint.method, isActive)}>{treeEndpoint.method}</span>
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
  );
}

function Badge({ label, tone }: { label: string; tone: "amber" | "emerald" | "sky" | "slate" }) {
  const toneClasses =
    tone === "emerald"
      ? "bg-emerald-100 text-emerald-800"
      : tone === "amber"
        ? "bg-amber-100 text-amber-800"
        : tone === "sky"
          ? "bg-sky-100 text-sky-800"
          : "bg-slate-100 text-slate-600";

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

function MiniStatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function EndpointHero({
  endpoint,
  latestMockRelease,
  parameterCount,
  responseCount,
  versionCount,
  mockReleaseCount
}: {
  endpoint: EndpointDetail;
  latestMockRelease: MockReleaseDetail | null;
  parameterCount: number;
  responseCount: number;
  versionCount: number;
  mockReleaseCount: number;
}) {
  const { t } = useI18n();

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/60 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.16),_transparent_25%),radial-gradient(circle_at_bottom_left,_rgba(15,23,42,0.06),_transparent_28%),linear-gradient(145deg,_rgba(255,255,255,0.98),_rgba(241,245,249,0.92))] p-6 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className={getMethodBadgeClasses(endpoint.method)}>{endpoint.method}</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {formatEndpointStatusLabel(endpoint.status, t)}
            </span>
            {endpoint.releasedVersionLabel ? <Badge label={endpoint.releasedVersionLabel} tone="slate" /> : null}
            {latestMockRelease ? <Badge label={`Mock #${latestMockRelease.releaseNo}`} tone="emerald" /> : null}
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{endpoint.name}</h2>
          <p className="mt-3 rounded-[1.4rem] border border-slate-200/80 bg-white/85 px-4 py-3 font-mono text-sm text-slate-700">{endpoint.path}</p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
            {endpoint.description || t("docs.hero.noDescription")}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:w-[360px]">
          <MetricCard label={t("docs.metric.parameters")} value={String(parameterCount)} />
          <MetricCard label={t("docs.metric.responses")} value={String(responseCount)} />
          <MetricCard label={t("docs.metric.versions")} value={String(versionCount)} />
          <MetricCard label={t("docs.metric.mockReleases")} value={String(mockReleaseCount)} />
        </div>
      </div>
    </section>
  );
}

function ParameterSurface({
  sections
}: {
  sections: ReturnType<typeof groupParameters>;
}) {
  const { t } = useI18n();

  return (
    <section className="rounded-[2rem] border border-white/60 bg-white/78 p-6 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{t("contract.parametersEyebrow")}</p>
        <h3 className="text-2xl font-semibold tracking-tight text-slate-950">{t("contract.parametersTitle")}</h3>
        <p className="text-sm leading-6 text-slate-600">{t("contract.parametersDetail")}</p>
      </div>

      {sections.length === 0 ? (
        <div className="mt-5 rounded-[1.7rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500">
          {t("contract.parametersEmpty")}
        </div>
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {sections.map((section) => (
            <section className="rounded-[1.7rem] border border-slate-200/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.92))] p-5 shadow-[0_18px_42px_rgba(15,23,42,0.05)]" key={section.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-950">{formatParameterSectionLabel(section.id, t)}</p>
                  <p className="mt-2 text-sm text-slate-500">{t("contract.fields", { count: section.items.length })}</p>
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {section.items.length}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {section.items.map((parameter) => (
                  <ContractItemCard
                    detail={parameter.description || t("contract.noDescription")}
                    key={`${section.id}-${parameter.id}`}
                    meta={[
                      parameter.dataType,
                      parameter.required ? t("contract.required") : t("contract.optional"),
                      parameter.exampleValue ? t("contract.example", { value: parameter.exampleValue }) : null
                    ]}
                    title={parameter.name}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

function ResponseSurface({
  sections
}: {
  sections: ReturnType<typeof groupResponses>;
}) {
  const { t } = useI18n();

  return (
    <section className="rounded-[2rem] border border-white/60 bg-white/78 p-6 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{t("contract.responsesEyebrow")}</p>
        <h3 className="text-2xl font-semibold tracking-tight text-slate-950">{t("contract.responsesTitle")}</h3>
        <p className="text-sm leading-6 text-slate-600">{t("contract.responsesDetail")}</p>
      </div>

      {sections.length === 0 ? (
        <div className="mt-5 rounded-[1.7rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500">
          {t("contract.responsesEmpty")}
        </div>
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {sections.map((section) => (
            <section className="rounded-[1.7rem] border border-slate-200/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.92))] p-5 shadow-[0_18px_42px_rgba(15,23,42,0.05)]" key={section.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-950">{section.label}</p>
                  <p className="mt-2 text-sm text-slate-500">{t("contract.fields", { count: section.items.length })}</p>
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {section.items.length}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {section.items.map((response) => (
                  <ContractItemCard
                    detail={response.description || t("contract.noDescription")}
                    key={`${section.id}-${response.id}`}
                    meta={[
                      response.mediaType,
                      response.dataType,
                      response.required ? t("contract.required") : t("contract.optional"),
                      response.exampleValue ? t("contract.example", { value: response.exampleValue }) : null
                    ]}
                    title={response.name || t("contract.unnamedField")}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
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

function ContractItemCard({
  title,
  detail,
  meta
}: {
  title: string;
  detail: string;
  meta: Array<string | null>;
}) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-white px-4 py-4">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {meta.filter((item): item is string => Boolean(item)).map((item) => (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500" key={item}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function VersionPosture({
  endpoint,
  liveVersion,
  versions
}: {
  endpoint: EndpointDetail;
  liveVersion: VersionDetail | null;
  versions: VersionDetail[];
}) {
  const { t } = useI18n();

  return (
    <section
      aria-label={t("docs.version.region")}
      className="overflow-hidden rounded-[2rem] border border-slate-900/80 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_28%),linear-gradient(145deg,_rgba(15,23,42,0.98),_rgba(30,41,59,0.94),_rgba(51,65,85,0.92))] p-6 text-white shadow-[0_24px_64px_rgba(15,23,42,0.22)]"
      role="region"
    >
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">{t("docs.version.region")}</p>
        <h3 className="text-2xl font-semibold tracking-tight">{t("docs.version.title")}</h3>
        <p className="text-sm leading-6 text-slate-300">
          {liveVersion
            ? t("docs.version.detailLive")
            : t("docs.version.detailDraft")}
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <GlassMetricCard label={t("docs.version.currentLane")} value={formatEndpointStatusLabel(endpoint.status, t)} />
        <GlassMetricCard
          label={t("docs.version.liveSnapshot")}
          value={
            endpoint.releasedVersionLabel
              ? t("docs.version.livePrefix", { version: endpoint.releasedVersionLabel })
              : liveVersion?.version
                ? t("docs.version.livePrefix", { version: liveVersion.version })
                : t("docs.version.draftLane")
          }
        />
      </div>

      {versions.length === 0 ? (
        <div className="mt-5 rounded-[1.6rem] border border-white/12 bg-white/5 px-4 py-5 text-sm text-slate-300">
          {t("docs.version.noVersions")}
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {versions.map((version) => (
            <div className="rounded-[1.55rem] border border-white/12 bg-white/6 p-4 backdrop-blur-sm" key={version.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {version.released
                      ? t("docs.version.version", { version: version.version })
                      : t("docs.version.snapshot", { version: version.version })}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{version.changeSummary || t("docs.version.noSummary")}</p>
                </div>
                {version.released ? (
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-100">
                    {t("docs.version.releasedBadge")}
                  </span>
                ) : (
                  <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">
                    {t("docs.version.snapshotBadge")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MockReleasePosture({
  latestMockRelease,
  mockReleases
}: {
  latestMockRelease: MockReleaseDetail | null;
  mockReleases: MockReleaseDetail[];
}) {
  const { t } = useI18n();

  return (
    <section className="rounded-[2rem] border border-white/60 bg-white/78 p-6 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{t("docs.mock.eyebrow")}</p>
        <h3 className="text-2xl font-semibold tracking-tight text-slate-950">{t("docs.mock.title")}</h3>
        <p className="text-sm leading-6 text-slate-600">{t("docs.mock.detail")}</p>
      </div>

      {latestMockRelease ? (
        <div className="mt-5 rounded-[1.8rem] border border-emerald-200/80 bg-[linear-gradient(145deg,_rgba(236,253,245,0.96),_rgba(209,250,229,0.88))] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{t("docs.mock.latestPublication")}</p>
              <p className="mt-3 text-2xl font-semibold text-slate-950">{t("docs.mock.release", { count: latestMockRelease.releaseNo })}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {formatTimestampLabel(latestMockRelease.createdAt) || t("docs.mock.timestampUnavailable")}
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">
              {t("docs.mock.latest")}
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-[1.7rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500">
          {t("docs.mock.empty")}
        </div>
      )}

      {mockReleases.length > 0 ? (
        <div className="mt-5 space-y-3">
          {mockReleases.map((release) => (
            <div className="rounded-[1.55rem] border border-slate-200/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.92))] p-4" key={release.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{t("docs.mock.publishedRelease", { count: release.releaseNo })}</p>
                  <p className="mt-2 text-sm text-slate-500">{formatTimestampLabel(release.createdAt) || t("docs.mock.timestampUnavailable")}</p>
                </div>
                {release.id === latestMockRelease?.id ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                    {t("docs.mock.activeLatest")}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
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

function getMethodBadgeClasses(method: string, isActive = false) {
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

function formatProjectAccessLabel(role: string | null | undefined, t: (key: string, values?: Record<string, string | number>) => string) {
  switch (role) {
    case "project_admin":
      return t("project.access.admin");
    case "editor":
      return t("project.access.editor");
    case "tester":
      return t("project.access.tester");
    case "viewer":
      return t("project.access.viewer");
    default:
      return formatProjectAccess(role);
  }
}

function formatParameterSectionLabel(sectionId: string, t: (key: string, values?: Record<string, string | number>) => string) {
  switch (sectionId) {
    case "body":
      return "Body parameters";
    case "cookie":
      return "Cookie parameters";
    case "header":
      return "Header parameters";
    case "path":
      return "路径参数";
    case "query":
      return "查询参数";
    default:
      return sectionId;
  }
}

function formatEndpointStatusLabel(status: string | null | undefined, t: (key: string, values?: Record<string, string | number>) => string) {
  switch (status) {
    case "released":
      return t("docs.version.releasedBadge");
    case "review":
      return "审核中";
    case "deprecated":
      return "已废弃";
    case "archived":
      return "已归档";
    default:
      return t("docs.version.draftLane");
  }
}

function formatTimestampLabel(value: string | null | undefined) {
  if (!value) {
    return null;
  }

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
