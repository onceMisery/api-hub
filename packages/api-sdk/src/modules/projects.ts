import { apiFetch } from "../client";

export type ProjectSummary = {
  id: number;
  name: string;
  projectKey: string;
  description: string | null;
  debugAllowedHosts: DebugTargetRule[];
  currentUserRole: string | null;
  canWrite: boolean;
  canManageMembers: boolean;
};

export type DebugTargetRule = {
  pattern: string;
  allowPrivate: boolean;
};

export type ProjectDetail = {
  id: number;
  name: string;
  projectKey: string;
  description: string | null;
  debugAllowedHosts: DebugTargetRule[];
  currentUserRole: string | null;
  canWrite: boolean;
  canManageMembers: boolean;
};

export type ProjectMemberDetail = {
  userId: number;
  username: string;
  displayName: string;
  email: string;
  roleCode: "project_admin" | "editor" | "tester" | "viewer";
  owner: boolean;
};

export type UpsertProjectMemberPayload = {
  username: string;
  roleCode: "project_admin" | "editor" | "tester" | "viewer";
};

export type EndpointTreeItem = {
  id: number;
  name: string;
  method: string;
  path: string;
};

export type GroupTreeItem = {
  id: number;
  name: string;
  endpoints: EndpointTreeItem[];
};

export type ModuleTreeItem = {
  id: number;
  name: string;
  groups: GroupTreeItem[];
};

export type ProjectTree = {
  modules: ModuleTreeItem[];
};

export type EndpointDetail = {
  id: number;
  groupId: number;
  name: string;
  method: string;
  path: string;
  description: string | null;
  mockEnabled: boolean;
};

export type VersionDetail = {
  id: number;
  endpointId: number;
  version: string;
  changeSummary: string | null;
  snapshotJson: string | null;
};

export type ModuleDetail = {
  id: number;
  projectId: number;
  name: string;
};

export type GroupDetail = {
  id: number;
  moduleId: number;
  name: string;
};

export type EnvironmentEntry = {
  name: string;
  value: string;
};

export type EnvironmentDetail = {
  id: number;
  projectId: number;
  name: string;
  baseUrl: string;
  isDefault: boolean;
  variables: EnvironmentEntry[];
  defaultHeaders: EnvironmentEntry[];
  defaultQuery: EnvironmentEntry[];
  authMode: "none" | "bearer" | "api_key_header";
  authKey: string;
  authValue: string;
  debugHostMode: "inherit" | "append" | "override";
  debugAllowedHosts: DebugTargetRule[];
};

export type UpdateProjectPayload = {
  name: string;
  description: string;
  debugAllowedHosts: DebugTargetRule[];
};

export type CreateProjectPayload = {
  name: string;
  projectKey: string;
  description: string;
  debugAllowedHosts: DebugTargetRule[];
};

export type CreateModulePayload = {
  name: string;
};

export type CreateGroupPayload = {
  name: string;
};

export type CreateEndpointPayload = {
  name: string;
  method: string;
  path: string;
  description: string;
  mockEnabled: boolean;
};

export type UpdateEndpointPayload = {
  name: string;
  method: string;
  path: string;
  description: string;
  mockEnabled?: boolean;
};

export type UpdateModulePayload = {
  name: string;
};

export type UpdateGroupPayload = {
  name: string;
};

export type CreateEnvironmentPayload = {
  name: string;
  baseUrl: string;
  isDefault: boolean;
  variables: EnvironmentEntry[];
  defaultHeaders: EnvironmentEntry[];
  defaultQuery: EnvironmentEntry[];
  authMode: "none" | "bearer" | "api_key_header";
  authKey: string;
  authValue: string;
  debugHostMode: "inherit" | "append" | "override";
  debugAllowedHosts: DebugTargetRule[];
};

export type UpdateEnvironmentPayload = {
  name: string;
  baseUrl: string;
  isDefault: boolean;
  variables: EnvironmentEntry[];
  defaultHeaders: EnvironmentEntry[];
  defaultQuery: EnvironmentEntry[];
  authMode: "none" | "bearer" | "api_key_header";
  authKey: string;
  authValue: string;
  debugHostMode: "inherit" | "append" | "override";
  debugAllowedHosts: DebugTargetRule[];
};

export type ParameterDetail = {
  id: number;
  sectionType: string;
  name: string;
  dataType: string;
  required: boolean;
  description: string | null;
  exampleValue: string | null;
  sortOrder: number;
};

export type ResponseDetail = {
  id: number;
  httpStatusCode: number;
  mediaType: string;
  name: string | null;
  dataType: string;
  required: boolean;
  description: string | null;
  exampleValue: string | null;
  sortOrder: number;
};

export type ParameterUpsertItem = {
  sectionType: string;
  name: string;
  dataType: string;
  required: boolean;
  description: string;
  exampleValue: string;
};

export type ResponseUpsertItem = {
  httpStatusCode: number;
  mediaType: string;
  name: string;
  dataType: string;
  required: boolean;
  description: string;
  exampleValue: string;
};

