"use client";

import {
  fetchEndpoint,
  fetchEndpointVersions,
  fetchProjectTree,
  isApiRequestError,
  type EndpointDetail,
  type ModuleTreeItem,
  type VersionDetail
} from "@api-hub/api-sdk";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { EndpointEditor } from "./endpoint-editor";
import { ProjectSidebar } from "./project-sidebar";

type ProjectShellProps = {
  projectId: number;
};

export function ProjectShell({ projectId }: ProjectShellProps) {
  const router = useRouter();
  const [modules, setModules] = useState<ModuleTreeItem[]>([]);
  const [selectedEndpointId, setSelectedEndpointId] = useState<number | null>(null);
  const [endpoint, setEndpoint] = useState<EndpointDetail | null>(null);
  const [versions, setVersions] = useState<VersionDetail[]>([]);
  const [isLoadingTree, setIsLoadingTree] = useState(true);
  const [isLoadingEndpoint, setIsLoadingEndpoint] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTree() {
      setIsLoadingTree(true);
      setError(null);

      try {
        const response = await fetchProjectTree(projectId);
        if (!isMounted) {
          return;
        }

        setModules(response.data.modules);
        setSelectedEndpointId(findFirstEndpointId(response.data.modules));
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        if (isApiRequestError(loadError) && loadError.status === 401) {
          router.replace("/login");
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Failed to load project tree");
      } finally {
        if (isMounted) {
          setIsLoadingTree(false);
        }
      }
    }

    void loadTree();

    return () => {
      isMounted = false;
    };
  }, [projectId, router]);

  useEffect(() => {
    if (!selectedEndpointId) {
      setEndpoint(null);
      setVersions([]);
      return;
    }

    const endpointId = selectedEndpointId;
    let isMounted = true;

    async function loadEndpoint() {
      setIsLoadingEndpoint(true);
      setError(null);

      try {
        const [endpointResponse, versionsResponse] = await Promise.all([
          fetchEndpoint(endpointId),
          fetchEndpointVersions(endpointId)
        ]);

        if (!isMounted) {
          return;
        }

        setEndpoint(endpointResponse.data);
        setVersions(versionsResponse.data);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        if (isApiRequestError(loadError) && loadError.status === 401) {
          router.replace("/login");
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Failed to load endpoint");
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
  }, [router, selectedEndpointId]);

  const treeStats = useMemo(() => {
    const groupCount = modules.reduce((count, module) => count + module.groups.length, 0);
    const endpointCount = modules.reduce(
      (count, module) => count + module.groups.reduce((groupTotal, group) => groupTotal + group.endpoints.length, 0),
      0
    );

    return {
      endpointCount,
      groupCount,
      moduleCount: modules.length
    };
  }, [modules]);

  return (
    <main className="mx-auto flex min-h-screen max-w-[1400px] flex-col gap-6 p-6 text-slate-900">
      <section className="rounded-[2.4rem] border border-white/60 bg-white/65 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.10)] backdrop-blur">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Project Workbench</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Project #{projectId}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Card-based workspace for modules, grouped endpoints, and version snapshots. Phase 1 runs on top of the
              in-memory backend skeleton.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Modules" value={treeStats.moduleCount} />
            <StatCard label="Groups" value={treeStats.groupCount} />
            <StatCard label="Endpoints" value={treeStats.endpointCount} />
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-[2rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        {isLoadingTree ? (
          <aside className="rounded-[2rem] border border-white/60 bg-white/75 p-5 text-sm text-slate-500 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
            Loading project tree...
          </aside>
        ) : (
          <ProjectSidebar modules={modules} onSelectEndpoint={setSelectedEndpointId} selectedEndpointId={selectedEndpointId} />
        )}
        <EndpointEditor endpoint={endpoint} isLoading={isLoadingEndpoint} versions={versions} />
      </section>
    </main>
  );
}

function findFirstEndpointId(modules: ModuleTreeItem[]) {
  for (const module of modules) {
    for (const group of module.groups) {
      if (group.endpoints.length > 0) {
        return group.endpoints[0].id;
      }
    }
  }

  return null;
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.5rem] border border-white/60 bg-slate-950 px-5 py-4 text-white shadow-[0_18px_40px_rgba(15,23,42,0.20)]">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
