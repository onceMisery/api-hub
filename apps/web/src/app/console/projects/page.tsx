"use client";

import { createProject, fetchProjects, isApiRequestError, type ProjectSummary } from "@api-hub/api-sdk";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { SessionBar } from "../../../features/auth/components/session-bar";
import { ProjectCatalogToolbar } from "../../../features/projects/components/project-catalog-toolbar";
import {
  buildProjectCatalogGroups,
  filterProjects,
  normalizeProjectKey,
  type ProjectCatalogFilter,
  type ProjectCreateDraft,
  validateProjectDraft
} from "../../../features/projects/components/project-catalog-utils";
import { ProjectCard } from "../../../features/projects/components/project-card";
import { ProjectCreateDrawer } from "../../../features/projects/components/project-create-drawer";
import { useI18n } from "../../../lib/ui-preferences";

const RADAR_LIMIT = 3;

type TranslationFn = ReturnType<typeof useI18n>["t"];

export default function ProjectsPage() {
  const { push, replace } = useRouter();
  const { t } = useI18n();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ProjectCatalogFilter>("all");
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [hasEditedProjectKey, setHasEditedProjectKey] = useState(false);
  const [createDraft, setCreateDraft] = useState<ProjectCreateDraft>({
    name: "",
    projectKey: "",
    description: ""
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (hasEditedProjectKey) {
      return;
    }

    setCreateDraft((current) => ({
      ...current,
      projectKey: normalizeProjectKey(current.name)
    }));
  }, [createDraft.name, hasEditedProjectKey]);

  useEffect(() => {
    let isMounted = true;

    async function loadProjects() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchProjects();
        if (!isMounted) {
          return;
        }

        setProjects(response.data);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        if (isApiRequestError(loadError) && loadError.status === 401) {
          replace("/login");
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Failed to load projects");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProjects();

    return () => {
      isMounted = false;
    };
  }, [replace]);

  const visibleProjects = useMemo(() => filterProjects(projects, searchQuery, activeFilter), [activeFilter, projects, searchQuery]);
  const groups = useMemo(() => buildProjectCatalogGroups(projects, t), [projects, t]);
  const editableCount = useMemo(() => projects.filter((project) => project.canWrite).length, [projects]);
  const manageCount = useMemo(() => projects.filter((project) => project.canManageMembers).length, [projects]);
  const reviewCount = useMemo(() => projects.filter((project) => !project.canWrite).length, [projects]);
  const debugRuleTotal = useMemo(
    () => projects.reduce((total, project) => total + project.debugAllowedHosts.length, 0),
    [projects]
  );
  const activeGroup = useMemo(() => groups.find((group) => group.filter === activeFilter) ?? groups[0] ?? null, [activeFilter, groups]);
  const draftErrors = useMemo(() => validateProjectDraft(createDraft), [createDraft]);
  const radarProjects = useMemo(
    () => [...visibleProjects].sort(rankProjectsForRadar).slice(0, RADAR_LIMIT),
    [visibleProjects]
  );
  const writableCoverage = projects.length === 0 ? 0 : Math.round((editableCount / projects.length) * 100);

  const pulseMetrics = [
    { label: t("catalog.pulse.groups"), value: groups.length },
    { label: t("catalog.pulse.writable"), value: editableCount },
    { label: t("catalog.pulse.governance"), value: manageCount },
    { label: t("catalog.pulse.debugRules"), value: debugRuleTotal }
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-[1400px] flex-col gap-6 p-6 text-slate-900">
      <SessionBar />
      <ProjectCatalogToolbar
        activeFilter={activeFilter}
        editableCount={editableCount}
        groups={groups}
        manageCount={manageCount}
        onCreate={() => {
          setCreateError(null);
          setIsCreateDrawerOpen(true);
        }}
        onFilterChange={setActiveFilter}
        onSearchChange={setSearchQuery}
        projectCount={projects.length}
        reviewCount={reviewCount}
        searchQuery={searchQuery}
      />

      {error ? (
        <div className="rounded-[2rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-[2rem] border border-slate-900/80 bg-[linear-gradient(180deg,#1d2028_0%,#0b0d11_100%)] p-5 text-white shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{t("catalog.activeGroup")}</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">{activeGroup?.label ?? t("catalog.group.all")}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">{activeGroup?.description ?? t("catalog.group.all.description")}</p>
          <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/6 px-4 py-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{t("catalog.visibleProjects")}</p>
            <p className="mt-2 text-3xl font-semibold">{visibleProjects.length}</p>
            <p className="mt-2 text-sm text-slate-300">
              {searchQuery.trim() ? t("catalog.filteredBy", { query: searchQuery.trim() }) : t("catalog.ready")}
            </p>
          </div>
        </aside>

        <div className="space-y-5">
          {!isLoading && projects.length > 0 ? (
            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.95fr)]">
              <ProjectRadarPanel
                activeGroupLabel={activeGroup?.label ?? t("catalog.group.all")}
                projects={radarProjects}
                searchQuery={searchQuery}
                t={t}
                visibleCount={visibleProjects.length}
              />
              <OperationsPulsePanel
                metrics={pulseMetrics}
                t={t}
                totalProjects={projects.length}
                writableCount={editableCount}
                writableCoverage={writableCoverage}
              />
            </section>
          ) : null}

          {isLoading ? (
            <div className="app-shell-card rounded-[2rem] px-6 py-10 text-sm text-slate-500">{t("catalog.loading")}</div>
          ) : projects.length === 0 ? (
            <section className="app-shell-card rounded-[2rem] px-6 py-12 text-center">
              <p className="text-base font-semibold text-slate-950">{t("catalog.emptyAll")}</p>
              <p className="mt-3 text-sm leading-6 text-slate-500">{t("catalog.emptyAllDetail")}</p>
              <button
                className="app-button-primary mt-6 rounded-2xl px-4 py-3 text-sm font-medium transition hover:opacity-90"
                onClick={() => {
                  setCreateError(null);
                  setIsCreateDrawerOpen(true);
                }}
                type="button"
              >
                {t("catalog.createProject")}
              </button>
            </section>
          ) : (
            <>
              <section className="app-shell-card rounded-[2rem] px-6 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{t("catalog.inventoryEyebrow")}</p>
                <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                      {t("catalog.inventoryTitle", { group: activeGroup?.label ?? t("catalog.group.all") })}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {searchQuery.trim()
                        ? t("catalog.filteredBy", { query: searchQuery.trim() })
                        : t("catalog.inventoryDetail", { count: visibleProjects.length })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <MetricPill label={t("catalog.visibleProjects")} value={visibleProjects.length} />
                    <MetricPill label={t("catalog.pulse.writable")} value={editableCount} />
                    <MetricPill label={t("catalog.pulse.governance")} value={manageCount} />
                  </div>
                </div>
              </section>

              {visibleProjects.length === 0 ? (
                <section className="app-shell-card rounded-[2rem] px-6 py-10 text-center text-sm text-slate-500">
                  {t("catalog.empty")}
                </section>
              ) : (
                <section className="grid gap-5 md:grid-cols-2">
                  {visibleProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      </section>

      <ProjectCreateDrawer
        draft={createDraft}
        errors={draftErrors}
        isOpen={isCreateDrawerOpen}
        isSubmitting={isCreating}
        onChangeDescription={(value) => {
          setCreateError(null);
          setCreateDraft((current) => ({ ...current, description: value }));
        }}
        onChangeName={(value) => {
          setCreateError(null);
          setCreateDraft((current) => ({ ...current, name: value }));
        }}
        onChangeProjectKey={(value) => {
          setCreateError(null);
          setHasEditedProjectKey(true);
          setCreateDraft((current) => ({ ...current, projectKey: normalizeProjectKey(value) }));
        }}
        onClose={handleCloseDrawer}
        onSubmit={() => void handleCreateProject()}
        submitError={createError}
      />
    </main>
  );

  function handleCloseDrawer() {
    setIsCreateDrawerOpen(false);
    setCreateError(null);
    setHasEditedProjectKey(false);
    setCreateDraft({
      name: "",
      projectKey: "",
      description: ""
    });
  }

  async function handleCreateProject() {
    const errors = validateProjectDraft(createDraft);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await createProject({
        name: createDraft.name.trim(),
        projectKey: createDraft.projectKey.trim(),
        description: createDraft.description.trim(),
        debugAllowedHosts: []
      });
      handleCloseDrawer();
      push(`/console/projects/${response.data.id}`);
    } catch (createError) {
      if (isApiRequestError(createError) && createError.status === 401) {
        replace("/login");
        return;
      }

      setCreateError(createError instanceof Error ? createError.message : "Failed to create project");
    } finally {
      setIsCreating(false);
    }
  }
}

function ProjectRadarPanel({
  activeGroupLabel,
  projects,
  searchQuery,
  t,
  visibleCount
}: {
  activeGroupLabel: string;
  projects: ProjectSummary[];
  searchQuery: string;
  t: TranslationFn;
  visibleCount: number;
}) {
  return (
    <section className="app-shell-card-strong overflow-hidden rounded-[2rem] p-6 text-white">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{t("catalog.radarEyebrow")}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">{t("catalog.radarTitle")}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">{t("catalog.radarDetail")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DashboardBadge label={t("catalog.radarScope", { group: activeGroupLabel })} />
          <DashboardBadge
            label={
              searchQuery.trim()
                ? t("catalog.filteredBy", { query: searchQuery.trim() })
                : t("catalog.radarVisibleCount", { count: visibleCount })
            }
            tone="accent"
          />
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-white/6 px-5 py-5 text-sm text-slate-300">
          {t("catalog.radarEmpty")}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {projects.map((project, index) => (
            <article
              className="rounded-[1.7rem] border border-white/10 bg-white/6 p-5 shadow-[0_20px_50px_rgba(2,6,23,0.22)]"
              key={project.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{project.projectKey}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{project.name}</h3>
                </div>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                  {index + 1}
                </span>
              </div>

              <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-300">
                {project.description || t("project.fallbackDescription")}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <DashboardBadge label={resolveRadarStatus(project, t)} tone="accent" />
                <DashboardBadge label={t("project.debugRuleCount", { count: project.debugAllowedHosts.length })} />
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                  href={`/console/projects/${project.id}`}
                >
                  {t("project.action.enter")}
                </Link>
                <Link
                  className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                  href={`/console/projects/${project.id}/browse`}
                >
                  {t("project.action.browseDocs")}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function OperationsPulsePanel({
  metrics,
  t,
  totalProjects,
  writableCount,
  writableCoverage
}: {
  metrics: Array<{ label: string; value: number }>;
  t: TranslationFn;
  totalProjects: number;
  writableCount: number;
  writableCoverage: number;
}) {
  return (
    <section className="app-shell-card rounded-[2rem] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{t("catalog.pulseEyebrow")}</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{t("catalog.pulseTitle")}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{t("catalog.pulseDetail")}</p>

      <div className="mt-6 space-y-3">
        {metrics.map((metric) => (
          <div
            className="flex items-center justify-between rounded-[1.4rem] border border-slate-200/70 bg-white/70 px-4 py-3"
            key={metric.label}
          >
            <span className="text-sm font-medium text-slate-600">{metric.label}</span>
            <span className="text-lg font-semibold text-slate-950">{metric.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-[1.6rem] border border-sky-200/60 bg-[radial-gradient(circle_at_top,_rgba(191,219,254,0.85),_rgba(239,246,255,0.98)_60%)] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">{t("catalog.pulse.coverageLabel")}</p>
        <p className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">{writableCoverage}%</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {t("catalog.pulse.coverageDetail", { editable: writableCount, total: totalProjects })}
        </p>
      </div>
    </section>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-full border border-slate-200/70 bg-white/70 px-4 py-2 text-sm text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
      <span className="font-semibold text-slate-950">{value}</span> {label}
    </div>
  );
}

function DashboardBadge({
  label,
  tone = "muted"
}: {
  label: string;
  tone?: "accent" | "muted";
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
        tone === "accent"
          ? "border border-sky-300/20 bg-sky-400/10 text-sky-100"
          : "border border-white/10 bg-white/8 text-slate-200"
      }`}
    >
      {label}
    </span>
  );
}

function resolveRadarStatus(project: ProjectSummary, t: TranslationFn) {
  if (project.canManageMembers) {
    return t("catalog.radar.manage");
  }

  if (project.canWrite) {
    return t("catalog.radar.writable");
  }

  return t("catalog.radar.review");
}

function rankProjectsForRadar(left: ProjectSummary, right: ProjectSummary) {
  const leftScore =
    Number(left.canManageMembers) * 4 + Number(left.canWrite) * 2 + Math.min(left.debugAllowedHosts.length, 3);
  const rightScore =
    Number(right.canManageMembers) * 4 + Number(right.canWrite) * 2 + Math.min(right.debugAllowedHosts.length, 3);

  if (leftScore !== rightScore) {
    return rightScore - leftScore;
  }

  return left.name.localeCompare(right.name);
}
