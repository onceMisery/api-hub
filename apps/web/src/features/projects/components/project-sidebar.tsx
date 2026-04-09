"use client";

import type { ModuleTreeItem } from "@api-hub/api-sdk";
import { useState } from "react";

type ProjectSidebarProps = {
  modules: ModuleTreeItem[];
  selectedEndpointId: number | null;
  onCreateEndpoint: (groupId: number, payload: { name: string; method: string; path: string; description: string }) => Promise<void>;
  onCreateGroup: (moduleId: number, payload: { name: string }) => Promise<void>;
  onCreateModule: (payload: { name: string }) => Promise<void>;
  onSelectEndpoint: (endpointId: number) => void;
};

export function ProjectSidebar({
  modules,
  onCreateEndpoint,
  onCreateGroup,
  onCreateModule,
  onSelectEndpoint,
  selectedEndpointId
}: ProjectSidebarProps) {
  const [moduleName, setModuleName] = useState("");

  return (
    <aside className="rounded-[2rem] border border-white/60 bg-white/75 p-5 shadow-[0_24px_64px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Project Tree</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-950">Modules and endpoints</h2>
      </div>

      <form
        className="mb-5 space-y-2 rounded-[1.6rem] border border-slate-200 bg-white/90 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!moduleName.trim()) {
            return;
          }

          void onCreateModule({ name: moduleName.trim() }).then(() => {
            setModuleName("");
          });
        }}
      >
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">New module name</span>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            onChange={(event) => setModuleName(event.target.value)}
            placeholder="Core"
            value={moduleName}
          />
        </label>
        <button className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800" type="submit">
          Add module
        </button>
      </form>

      <div className="space-y-4">
        {modules.map((module) => (
          <ModuleSection
            key={module.id}
            module={module}
            onCreateEndpoint={onCreateEndpoint}
            onCreateGroup={onCreateGroup}
            onSelectEndpoint={onSelectEndpoint}
            selectedEndpointId={selectedEndpointId}
          />
        ))}
      </div>
    </aside>
  );
}

function ModuleSection({
  module,
  onCreateEndpoint,
  onCreateGroup,
  onSelectEndpoint,
  selectedEndpointId
}: {
  module: ModuleTreeItem;
  onCreateEndpoint: (groupId: number, payload: { name: string; method: string; path: string; description: string }) => Promise<void>;
  onCreateGroup: (moduleId: number, payload: { name: string }) => Promise<void>;
  onSelectEndpoint: (endpointId: number) => void;
  selectedEndpointId: number | null;
}) {
  const [groupName, setGroupName] = useState("");

  return (
    <section className="space-y-3">
      <div className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white">{module.name}</div>

      <form
        className="space-y-2 rounded-[1.4rem] border border-slate-200 bg-white/90 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!groupName.trim()) {
            return;
          }

          void onCreateGroup(module.id, { name: groupName.trim() }).then(() => {
            setGroupName("");
          });
        }}
      >
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">New group name</span>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            onChange={(event) => setGroupName(event.target.value)}
            placeholder="Users"
            value={groupName}
          />
        </label>
        <button className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-white" type="submit">
          Add group
        </button>
      </form>

      {module.groups.length === 0 ? (
        <p className="px-4 text-sm text-slate-500">No groups yet.</p>
      ) : (
        module.groups.map((group) => (
          <GroupSection
            key={group.id}
            group={group}
            onCreateEndpoint={onCreateEndpoint}
            onSelectEndpoint={onSelectEndpoint}
            selectedEndpointId={selectedEndpointId}
          />
        ))
      )}
    </section>
  );
}

function GroupSection({
  group,
  onCreateEndpoint,
  onSelectEndpoint,
  selectedEndpointId
}: {
  group: ModuleTreeItem["groups"][number];
  onCreateEndpoint: (groupId: number, payload: { name: string; method: string; path: string; description: string }) => Promise<void>;
  onSelectEndpoint: (endpointId: number) => void;
  selectedEndpointId: number | null;
}) {
  const [endpointName, setEndpointName] = useState("");
  const [endpointMethod, setEndpointMethod] = useState("GET");
  const [endpointPath, setEndpointPath] = useState("");

  return (
    <div className="space-y-2 pl-2">
      <p className="px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{group.name}</p>

      <form
        className="space-y-2 rounded-[1.4rem] border border-slate-200 bg-white/90 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!endpointName.trim() || !endpointPath.trim()) {
            return;
          }

          void onCreateEndpoint(group.id, {
            description: "",
            method: endpointMethod,
            name: endpointName.trim(),
            path: endpointPath.trim()
          }).then(() => {
            setEndpointName("");
            setEndpointMethod("GET");
            setEndpointPath("");
          });
        }}
      >
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">New endpoint name</span>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            onChange={(event) => setEndpointName(event.target.value)}
            placeholder="Create User"
            value={endpointName}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">New endpoint method</span>
          <select
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            onChange={(event) => setEndpointMethod(event.target.value)}
            value={endpointMethod}
          >
            {["GET", "POST", "PUT", "PATCH", "DELETE"].map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">New endpoint path</span>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-400"
            onChange={(event) => setEndpointPath(event.target.value)}
            placeholder="/users"
            value={endpointPath}
          />
        </label>

        <button className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-white" type="submit">
          Add endpoint
        </button>
      </form>

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
              <p className={`mt-2 truncate text-xs ${isActive ? "text-slate-300" : "text-slate-500"}`}>{endpoint.path}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
