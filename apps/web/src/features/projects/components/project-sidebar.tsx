"use client";

import type { ModuleTreeItem } from "@api-hub/api-sdk";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../../../lib/ui-preferences";

import {
  readProjectSidebarQuickAccess,
  recordRecentEndpoint,
  sanitizeProjectSidebarQuickAccess,
  togglePinnedEndpoint,
  writeProjectSidebarQuickAccess,
  type ProjectSidebarQuickAccessState
} from "./project-sidebar-quick-access";
import {
  collapseAllBranches,
  expandAllBranches,
  readProjectSidebarTreePreferences,
  sanitizeProjectSidebarTreePreferences,
  setProjectSidebarTreeSortMode,
  sortProjectSidebarModules,
  toggleCollapsedGroup,
  toggleCollapsedModule,
  writeProjectSidebarTreePreferences,
  type ProjectSidebarTreePreferences,
  type ProjectSidebarTreeSortMode
} from "./project-sidebar-tree-preferences";

type ProjectSidebarProps = {
  allModules?: ModuleTreeItem[];
  canWrite: boolean;
  emptyStateMessage?: string | null;
  modules: ModuleTreeItem[];
  projectId: number;
  searchQuery?: string;
  selectedEndpointId: number | null;
  onCreateEndpoint: (groupId: number, payload: { name: string; method: string; path: string; description: string }) => Promise<void>;
  onCreateGroup: (moduleId: number, payload: { name: string }) => Promise<void>;
  onCreateModule: (payload: { name: string }) => Promise<void>;
  onDeleteEndpoint: (endpointId: number) => Promise<void>;
  onDeleteGroup: (groupId: number) => Promise<void>;
  onDeleteModule: (moduleId: number) => Promise<void>;
  onRenameEndpoint: (endpointId: number, payload: { name: string; method: string; path: string; description: string }) => Promise<void>;
  onRenameGroup: (groupId: number, payload: { name: string }) => Promise<void>;
  onRenameModule: (moduleId: number, payload: { name: string }) => Promise<void>;
  onSelectEndpoint: (endpointId: number) => void;
};

