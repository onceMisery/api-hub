"use client";

import { createProject, fetchProjects, isApiRequestError, type ProjectSummary } from "@api-hub/api-sdk";
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
  const groups = useMemo(() => buildProjectCatalogGroups(projects), [projects]);
  const editableCount = useMemo(() => projects.filter((project) => project.canWrite).length, [projects]);
  const manageCount = useMemo(() => projects.filter((project) => project.canManageMembers).length, [projects]);
  const reviewCount = useMemo(() => projects.filter((project) => !project.canWrite).length, [projects]);
  const activeGroup = useMemo(() => groups.find((group) => group.filter === activeFilter) ?? groups[0] ?? null, [activeFilter, groups]);
  const draftErrors = useMemo(() => validateProjectDraft(createDraft), [createDraft]);

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
        <aside className="app-shell-card rounded-[2rem] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Active Group</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">{activeGroup?.label ?? t("catalog.group.all")}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">{activeGroup?.description ?? t("catalog.group.all.description")}</p>
          <div className="mt-5 rounded-[1.5rem] bg-slate-950 px-4 py-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Visible Projects</p>
            <p className="mt-2 text-3xl font-semibold">{visibleProjects.length}</p>
            <p className="mt-2 text-sm text-slate-300">
              {searchQuery.trim() ? `Filtered by "${searchQuery.trim()}"` : "Ready to open the next workspace."}
            </p>
          </div>
        </aside>

        <div className="space-y-5">
          {isLoading ? (
            <div className="app-shell-card rounded-[2rem] px-6 py-10 text-sm text-slate-500">Loading projects...</div>
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
          ) : visibleProjects.length === 0 ? (
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
