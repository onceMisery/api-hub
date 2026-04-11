import type { ModuleTreeItem } from "@api-hub/api-sdk";

export type ProjectSidebarTreeSortMode = "project" | "name" | "method";

export type ProjectSidebarTreePreferences = {
  sortMode: ProjectSidebarTreeSortMode;
  collapsedModuleIds: number[];
  collapsedGroupIds: number[];
};

const DEFAULT_STATE: ProjectSidebarTreePreferences = {
  sortMode: "project",
  collapsedModuleIds: [],
  collapsedGroupIds: []
};

const METHOD_ORDER = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

export function buildProjectSidebarTreePreferencesKey(projectId?: number | null) {
  if (!projectId) {
    return null;
  }

  return `apihub.project-sidebar.tree-preferences.v1.project-${projectId}`;
}

export function readProjectSidebarTreePreferences(projectId?: number | null): ProjectSidebarTreePreferences {
  const storageKey = buildProjectSidebarTreePreferencesKey(projectId);
  if (!storageKey || typeof window === "undefined") {
    return DEFAULT_STATE;
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return DEFAULT_STATE;
  }

  try {
    const parsed = JSON.parse(raw);
    return normalizeProjectSidebarTreePreferences(parsed);
  } catch {
    return DEFAULT_STATE;
  }
}

export function writeProjectSidebarTreePreferences(
  projectId: number | null | undefined,
  state: ProjectSidebarTreePreferences
) {
  const storageKey = buildProjectSidebarTreePreferencesKey(projectId);
  const normalizedState = normalizeProjectSidebarTreePreferences(state);

  if (!storageKey || typeof window === "undefined") {
    return normalizedState;
  }

  if (
    normalizedState.sortMode === "project" &&
    normalizedState.collapsedModuleIds.length === 0 &&
    normalizedState.collapsedGroupIds.length === 0
  ) {
    window.localStorage.removeItem(storageKey);
    return normalizedState;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(normalizedState));
  return normalizedState;
}

export function sanitizeProjectSidebarTreePreferences(
  state: ProjectSidebarTreePreferences,
  availableModuleIds: number[],
  availableGroupIds: number[]
): ProjectSidebarTreePreferences {
  const availableModuleIdSet = new Set(availableModuleIds);
  const availableGroupIdSet = new Set(availableGroupIds);
  const normalizedState = normalizeProjectSidebarTreePreferences(state);

  return normalizeProjectSidebarTreePreferences({
    sortMode: normalizedState.sortMode,
    collapsedModuleIds: normalizedState.collapsedModuleIds.filter((moduleId) => availableModuleIdSet.has(moduleId)),
    collapsedGroupIds: normalizedState.collapsedGroupIds.filter((groupId) => availableGroupIdSet.has(groupId))
  });
}

export function setProjectSidebarTreeSortMode(
  state: ProjectSidebarTreePreferences,
  sortMode: ProjectSidebarTreeSortMode
): ProjectSidebarTreePreferences {
  return normalizeProjectSidebarTreePreferences({
    ...state,
    sortMode
  });
}

export function toggleCollapsedModule(state: ProjectSidebarTreePreferences, moduleId: number) {
  return normalizeProjectSidebarTreePreferences({
    ...state,
    collapsedModuleIds: toggleId(state.collapsedModuleIds, moduleId)
  });
}

export function toggleCollapsedGroup(state: ProjectSidebarTreePreferences, groupId: number) {
  return normalizeProjectSidebarTreePreferences({
    ...state,
    collapsedGroupIds: toggleId(state.collapsedGroupIds, groupId)
  });
}

export function collapseAllBranches(
  state: ProjectSidebarTreePreferences,
  moduleIds: number[],
  groupIds: number[]
): ProjectSidebarTreePreferences {
  return normalizeProjectSidebarTreePreferences({
    ...state,
    collapsedModuleIds: normalizeIds(moduleIds),
    collapsedGroupIds: normalizeIds(groupIds)
  });
}

export function expandAllBranches(state: ProjectSidebarTreePreferences): ProjectSidebarTreePreferences {
  return normalizeProjectSidebarTreePreferences({
    ...state,
    collapsedModuleIds: [],
    collapsedGroupIds: []
  });
}

export function sortProjectSidebarModules(
  modules: ModuleTreeItem[],
  sortMode: ProjectSidebarTreeSortMode
): ModuleTreeItem[] {
  if (sortMode === "project") {
    return modules;
  }

  if (sortMode === "name") {
    return [...modules]
      .sort((left, right) => compareText(left.name, right.name))
      .map((module) => ({
        ...module,
        groups: [...module.groups]
          .sort((left, right) => compareText(left.name, right.name))
          .map((group) => ({
            ...group,
            endpoints: [...group.endpoints].sort(
              (left, right) =>
                compareText(left.name, right.name) ||
                compareText(left.method, right.method) ||
                compareText(left.path, right.path)
            )
          }))
      }));
  }

  return modules.map((module) => ({
    ...module,
    groups: module.groups.map((group) => ({
      ...group,
      endpoints: [...group.endpoints].sort(
        (left, right) =>
          getMethodRank(left.method) - getMethodRank(right.method) ||
          compareText(left.path, right.path) ||
          compareText(left.name, right.name)
      )
    }))
  }));
}

function normalizeProjectSidebarTreePreferences(value: unknown): ProjectSidebarTreePreferences {
  if (!value || typeof value !== "object") {
    return DEFAULT_STATE;
  }

  const candidate = value as Partial<ProjectSidebarTreePreferences>;

  return {
    sortMode: normalizeSortMode(candidate.sortMode),
    collapsedModuleIds: normalizeIds(candidate.collapsedModuleIds),
    collapsedGroupIds: normalizeIds(candidate.collapsedGroupIds)
  };
}

function normalizeSortMode(value: unknown): ProjectSidebarTreeSortMode {
  return value === "name" || value === "method" ? value : "project";
}

function normalizeIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<number>();
  const normalizedIds: number[] = [];

  for (const entry of value) {
    if (typeof entry !== "number" || !Number.isInteger(entry) || entry <= 0 || seen.has(entry)) {
      continue;
    }

    seen.add(entry);
    normalizedIds.push(entry);
  }

  return normalizedIds;
}

function toggleId(ids: number[], targetId: number) {
  const normalizedIds = normalizeIds(ids);
  if (normalizedIds.includes(targetId)) {
    return normalizedIds.filter((id) => id !== targetId);
  }

  return [...normalizedIds, targetId];
}

function compareText(left: string, right: string) {
  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

function getMethodRank(method: string) {
  const rank = METHOD_ORDER.indexOf(method as (typeof METHOD_ORDER)[number]);
  return rank === -1 ? METHOD_ORDER.length : rank;
}