export function ProjectSidebar({
  allModules,
  canWrite,
  emptyStateMessage = null,
  modules,
  projectId,
  searchQuery = "",
  onCreateEndpoint,
  onCreateGroup,
  onCreateModule,
  onDeleteEndpoint,
  onDeleteGroup,
  onDeleteModule,
  onRenameEndpoint,
  onRenameGroup,
  onRenameModule,
  onSelectEndpoint,
  selectedEndpointId
}: ProjectSidebarProps) {
  const [moduleName, setModuleName] = useState("");
  const { t } = useI18n();
  const [quickAccessState, setQuickAccessState] = useState<ProjectSidebarQuickAccessState>({
    pinnedEndpointIds: [],
    recentEndpointIds: []
  });
  const [treePreferences, setTreePreferences] = useState<ProjectSidebarTreePreferences>({
    sortMode: "project",
    collapsedModuleIds: [],
    collapsedGroupIds: []
  });
  const quickAccessModules = allModules ?? modules;
  const isSearchActive = searchQuery.trim().length > 0;
  const endpointLookup = useMemo(() => buildQuickAccessEntryLookup(quickAccessModules), [quickAccessModules]);
  const availableEndpointIds = useMemo(() => Array.from(endpointLookup.keys()), [endpointLookup]);
  const availableModuleIds = useMemo(() => quickAccessModules.map((module) => module.id), [quickAccessModules]);
  const availableGroupIds = useMemo(
    () => quickAccessModules.flatMap((module) => module.groups.map((group) => group.id)),
    [quickAccessModules]
  );
  const pinnedEntries = useMemo(
    () => resolveQuickAccessEntries(quickAccessState.pinnedEndpointIds, endpointLookup),
    [endpointLookup, quickAccessState.pinnedEndpointIds]
  );
  const recentEntries = useMemo(
    () =>
      resolveQuickAccessEntries(
        quickAccessState.recentEndpointIds.filter((endpointId) => !quickAccessState.pinnedEndpointIds.includes(endpointId)),
        endpointLookup
      ),
    [endpointLookup, quickAccessState.pinnedEndpointIds, quickAccessState.recentEndpointIds]
  );
  const visibleModules = useMemo(
    () => sortProjectSidebarModules(modules, treePreferences.sortMode),
    [modules, treePreferences.sortMode]
  );
  const visibleTreeCounts = useMemo(() => countTreeNodes(visibleModules), [visibleModules]);

  useEffect(() => {
    const nextState = sanitizeProjectSidebarQuickAccess(readProjectSidebarQuickAccess(projectId), availableEndpointIds);
    setQuickAccessState(nextState);
    writeProjectSidebarQuickAccess(projectId, nextState);
  }, [availableEndpointIds, projectId]);

  useEffect(() => {
    const nextState = sanitizeProjectSidebarTreePreferences(
      readProjectSidebarTreePreferences(projectId),
      availableModuleIds,
      availableGroupIds
    );
    setTreePreferences(nextState);
    writeProjectSidebarTreePreferences(projectId, nextState);
  }, [availableGroupIds, availableModuleIds, projectId]);

  useEffect(() => {
    if (!selectedEndpointId || !endpointLookup.has(selectedEndpointId)) {
      return;
    }

    setQuickAccessState((currentState) => {
      const nextState = recordRecentEndpoint(
        sanitizeProjectSidebarQuickAccess(currentState, availableEndpointIds),
        selectedEndpointId
      );

      if (areQuickAccessStatesEqual(currentState, nextState)) {
        return currentState;
      }

      writeProjectSidebarQuickAccess(projectId, nextState);
      return nextState;
    });
  }, [availableEndpointIds, endpointLookup, projectId, selectedEndpointId]);

  function handleTogglePin(endpointId: number) {
    setQuickAccessState((currentState) => {
      const nextState = togglePinnedEndpoint(
        sanitizeProjectSidebarQuickAccess(currentState, availableEndpointIds),
        endpointId
      );
      writeProjectSidebarQuickAccess(projectId, nextState);
      return nextState;
    });
  }

  function updateTreePreferences(
    updater: (currentState: ProjectSidebarTreePreferences) => ProjectSidebarTreePreferences
  ) {
    setTreePreferences((currentState) => {
      const nextState = updater(
        sanitizeProjectSidebarTreePreferences(currentState, availableModuleIds, availableGroupIds)
      );
      writeProjectSidebarTreePreferences(projectId, nextState);
      return nextState;
    });
  }

  function handleSortModeChange(sortMode: ProjectSidebarTreeSortMode) {
    updateTreePreferences((currentState) => setProjectSidebarTreeSortMode(currentState, sortMode));
  }

  function handleCollapseAll() {
    updateTreePreferences((currentState) =>
      collapseAllBranches(currentState, availableModuleIds, availableGroupIds)
    );
  }

  function handleExpandAll() {
    updateTreePreferences((currentState) => expandAllBranches(currentState));
  }

  function handleToggleModuleCollapse(moduleId: number) {
    updateTreePreferences((currentState) => toggleCollapsedModule(currentState, moduleId));
  }

  function handleToggleGroupCollapse(groupId: number) {
    updateTreePreferences((currentState) => toggleCollapsedGroup(currentState, groupId));
  }

  return (
    <aside className="rounded-[2rem] border border-white/60 bg-white/75 p-5 shadow-[0_24px_64px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{t("Project Tree")}</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-950">{t("Modules and endpoints")}</h2>
      </div>

      <QuickAccessPanel pinnedEntries={pinnedEntries} recentEntries={recentEntries} onSelectEndpoint={onSelectEndpoint} />
      <NavigationDeck
        isSearchActive={isSearchActive}
        onCollapseAll={handleCollapseAll}
        onExpandAll={handleExpandAll}
        onSortModeChange={handleSortModeChange}
        sortMode={treePreferences.sortMode}
        visibleTreeCounts={visibleTreeCounts}
      />

      <form
        className="mb-5 space-y-2 rounded-[1.6rem] border border-slate-200 bg-white/90 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canWrite || !moduleName.trim()) {
            return;
          }

          void onCreateModule({ name: moduleName.trim() }).then(() => {
            setModuleName("");
          });
        }}
      >
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">{t("New module name")}</span>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
            disabled={!canWrite}
            onChange={(event) => setModuleName(event.target.value)}
            placeholder={t("Core")}
            value={moduleName}
          />
        </label>
        <button className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400" disabled={!canWrite} type="submit">
          {t("Add module")}
        </button>
      </form>

      <div className="space-y-4">
        {visibleModules.length === 0 ? (
          <div className="rounded-[1.6rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500">
            {emptyStateMessage ?? t("No matching nodes.")}
          </div>
        ) : (
          visibleModules.map((module) => (
            <ModuleSection
              canWrite={canWrite}
              collapsedGroupIds={treePreferences.collapsedGroupIds}
              collapsedModuleIds={treePreferences.collapsedModuleIds}
              isSearchActive={isSearchActive}
              key={module.id}
              module={module}
              onCreateEndpoint={onCreateEndpoint}
              onCreateGroup={onCreateGroup}
              onDeleteEndpoint={onDeleteEndpoint}
              onDeleteGroup={onDeleteGroup}
              onDeleteModule={onDeleteModule}
              onRenameEndpoint={onRenameEndpoint}
              onRenameGroup={onRenameGroup}
              onRenameModule={onRenameModule}
              onToggleGroupCollapse={handleToggleGroupCollapse}
              onToggleModuleCollapse={handleToggleModuleCollapse}
              onTogglePin={handleTogglePin}
              onSelectEndpoint={onSelectEndpoint}
              pinnedEndpointIds={quickAccessState.pinnedEndpointIds}
              selectedEndpointId={selectedEndpointId}
            />
          ))
        )}
      </div>
    </aside>
  );
}

