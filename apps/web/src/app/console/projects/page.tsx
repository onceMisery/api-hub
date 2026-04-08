"use client";

import { fetchProjects, isApiRequestError, type ProjectSummary } from "@api-hub/api-sdk";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ProjectCard } from "../../../features/projects/components/project-card";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
          router.replace("/login");
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
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-[1320px] flex-col gap-8 p-6 text-slate-900">
      <section className="rounded-[2.4rem] border border-white/60 bg-white/65 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.10)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Projects</p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950">API workspaces</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Browse the current project catalogue and jump straight into grouped endpoint editing.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/70 bg-slate-950 px-5 py-4 text-white shadow-[0_18px_40px_rgba(15,23,42,0.20)]">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Available</p>
            <p className="mt-2 text-2xl font-semibold">{projects.length}</p>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-[2rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div>
      ) : null}

      {isLoading ? (
        <div className="rounded-[2rem] border border-white/60 bg-white/75 px-6 py-10 text-sm text-slate-500 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          Loading projects...
        </div>
      ) : (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </section>
      )}
    </main>
  );
}
