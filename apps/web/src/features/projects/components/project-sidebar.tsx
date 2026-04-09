"use client";

import type { ModuleTreeItem } from "@api-hub/api-sdk";
import { useState } from "react";

type ProjectSidebarProps = {
  modules: ModuleTreeItem[];
  selectedEndpointId: number | null;
  onCreateEndpoint: (groupId: number, payload: { name: string; method: string; path: string; description: string }) => Promise<void>;
  onCreateGroup: (moduleId: number, payload: { name: string }) => Promise<void>;
  onCreateModule: (payload: { name: string }) => Promise<void>;
  onDeleteGroup: (groupId: number) => Promise<void>;
  onDeleteModule: (moduleId: number) => Promise<void>;
  onRenameGroup: (groupId: number, payload: { name: string }) => Promise<void>;
  onRenameModule: (moduleId: number, payload: { name: string }) => Promise<void>;
  onSelectEndpoint: (endpointId: number) => void;
};

export function ProjectSidebar({
  modules,
  onCreateEndpoint,
  onCreateGroup,
  onCreateModule,
  onDeleteGroup,
  onDeleteModule,
  onRenameGroup,
  onRenameModule,
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
            onDeleteGroup={onDeleteGroup}
            onDeleteModule={onDeleteModule}
            onRenameGroup={onRenameGroup}
            onRenameModule={onRenameModule}
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
  onDeleteGroup,
  onDeleteModule,
  onRenameGroup,
  onRenameModule,
  onSelectEndpoint,
  selectedEndpointId
}: {
  module: ModuleTreeItem;
  onCreateEndpoint: (groupId: number, payload: { name: string; method: string; path: string; description: string }) => Promise<void>;
  onCreateGroup: (moduleId: number, payload: { name: string }) => Promise<void>;
  onDeleteGroup: (groupId: number) => Promise<void>;
  onDeleteModule: (moduleId: number) => Promise<void>;
  onRenameGroup: (groupId: number, payload: { name: string }) => Promise<void>;
  onRenameModule: (moduleId: number, payload: { name: string }) => Promise<void>;
  onSelectEndpoint: (endpointId: number) => void;
  selectedEndpointId: number | null;
}) {
  const [groupName, setGroupName] = useState("");
  const [moduleDraftName, setModuleDraftName] = useState(module.name);

  return (
    <section className="space-y-3 rounded-[1.7rem] border border-slate-200/70 bg-white/70 p-3">
      <div className="rounded-[1.4rem] bg-slate-950 px-4 py-4 text-white">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">{module.name}</p>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">
            module
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <label className="space-y-2 text-slate-100">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Module {module.id} name</span>
            <input
              aria-label={`Module ${module.id} name`}
              className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-300/70 focus:border-white/30"
              onChange={(event) => setModuleDraftName(event.target.value)}
              value={moduleDraftName}
            />
          </label>
          <button
            aria-label={`Rename module ${module.id}`}
            className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15"
            onClick={() => void onRenameModule(module.id, { name: moduleDraftName.trim() || module.name })}
            type="button"
          >
            Rename
          </button>
          <button
            aria-label={`Delete module ${module.id}`}
            className="rounded-2xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-100 transition hover:bg-rose-500/20"
            onClick={() => void onDeleteModule(module.id)}
            type="button"
          >
            Delete
          </button>
        </div>
      </div>

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
            onDeleteGroup={onDeleteGroup}
            onRenameGroup={onRenameGroup}
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
  onDeleteGroup,
  onRenameGroup,
  onSelectEndpoint,
  selectedEndpointId
}: {
  group: ModuleTreeItem["groups"][number];
  onCreateEndpoint: (groupId: number, payload: { name: string; method: string; path: string; description: string }) => Promise<void>;
  onDeleteGroup: (groupId: number) => Promise<void>;
  onRenameGroup: (groupId: number, payload: { name: string }) => Promise<void>;
  onSelectEndpoint: (endpointId: number) => void;
  selectedEndpointId: number | null;
}) {
  const [endpointName, setEndpointName] = useState("");
  const [endpointMethod, setEndpointMethod] = useState("GET");
  const [endpointPath, setEndpointPath] = useState("");
  const [groupDraftName, setGroupDraftName] = useState(group.name);

  return (
    <div className="space-y-3 rounded-[1.5rem] border border-slate-200/70 bg-slate-50/70 p-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Group {group.id} name</span>
          <input
            aria-label={`Group ${group.id} name`}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            onChange={(event) => setGroupDraftName(event.target.value)}
            value={groupDraftName}
          />
        </label>
        <button
          aria-label={`Rename group ${group.id}`}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300"
          onClick={() => void onRenameGroup(group.id, { name: groupDraftName.trim() || group.name })}
          type="button"
        >
          Rename
        </button>
        <button
          aria-label={`Delete group ${group.id}`}
          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
          onClick={() => void onDeleteGroup(group.id)}
          type="button"
        >
          Delete
        </button>
      </div>

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
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
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