type QuickAccessEntry = {
  endpointId: number;
  groupName: string;
  method: string;
  moduleName: string;
  name: string;
  path: string;
};

function QuickAccessPanel({
  pinnedEntries,
  recentEntries,
  onSelectEndpoint
}: {
  pinnedEntries: QuickAccessEntry[];
  recentEntries: QuickAccessEntry[];
  onSelectEndpoint: (endpointId: number) => void;
}) {
  const { t } = useI18n();
  return (
    <section className="mb-5 rounded-[1.8rem] border border-white/60 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(245,241,232,0.92)_46%,_rgba(226,232,240,0.82)_100%)] p-4 shadow-[0_20px_52px_rgba(15,23,42,0.07)]">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{t("Quick access")}</p>
        <h3 className="text-base font-semibold tracking-tight text-slate-950">{t("Pinned routes and recent focus lanes.")}</h3>
        <p className="text-sm leading-6 text-slate-600">{t("Personal shortcuts stay local to this browser and help you jump past large project trees.")}</p>
      </div>

      <div className="mt-4 space-y-4">
        <ShortcutLane
          emptyCopy={t("Pin important endpoints from the tree below.")}
          entries={pinnedEntries}
          label={t("Pinned")}
          onSelectEndpoint={onSelectEndpoint}
        />
        <ShortcutLane
          emptyCopy={t("Recently opened endpoints will appear here.")}
          entries={recentEntries}
          label={t("Recent")}
          onSelectEndpoint={onSelectEndpoint}
        />
      </div>
    </section>
  );
}