export type MockConditionEntry = {
  name: string;
  value: string;
};

export type MockBodyConditionEntry = {
  jsonPath: string;
  expectedValue: string;
};

export type MockRuleDetail = {
  id: number;
  endpointId: number;
  ruleName: string;
  priority: number;
  enabled: boolean;
  queryConditions: MockConditionEntry[];
  headerConditions: MockConditionEntry[];
  bodyConditions: MockBodyConditionEntry[];
  statusCode: number;
  mediaType: string;
  body: string;
};

export type MockRuleUpsertItem = {
  ruleName: string;
  priority: number;
  enabled: boolean;
  queryConditions: MockConditionEntry[];
  headerConditions: MockConditionEntry[];
  bodyConditions: MockBodyConditionEntry[];
  statusCode: number;
  mediaType: string;
  body: string;
};

export type MockReleaseDetail = {
  id: number;
  endpointId: number;
  releaseNo: number;
  responseSnapshotJson: string;
  rulesSnapshotJson: string;
  createdAt: string;
};

export type MockSimulationResponseItem = {
  httpStatusCode: number;
  mediaType: string;
  name: string;
  dataType: string;
  required: boolean;
  description: string;
  exampleValue: string;
};

export type MockSimulationPayload = {
  draftRules: MockRuleUpsertItem[];
  draftResponses: MockSimulationResponseItem[];
  querySamples: MockConditionEntry[];
  headerSamples: MockConditionEntry[];
  bodySample: string;
};

export type MockSimulationResult = {
  source: string;
  matchedRuleName: string | null;
  matchedRulePriority: number | null;
  explanations: string[];
  statusCode: number;
  mediaType: string;
  body: string;
};

export type CreateVersionPayload = {
  version: string;
  changeSummary: string;
  snapshotJson: string;
};

export type DebugHeader = {
  name: string;
  value: string;
};

export type ExecuteDebugPayload = {
  environmentId: number;
  endpointId: number;
  queryString: string;
  headers: DebugHeader[];
  body: string;
};

export type DebugExecutionResult = {
  method: string;
  finalUrl: string;
  statusCode: number;
  responseHeaders: DebugHeader[];
  responseBody: string;
  durationMs: number;
};

export type DebugHistoryItem = {
  id: number;
  projectId: number;
  environmentId: number;
  endpointId: number;
  method: string;
  finalUrl: string;
  requestHeaders: DebugHeader[];
  requestBody: string;
  statusCode: number;
  responseHeaders: DebugHeader[];
  responseBody: string;
  durationMs: number;
  createdAt: string;
};

export type DebugHistoryFilters = {
  endpointId?: number;
  environmentId?: number;
  statusCode?: number;
  createdFrom?: string;
  createdTo?: string;
  limit?: number;
};

export function fetchProjects() {
  return apiFetch<ProjectSummary[]>("/api/v1/projects");
}

