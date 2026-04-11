"use client";

import { createProject, fetchProjects, isApiRequestError, type ProjectSummary } from "@api-hub/api-sdk";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { SessionBar } from "../../../features/auth/components/session-bar";
import { ProjectCatalogToolbar } from "../../../features/projects/components/project-catalog-toolbar";
import { ProjectCard } from "../../../features/projects/components/project-card";
import { ProjectCreateDrawer } from "../../../features/projects/components/project-create-drawer";
import {
  filterProjects,
  normalizeProjectKey,
  type ProjectCatalogFilter,
  type ProjectCreateDraft,
  validateProjectDraft
} from "../../../features/projects/components/project-catalog-utils";

export default function ProjectsPage() {
  const { push, replace } = useRouter();
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
  const editableCount = useMemo(() => projects.filter((project) => project.canWrite).length, [projects]);
  const manageCount = useMemo(() => projects.filter((project) => project.canManageMembers).length, [projects]);
  const reviewCount = useMemo(() => projects.filter((project) => !project.canWrite).length, [projects]);
  const draftErrors = useMemo(() => validateProjectDraft(createDraft), [createDraft]);

  return (
    <main className="mx-auto flex min-h-screen max-w-[1320px] flex-col gap-8 p-6 text-slate-900">
      <SessionBar />
      <ProjectCatalogToolbar
        activeFilter={activeFilter}
        editableCount={editableCount}
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

      {isLoading ? (
        <div className="rounded-[2rem] border border-white/60 bg-white/75 px-6 py-10 text-sm text-slate-500 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          Loading projects...
        </div>
      ) : projects.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-slate-200 bg-white/75 px-6 py-12 text-center shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <p className="text-base font-semibold text-slate-950">No workspaces yet</p>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Create the first project to start shaping grouped endpoints, debug policies, and mock runtime snapshots.
          </p>
          <button
            className="mt-6 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            onClick={() => {
              setCreateError(null);
              setIsCreateDrawerOpen(true);
            }}
            type="button"
          >
            Create project
          </button>
        </section>
      ) : visibleProjects.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-slate-200 bg-white/75 px-6 py-10 text-center text-sm text-slate-500 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          No matching projects. Adjust the search query or access filter.
        </section>
      ) : (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </section>
      )}

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