function ShortcutLane({
  emptyCopy,
  entries,
  label,
  onSelectEndpoint
}: {
  emptyCopy: string;
  entries: QuickAccessEntry[];
  label: string;
  onSelectEndpoint: (endpointId: number) => void;
}) {
  const { t } = useI18n();
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
        <span className="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {entries.length}
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-[1.4rem] border border-dashed border-slate-200 bg-white/65 px-4 py-4 text-sm text-slate-500">
          {emptyCopy}
        </div>
      ) : (
        <div className="grid gap-3">
          {entries.map((entry) => (
            <button
              aria-label={t("Open quick access {name}", { name: entry.name })}
              className="rounded-[1.3rem] border border-white/70 bg-white/82 px-4 py-4 text-left shadow-[0_12px_32px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-slate-300"
              key={`${label}-${entry.endpointId}`}
              onClick={() => onSelectEndpoint(entry.endpointId)}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{entry.name}</p>
                  <p className="mt-2 truncate font-mono text-xs text-slate-500">{entry.path}</p>
                </div>
                <span className={getMethodBadgeClasses(entry.method, false)}>{entry.method}</span>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {entry.moduleName} / {entry.groupName}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NavigationDeck({
  isSearchActive,
  onCollapseAll,
  onExpandAll,
  onSortModeChange,
  sortMode,
  visibleTreeCounts
}: {
  isSearchActive: boolean;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  onSortModeChange: (sortMode: ProjectSidebarTreeSortMode) => void;
  sortMode: ProjectSidebarTreeSortMode;
  visibleTreeCounts: { endpointCount: number; groupCount: number; moduleCount: number };
}) {
  const { t } = useI18n();
  return (
    <section className="mb-5 rounded-[1.8rem] border border-slate-200/80 bg-[linear-gradient(145deg,rgba(15,23,42,0.96),rgba(30,41,59,0.92),rgba(148,163,184,0.28))] p-4 text-white shadow-[0_22px_60px_rgba(15,23,42,0.16)]">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">{t("Navigation")}</p>
        <h3 className="text-base font-semibold tracking-tight">{t("Collapse noise and steer the tree.")}</h3>
        <p className="text-sm leading-6 text-slate-300">
          {isSearchActive
            ? t("Search keeps matched branches open.")
            : t("Change sort mode, collapse branches, and keep project-scale trees easier to scan.")}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <DeckStat label={t("Modules")} value={visibleTreeCounts.moduleCount} />
        <DeckStat label={t("Groups")} value={visibleTreeCounts.groupCount} />
        <DeckStat label={t("Endpoints")} value={visibleTreeCounts.endpointCount} />
      </div>

      <div className="mt-4 space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <NavigationSortButton isActive={sortMode === "project"} label={t("Project order")} onClick={() => onSortModeChange("project")} />
          <NavigationSortButton isActive={sortMode === "name"} label={t("A-Z")} onClick={() => onSortModeChange("name")} />
          <NavigationSortButton isActive={sortMode === "method"} label={t("Method")} onClick={() => onSortModeChange("method")} />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            className="rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/14 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSearchActive}
            onClick={onExpandAll}
            type="button"
          >
            {t("Expand all")}
          </button>
          <button
            className="rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/14 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSearchActive}
            onClick={onCollapseAll}
            type="button"
          >
            {t("Collapse all")}
          </button>
        </div>
      </div>
    </section>
  );
}

function NavigationSortButton({
  isActive,
  label,
  onClick
}: {
  isActive: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
        isActive
          ? "border-white/20 bg-white/16 text-white"
          : "border-white/12 bg-white/6 text-slate-200 hover:bg-white/12"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function DeckStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.3rem] border border-white/12 bg-black/15 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function ModuleSection({
  canWrite,
  collapsedGroupIds,
  collapsedModuleIds,
  isSearchActive,
  module,
  onCreateEndpoint,
  onCreateGroup,
  onDeleteEndpoint,
  onDeleteGroup,
  onDeleteModule,
  onRenameEndpoint,
  onRenameGroup,
  onRenameModule,
  onToggleGroupCollapse,
  onToggleModuleCollapse,
  onTogglePin,
  onSelectEndpoint,
  pinnedEndpointIds,
  selectedEndpointId
}: {
  canWrite: boolean;
  collapsedGroupIds: number[];
  collapsedModuleIds: number[];
  isSearchActive: boolean;
  module: ModuleTreeItem;
  onCreateEndpoint: (groupId: number, payload: { name: string; method: string; path: string; description: string }) => Promise<void>;
  onCreateGroup: (moduleId: number, payload: { name: string }) => Promise<void>;
  onDeleteEndpoint: (endpointId: number) => Promise<void>;
  onDeleteGroup: (groupId: number) => Promise<void>;
  onDeleteModule: (moduleId: number) => Promise<void>;
  onRenameEndpoint: (endpointId: number, payload: { name: string; method: string; path: string; description: string }) => Promise<void>;
  onRenameGroup: (groupId: number, payload: { name: string }) => Promise<void>;
  onRenameModule: (moduleId: number, payload: { name: string }) => Promise<void>;
  onToggleGroupCollapse: (groupId: number) => void;
  onToggleModuleCollapse: (moduleId: number) => void;
  onTogglePin: (endpointId: number) => void;
  onSelectEndpoint: (endpointId: number) => void;
  pinnedEndpointIds: number[];
  selectedEndpointId: number | null;
}) {
  const [groupName, setGroupName] = useState("");
  const [moduleDraftName, setModuleDraftName] = useState(module.name);
  const { t } = useI18n();
  const moduleEndpointCount = module.groups.reduce((count, group) => count + group.endpoints.length, 0);
  const containsSelectedEndpoint = Boolean(
    selectedEndpointId &&
      module.groups.some((group) => group.endpoints.some((endpoint) => endpoint.id === selectedEndpointId))
  );
  const isCollapsed =
    !isSearchActive && !containsSelectedEndpoint && collapsedModuleIds.includes(module.id);
  const collapseAction = isCollapsed ? t("Expand") : t("Collapse");
  const collapseLabel = `${collapseAction} ${t("module")} ${module.id}`;
  const disclosureDisabled = isSearchActive || containsSelectedEndpoint;

  return (
    <section className="space-y-3 rounded-[1.7rem] border border-slate-200/70 bg-white/70 p-3">
      <div className="rounded-[1.4rem] bg-slate-950 px-4 py-4 text-white">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <button
                aria-label={collapseLabel}
                className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={disclosureDisabled}
                onClick={() => onToggleModuleCollapse(module.id)}
                type="button"
              >
                {collapseAction}
              </button>
              <div>
                <p className="text-sm font-semibold">{module.name}</p>
                <p className="mt-2 text-xs text-slate-300">
                  {t("sidebar.moduleSummary", {
                    groups: module.groups.length,
                    endpoints: moduleEndpointCount
                  })}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">
                {t("module")}
              </span>
              <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                {t("{count} groups", { count: module.groups.length })}
              </span>
              <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                {t("{count} endpoints", { count: moduleEndpointCount })}
              </span>
            </div>
          </div>
          {isSearchActive ? (
            <p className="text-xs text-slate-300">{t("Search mode keeps matching branches open.")}</p>
          ) : containsSelectedEndpoint ? (
            <p className="text-xs text-slate-300">{t("The active endpoint branch stays visible while you work.")}</p>
          ) : null}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <label className="space-y-2 text-slate-100">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
              {t("Module {id} name", { id: module.id })}
            </span>
            <input
              aria-label={t("Module {id} name", { id: module.id })}
              className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-300/70 focus:border-white/30 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canWrite}
              onChange={(event) => setModuleDraftName(event.target.value)}
              value={moduleDraftName}
            />
          </label>
          <button
              aria-label={t("Rename module {id}", { id: module.id })}
            className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canWrite}
            onClick={() => void onRenameModule(module.id, { name: moduleDraftName.trim() || module.name })}
            type="button"
            >
              {t("Rename")}
          </button>
          <button
              aria-label={t("Delete module {id}", { id: module.id })}
            className="rounded-2xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canWrite}
            onClick={() => void onDeleteModule(module.id)}
            type="button"
          >
            {t("Delete")}
          </button>
        </div>
      </div>

      {isCollapsed ? (
        <div className="rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-4 text-sm text-slate-500">
          {t("Module collapsed. Expand it to manage groups and endpoints.")}
        </div>
      ) : (
        <>
          <form
            className="space-y-2 rounded-[1.4rem] border border-slate-200 bg-white/90 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canWrite || !groupName.trim()) {
                return;
              }

              void onCreateGroup(module.id, { name: groupName.trim() }).then(() => {
                setGroupName("");
              });
            }}
          >
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">{t("New group name")}</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                disabled={!canWrite}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder={t("Users")}
                value={groupName}
              />
            </label>
            <button className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60" disabled={!canWrite} type="submit">
              {t("Add group")}
            </button>
          </form>

          {module.groups.length === 0 ? (
            <p className="px-4 text-sm text-slate-500">{t("No groups yet.")}</p>
          ) : (
            module.groups.map((group) => (
              <GroupSection
                canWrite={canWrite}
                collapsedGroupIds={collapsedGroupIds}
                group={group}
                isSearchActive={isSearchActive}
                key={group.id}
                onCreateEndpoint={onCreateEndpoint}
                onDeleteEndpoint={onDeleteEndpoint}
                onDeleteGroup={onDeleteGroup}
                onRenameEndpoint={onRenameEndpoint}
                onRenameGroup={onRenameGroup}
                onToggleGroupCollapse={onToggleGroupCollapse}
                onTogglePin={onTogglePin}
                onSelectEndpoint={onSelectEndpoint}
                pinnedEndpointIds={pinnedEndpointIds}
                selectedEndpointId={selectedEndpointId}
              />
            ))
          )}
        </>
      )}
    </section>
  );
}

