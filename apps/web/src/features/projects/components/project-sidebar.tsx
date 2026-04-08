"use client";

import type { ModuleTreeItem } from "@api-hub/api-sdk";

type ProjectSidebarProps = {
  modules: ModuleTreeItem[];
  selectedEndpointId: number | null;
  onSelectEndpoint: (endpointId: number) => void;
};

export function ProjectSidebar({ modules, onSelectEndpoint, selectedEndpointId }: ProjectSidebarProps) {
  return (
    <aside className="rounded-[2rem] border border-white/60 bg-white/75 p-5 shadow-[0_24px_64px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Project Tree</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-950">Modules and endpoints</h2>
      </div>
      <div className="space-y-4">
        {modules.map((module) => (
          <section key={module.id} className="space-y-3">
            <div className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white">{module.name}</div>
            {module.groups.length === 0 ? (
              <p className="px-4 text-sm text-slate-500">No groups yet.</p>
            ) : (
              module.groups.map((group) => (
                <div key={group.id} className="space-y-2 pl-2">
                  <p className="px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{group.name}</p>
                  <div className="space-y-2">
                    {group.endpoints.map((endpoint) => {
                      const isActive = endpoint.id === selectedEndpointId;

                      return (
                        <button
                          key={endpoint.id}
                          className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                            isActive
                              ? "border-slate-900 bg-slate-950 text-white shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
                              : "border-slate-200 bg-slate-50/80 text-slate-700 hover:border-slate-300 hover:bg-white"
                          }`}
                          onClick={() => onSelectEndpoint(endpoint.id)}
                          type="button"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate text-sm font-medium">{endpoint.name}</span>
                            <span
                              className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                                isActive ? "bg-white/15 text-white" : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {endpoint.method}
                            </span>
                          </div>
                          <p className={`mt-2 truncate text-xs ${isActive ? "text-slate-300" : "text-slate-500"}`}>
                            {endpoint.path}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </section>
        ))}
      </div>
    </aside>
  );
}