export function createProject(payload: CreateProjectPayload) {
  return apiFetch<ProjectDetail>("/api/v1/projects", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchProject(projectId: number) {
  return apiFetch<ProjectDetail>(`/api/v1/projects/${projectId}`);
}

export function fetchProjectMembers(projectId: number) {
  return apiFetch<ProjectMemberDetail[]>(`/api/v1/projects/${projectId}/members`);
}

export function saveProjectMember(projectId: number, payload: UpsertProjectMemberPayload) {
  return apiFetch<ProjectMemberDetail>(`/api/v1/projects/${projectId}/members`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deleteProjectMember(projectId: number, memberUserId: number) {
  return apiFetch<null>(`/api/v1/projects/${projectId}/members/${memberUserId}`, {
    method: "DELETE"
  });
}

export function fetchProjectTree(projectId: number) {
  return apiFetch<ProjectTree>(`/api/v1/projects/${projectId}/tree`);
}

export function updateProject(projectId: number, payload: UpdateProjectPayload) {
  return apiFetch<ProjectDetail>(`/api/v1/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function createModule(projectId: number, payload: CreateModulePayload) {
  return apiFetch<ModuleDetail>(`/api/v1/projects/${projectId}/modules`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateModule(moduleId: number, payload: UpdateModulePayload) {
  return apiFetch<ModuleDetail>(`/api/v1/modules/${moduleId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteModule(moduleId: number) {
  return apiFetch<null>(`/api/v1/modules/${moduleId}`, {
    method: "DELETE"
  });
}

export function createGroup(moduleId: number, payload: CreateGroupPayload) {
  return apiFetch<GroupDetail>(`/api/v1/modules/${moduleId}/groups`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchEnvironments(projectId: number) {
  return apiFetch<EnvironmentDetail[]>(`/api/v1/projects/${projectId}/environments`);
}

export function createEnvironment(projectId: number, payload: CreateEnvironmentPayload) {
  return apiFetch<EnvironmentDetail>(`/api/v1/projects/${projectId}/environments`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateEnvironment(environmentId: number, payload: UpdateEnvironmentPayload) {
  return apiFetch<EnvironmentDetail>(`/api/v1/environments/${environmentId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteEnvironment(environmentId: number) {
  return apiFetch<null>(`/api/v1/environments/${environmentId}`, {
    method: "DELETE"
  });
}

export function updateGroup(groupId: number, payload: UpdateGroupPayload) {
  return apiFetch<GroupDetail>(`/api/v1/groups/${groupId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteGroup(groupId: number) {
  return apiFetch<null>(`/api/v1/groups/${groupId}`, {
    method: "DELETE"
  });
}

export function createEndpoint(groupId: number, payload: CreateEndpointPayload) {
  return apiFetch<EndpointDetail>(`/api/v1/groups/${groupId}/endpoints`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchEndpoint(endpointId: number) {
  return apiFetch<EndpointDetail>(`/api/v1/endpoints/${endpointId}`);
}

export function updateEndpoint(endpointId: number, payload: UpdateEndpointPayload) {
  return apiFetch<EndpointDetail>(`/api/v1/endpoints/${endpointId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteEndpoint(endpointId: number) {
  return apiFetch<null>(`/api/v1/endpoints/${endpointId}`, {
    method: "DELETE"
  });
}

export function fetchEndpointParameters(endpointId: number) {
  return apiFetch<ParameterDetail[]>(`/api/v1/endpoints/${endpointId}/parameters`);
}

export function replaceEndpointParameters(endpointId: number, payload: ParameterUpsertItem[]) {
  return apiFetch<null>(`/api/v1/endpoints/${endpointId}/parameters`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function fetchEndpointResponses(endpointId: number) {
  return apiFetch<ResponseDetail[]>(`/api/v1/endpoints/${endpointId}/responses`);
}

export function replaceEndpointResponses(endpointId: number, payload: ResponseUpsertItem[]) {
  return apiFetch<null>(`/api/v1/endpoints/${endpointId}/responses`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function fetchEndpointVersions(endpointId: number) {
  return apiFetch<VersionDetail[]>(`/api/v1/endpoints/${endpointId}/versions`);
}

export function fetchEndpointMockRules(endpointId: number) {
  return apiFetch<MockRuleDetail[]>(`/api/v1/endpoints/${endpointId}/mock-rules`);
}

export function replaceEndpointMockRules(endpointId: number, payload: MockRuleUpsertItem[]) {
  return apiFetch<null>(`/api/v1/endpoints/${endpointId}/mock-rules`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function fetchEndpointMockReleases(endpointId: number) {
  return apiFetch<MockReleaseDetail[]>(`/api/v1/endpoints/${endpointId}/mock-releases`);
}

export function publishEndpointMockRelease(endpointId: number) {
  return apiFetch<MockReleaseDetail>(`/api/v1/endpoints/${endpointId}/mock-releases`, {
    method: "POST"
  });
}

export function simulateEndpointMock(endpointId: number, payload: MockSimulationPayload) {
  return apiFetch<MockSimulationResult>(`/api/v1/endpoints/${endpointId}/mock-simulations`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function createVersion(endpointId: number, payload: CreateVersionPayload) {
  return apiFetch<VersionDetail>(`/api/v1/endpoints/${endpointId}/versions`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function executeDebug(payload: ExecuteDebugPayload) {
  return apiFetch<DebugExecutionResult>("/api/v1/debug/execute", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchDebugHistory(projectId: number, filters: DebugHistoryFilters = {}) {
  const searchParams = new URLSearchParams({ limit: String(filters.limit ?? 10) });
  if (filters.endpointId) {
    searchParams.set("endpointId", String(filters.endpointId));
  }
  if (filters.environmentId) {
    searchParams.set("environmentId", String(filters.environmentId));
  }
  if (filters.statusCode) {
    searchParams.set("statusCode", String(filters.statusCode));
  }
  if (filters.createdFrom) {
    searchParams.set("createdFrom", filters.createdFrom);
  }
  if (filters.createdTo) {
    searchParams.set("createdTo", filters.createdTo);
  }

  return apiFetch<DebugHistoryItem[]>(`/api/v1/projects/${projectId}/debug-history?${searchParams.toString()}`);
}

export function clearDebugHistory(projectId: number, filters: Omit<DebugHistoryFilters, "limit"> = {}) {
  const searchParams = new URLSearchParams();
  if (filters.endpointId) {
    searchParams.set("endpointId", String(filters.endpointId));
  }
  if (filters.environmentId) {
    searchParams.set("environmentId", String(filters.environmentId));
  }
  if (filters.statusCode) {
    searchParams.set("statusCode", String(filters.statusCode));
  }
  if (filters.createdFrom) {
    searchParams.set("createdFrom", filters.createdFrom);
  }
  if (filters.createdTo) {
    searchParams.set("createdTo", filters.createdTo);
  }

  const query = searchParams.toString();
  return apiFetch<{ deletedCount: number }>(`/api/v1/projects/${projectId}/debug-history${query ? `?${query}` : ""}`, {
    method: "DELETE"
  });
}