function GroupSection({
  canWrite,
  collapsedGroupIds,
  group,
  isSearchActive,
  onCreateEndpoint,
  onDeleteEndpoint,
  onDeleteGroup,
  onRenameEndpoint,
  onRenameGroup,
  onToggleGroupCollapse,
  onTogglePin,
  onSelectEndpoint,
  pinnedEndpointIds,
  selectedEndpointId
}: {
  canWrite: boolean;
  collapsedGroupIds: number[];
  group: ModuleTreeItem["groups"][number];
  isSearchActive: boolean;
  onCreateEndpoint: (groupId: number, payload: { name: string; method: string; path: string; description: string }) => Promise<void>;
  onDeleteEndpoint: (endpointId: number) => Promise<void>;
  onDeleteGroup: (groupId: number) => Promise<void>;
  onRenameEndpoint: (endpointId: number, payload: { name: string; method: string; path: string; description: string }) => Promise<void>;
  onRenameGroup: (groupId: number, payload: { name: string }) => Promise<void>;
  onToggleGroupCollapse: (groupId: number) => void;
  onTogglePin: (endpointId: number) => void;
  onSelectEndpoint: (endpointId: number) => void;
  pinnedEndpointIds: number[];
  selectedEndpointId: number | null;
}) {
  const [endpointName, setEndpointName] = useState("");
  const [endpointMethod, setEndpointMethod] = useState("GET");
  const [endpointPath, setEndpointPath] = useState("");
  const [groupDraftName, setGroupDraftName] = useState(group.name);
  const { t } = useI18n();
  const containsSelectedEndpoint = Boolean(
    selectedEndpointId && group.endpoints.some((endpoint) => endpoint.id === selectedEndpointId)
  );
  const isCollapsed =
    !isSearchActive && !containsSelectedEndpoint && collapsedGroupIds.includes(group.id);
  const collapseAction = isCollapsed ? t("Expand") : t("Collapse");
  const collapseLabel = `${collapseAction} ${t("group")} ${group.id}`;
  const disclosureDisabled = isSearchActive || containsSelectedEndpoint;

  return (
    <div className="space-y-3 rounded-[1.5rem] border border-slate-200/70 bg-slate-50/70 p-3">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <button
              aria-label={collapseLabel}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={disclosureDisabled}
              onClick={() => onToggleGroupCollapse(group.id)}
              type="button"
            >
              {collapseAction}
            </button>
            <div>
              <p className="text-sm font-semibold text-slate-900">{group.name}</p>
              <p className="mt-2 text-xs text-slate-500">{t("{count} endpoints", { count: group.endpoints.length })}</p>
            </div>
          </div>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {t("{count} endpoints", { count: group.endpoints.length })}
            </span>
        </div>
        {isSearchActive ? (
          <p className="text-xs text-slate-500">{t("Search mode keeps matching branches open.")}</p>
        ) : containsSelectedEndpoint ? (
          <p className="text-xs text-slate-500">{t("The active endpoint branch stays visible while you work.")}</p>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              {t("Group {id} name", { id: group.id })}
            </span>
            <input
              aria-label={t("Group {id} name", { id: group.id })}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
              disabled={!canWrite}
              onChange={(event) => setGroupDraftName(event.target.value)}
              value={groupDraftName}
            />
          </label>
          <button
            aria-label={t("Rename group {id}", { id: group.id })}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canWrite}
            onClick={() => void onRenameGroup(group.id, { name: groupDraftName.trim() || group.name })}
            type="button"
          >
            {t("Rename")}
          </button>
          <button
            aria-label={t("Delete group {id}", { id: group.id })}
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canWrite}
            onClick={() => void onDeleteGroup(group.id)}
            type="button"
          >
            {t("Delete")}
          </button>
        </div>
      </div>

      {isCollapsed ? (
        <div className="rounded-[1.4rem] border border-dashed border-slate-200 bg-white/80 px-4 py-4 text-sm text-slate-500">
          {t("Group collapsed. Expand it to manage endpoints.")}
        </div>
      ) : (
        <>
          <form
            className="space-y-2 rounded-[1.4rem] border border-slate-200 bg-white/90 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canWrite || !endpointName.trim() || !endpointPath.trim()) {
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
              <span className="text-sm font-medium text-slate-700">{t("New endpoint name")}</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                disabled={!canWrite}
                onChange={(event) => setEndpointName(event.target.value)}
                placeholder={t("Create User")}
                value={endpointName}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">{t("New endpoint method")}</span>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                disabled={!canWrite}
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
              <span className="text-sm font-medium text-slate-700">{t("New endpoint path")}</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                disabled={!canWrite}
                onChange={(event) => setEndpointPath(event.target.value)}
                placeholder={t("/users")}
                value={endpointPath}
              />
            </label>

            <button className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60" disabled={!canWrite} type="submit">
              {t("Add endpoint")}
            </button>
          </form>

          <div className="space-y-2">
            {group.endpoints.map((endpoint) => {
              const isActive = endpoint.id === selectedEndpointId;

              return (
                <EndpointNode
                  canWrite={canWrite}
                  endpoint={endpoint}
                  isPinned={pinnedEndpointIds.includes(endpoint.id)}
                  isActive={isActive}
                  key={endpoint.id}
                  onDeleteEndpoint={onDeleteEndpoint}
                  onRenameEndpoint={onRenameEndpoint}
                  onTogglePin={onTogglePin}
                  onSelectEndpoint={onSelectEndpoint}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function EndpointNode({
  canWrite,
  endpoint,
  isActive,
  isPinned,
  onDeleteEndpoint,
  onRenameEndpoint,
  onTogglePin,
  onSelectEndpoint
}: {
  canWrite: boolean;
  endpoint: ModuleTreeItem["groups"][number]["endpoints"][number];
  isActive: boolean;
  isPinned: boolean;
  onDeleteEndpoint: (endpointId: number) => Promise<void>;
  onRenameEndpoint: (endpointId: number, payload: { name: string; method: string; path: string; description: string }) => Promise<void>;
  onTogglePin: (endpointId: number) => void;
  onSelectEndpoint: (endpointId: number) => void;
}) {
  const [endpointDraftName, setEndpointDraftName] = useState(endpoint.name);
  const [endpointDraftPath, setEndpointDraftPath] = useState(endpoint.path);
  const { t } = useI18n();
  const pinAction = isPinned ? t("Unpin") : t("Pin");
  const pinLabel = t("{action} endpoint {id}", { action: pinAction, id: endpoint.id });

  return (
    <div
      className={`space-y-3 rounded-2xl border px-4 py-3 transition ${
        isActive
          ? "border-slate-900 bg-slate-950 text-white shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
      }`}
    >
      <div className="flex items-start gap-2">
        <button className="flex-1 text-left" onClick={() => onSelectEndpoint(endpoint.id)} type="button">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-sm font-medium">{endpoint.name}</span>
            <span className={getMethodBadgeClasses(endpoint.method, isActive)}>{endpoint.method}</span>
          </div>
          <p className={`mt-2 truncate text-xs ${isActive ? "text-slate-300" : "text-slate-500"}`}>{endpoint.path}</p>
        </button>
        <button
          aria-label={pinLabel}
          className={`rounded-2xl border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition ${
            isActive
              ? "border-white/15 bg-white/10 text-white hover:bg-white/15"
              : isPinned
                ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
          }`}
          onClick={() => onTogglePin(endpoint.id)}
          type="button"
        >
          {isPinned ? t("Pinned") : t("Pin")}
        </button>
      </div>

      <div className="grid gap-2">
          <label className="space-y-2">
            <span className={`text-xs font-semibold uppercase tracking-[0.16em] ${isActive ? "text-slate-300" : "text-slate-400"}`}>
              {t("Endpoint {id} name", { id: endpoint.id })}
            </span>
            <input
              aria-label={t("Endpoint {id} name", { id: endpoint.id })}
            className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
              isActive
                ? "border-white/15 bg-white/10 text-white placeholder:text-slate-300/70 focus:border-white/30"
                : "border-slate-200 bg-slate-50 text-slate-700 focus:border-slate-400"
            } disabled:cursor-not-allowed disabled:opacity-60`}
            disabled={!canWrite}
            onChange={(event) => setEndpointDraftName(event.target.value)}
            value={endpointDraftName}
          />
        </label>
        <label className="space-y-2">
            <span className={`text-xs font-semibold uppercase tracking-[0.16em] ${isActive ? "text-slate-300" : "text-slate-400"}`}>
              {t("Endpoint {id} path", { id: endpoint.id })}
            </span>
            <input
              aria-label={t("Endpoint {id} path", { id: endpoint.id })}
            className={`w-full rounded-2xl border px-4 py-3 font-mono text-sm outline-none transition ${
              isActive
                ? "border-white/15 bg-white/10 text-white placeholder:text-slate-300/70 focus:border-white/30"
                : "border-slate-200 bg-slate-50 text-slate-700 focus:border-slate-400"
            } disabled:cursor-not-allowed disabled:opacity-60`}
            disabled={!canWrite}
            onChange={(event) => setEndpointDraftPath(event.target.value)}
            value={endpointDraftPath}
          />
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          aria-label={t("Rename endpoint {id}", { id: endpoint.id })}
          className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
            isActive
              ? "border-white/15 bg-white/10 text-white hover:bg-white/15"
              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
          } disabled:cursor-not-allowed disabled:opacity-60`}
          disabled={!canWrite}
          onClick={() =>
            void onRenameEndpoint(endpoint.id, {
              description: "",
              method: endpoint.method,
              name: endpointDraftName.trim() || endpoint.name,
              path: endpointDraftPath.trim() || endpoint.path
            })
          }
          type="button"
        >
          {t("Rename endpoint")}
        </button>
        <button
          aria-label={t("Delete endpoint {id}", { id: endpoint.id })}
          className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
            isActive
              ? "border-rose-300/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
              : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
          } disabled:cursor-not-allowed disabled:opacity-60`}
          disabled={!canWrite}
          onClick={() => void onDeleteEndpoint(endpoint.id)}
          type="button"
        >
          {t("Delete endpoint")}
        </button>
      </div>
    </div>
  );
}

function countTreeNodes(modules: ModuleTreeItem[]) {
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
}

function buildQuickAccessEntryLookup(modules: ModuleTreeItem[]) {
  const lookup = new Map<number, QuickAccessEntry>();

  for (const module of modules) {
    for (const group of module.groups) {
      for (const endpoint of group.endpoints) {
        lookup.set(endpoint.id, {
          endpointId: endpoint.id,
          groupName: group.name,
          method: endpoint.method,
          moduleName: module.name,
          name: endpoint.name,
          path: endpoint.path
        });
      }
    }
  }

  return lookup;
}

function resolveQuickAccessEntries(endpointIds: number[], lookup: Map<number, QuickAccessEntry>) {
  return endpointIds
    .map((endpointId) => lookup.get(endpointId))
    .filter((entry): entry is QuickAccessEntry => entry !== undefined);
}

function areQuickAccessStatesEqual(
  left: ProjectSidebarQuickAccessState,
  right: ProjectSidebarQuickAccessState
) {
  return (
    left.pinnedEndpointIds.length === right.pinnedEndpointIds.length &&
    left.recentEndpointIds.length === right.recentEndpointIds.length &&
    left.pinnedEndpointIds.every((endpointId, index) => endpointId === right.pinnedEndpointIds[index]) &&
    left.recentEndpointIds.every((endpointId, index) => endpointId === right.recentEndpointIds[index])
  );
}

function getMethodBadgeClasses(method: string, isActive: boolean) {
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
        fallback: "bg-slate-200 text-slate-700"
      };

  return `rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${palette[method as keyof typeof palette] ?? palette.fallback}`;
}
