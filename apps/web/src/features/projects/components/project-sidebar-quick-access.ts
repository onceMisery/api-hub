export type ProjectSidebarQuickAccessState = {
  pinnedEndpointIds: number[];
  recentEndpointIds: number[];
};

const MAX_PINNED_ENDPOINTS = 8;
const MAX_RECENT_ENDPOINTS = 6;
const EMPTY_STATE: ProjectSidebarQuickAccessState = {
  pinnedEndpointIds: [],
  recentEndpointIds: []
};

export function buildProjectSidebarQuickAccessKey(projectId?: number | null) {
  if (!projectId) {
    return null;
  }

  return `apihub.project-sidebar.quick-access.v1.project-${projectId}`;
}

export function readProjectSidebarQuickAccess(projectId?: number | null): ProjectSidebarQuickAccessState {
  const storageKey = buildProjectSidebarQuickAccessKey(projectId);
  if (!storageKey || typeof window === "undefined") {
    return EMPTY_STATE;
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return EMPTY_STATE;
  }

  try {
    const parsed = JSON.parse(raw);
    return normalizeProjectSidebarQuickAccess(parsed);
  } catch {
    return EMPTY_STATE;
  }
}

export function writeProjectSidebarQuickAccess(
  projectId: number | null | undefined,
  state: ProjectSidebarQuickAccessState
) {
  const storageKey = buildProjectSidebarQuickAccessKey(projectId);
  const normalizedState = normalizeProjectSidebarQuickAccess(state);

  if (!storageKey || typeof window === "undefined") {
    return normalizedState;
  }

  if (normalizedState.pinnedEndpointIds.length === 0 && normalizedState.recentEndpointIds.length === 0) {
    window.localStorage.removeItem(storageKey);
    return normalizedState;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(normalizedState));
  return normalizedState;
}

export function sanitizeProjectSidebarQuickAccess(
  state: ProjectSidebarQuickAccessState,
  availableEndpointIds: number[]
): ProjectSidebarQuickAccessState {
  const availableIdSet = new Set(availableEndpointIds);

  return normalizeProjectSidebarQuickAccess({
    pinnedEndpointIds: state.pinnedEndpointIds.filter((endpointId) => availableIdSet.has(endpointId)),
    recentEndpointIds: state.recentEndpointIds.filter((endpointId) => availableIdSet.has(endpointId))
  });
}

export function recordRecentEndpoint(
  state: ProjectSidebarQuickAccessState,
  endpointId: number,
  maxRecent = MAX_RECENT_ENDPOINTS
): ProjectSidebarQuickAccessState {
  return normalizeProjectSidebarQuickAccess({
    pinnedEndpointIds: state.pinnedEndpointIds,
    recentEndpointIds: [endpointId, ...state.recentEndpointIds.filter((candidate) => candidate !== endpointId)].slice(0, maxRecent)
  });
}

export function togglePinnedEndpoint(
  state: ProjectSidebarQuickAccessState,
  endpointId: number,
  maxPinned = MAX_PINNED_ENDPOINTS
): ProjectSidebarQuickAccessState {
  const isPinned = state.pinnedEndpointIds.includes(endpointId);

  return normalizeProjectSidebarQuickAccess({
    pinnedEndpointIds: isPinned
      ? state.pinnedEndpointIds.filter((candidate) => candidate !== endpointId)
      : [...state.pinnedEndpointIds.filter((candidate) => candidate !== endpointId), endpointId].slice(0, maxPinned),
    recentEndpointIds: isPinned
      ? state.recentEndpointIds.filter((candidate) => candidate !== endpointId)
      : state.recentEndpointIds
  });
}

function normalizeProjectSidebarQuickAccess(value: unknown): ProjectSidebarQuickAccessState {
  if (!value || typeof value !== "object") {
    return EMPTY_STATE;
  }

  const candidate = value as Partial<ProjectSidebarQuickAccessState>;

  return {
    pinnedEndpointIds: normalizeEndpointIds(candidate.pinnedEndpointIds),
    recentEndpointIds: normalizeEndpointIds(candidate.recentEndpointIds)
  };
}

function normalizeEndpointIds(value: unknown) {
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
