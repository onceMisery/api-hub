import { apiFetch, apiFetchBlob } from "../client";

export type ProjectSummary = {
  id: number;
  spaceId: number | null;
  spaceName: string | null;
  spaceKey: string | null;
  name: string;
  projectKey: string;
  description: string | null;
  debugAllowedHosts: DebugTargetRule[];
  currentUserRole: string | null;
  canWrite: boolean;
  canManageMembers: boolean;
};

export type ProjectDocPushSettings = {
  projectId: number;
  projectName: string;
  enabled: boolean;
  token: string;
};

export type UpdateProjectDocPushPayload = {
  enabled: boolean;
};

export type DebugTargetRule = {
  pattern: string;
  allowPrivate: boolean;
};

export type ProjectDetail = {
  id: number;
  spaceId: number | null;
  spaceName: string | null;
  spaceKey: string | null;
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

export type SpaceSummary = {
  id: number;
  name: string;
  spaceKey: string;
  currentUserRole: string | null;
  canCreateProject: boolean;
  projectCount: number;
};

export type CreateSpacePayload = {
  name: string;
  spaceKey: string;
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
  createdByDisplayName?: string | null;
  updatedByDisplayName?: string | null;
  status?: "draft" | "review" | "released" | "deprecated" | "archived";
  releasedVersionId?: number | null;
  releasedVersionLabel?: string | null;
  releasedAt?: string | null;
};

export type VersionDetail = {
  id: number;
  endpointId: number;
  version: string;
  changeSummary: string | null;
  snapshotJson: string | null;
  released?: boolean;
  releasedAt?: string | null;
};

export type VersionComparisonDescriptor = {
  versionId: number | null;
  label: string;
  changeSummary: string | null;
  draft: boolean;
  released: boolean;
  releasedAt: string | null;
};

export type VersionComparisonSummary = {
  endpointFieldsChanged: number;
  addedParameters: number;
  removedParameters: number;
  modifiedParameters: number;
  addedResponses: number;
  removedResponses: number;
  modifiedResponses: number;
  breakingChanges: number;
};

export type VersionBreakingChange = {
  type: "endpoint" | "parameter" | "response";
  level: "high" | "medium" | "low";
  title: string;
  detail: string;
};

export type VersionChangelogEntry = {
  category: "endpoint" | "parameter" | "response";
  title: string;
  detail: string;
};

export type VersionFieldChange = {
  field: string;
  beforeValue: string | null;
  afterValue: string | null;
};

export type VersionParameterChange = {
  changeType: "added" | "removed" | "modified";
  key: string;
  sectionType: string;
  name: string;
  beforeDataType: string | null;
  afterDataType: string | null;
  beforeRequired: boolean | null;
  afterRequired: boolean | null;
  beforeDescription: string | null;
  afterDescription: string | null;
  beforeExampleValue: string | null;
  afterExampleValue: string | null;
};

export type VersionResponseChange = {
  changeType: "added" | "removed" | "modified";
  key: string;
  httpStatusCode: number;
  mediaType: string;
  name: string;
  beforeDataType: string | null;
  afterDataType: string | null;
  beforeRequired: boolean | null;
  afterRequired: boolean | null;
  beforeDescription: string | null;
  afterDescription: string | null;
  beforeExampleValue: string | null;
  afterExampleValue: string | null;
};

export type VersionComparisonResult = {
  endpointId: number;
  base: VersionComparisonDescriptor;
  target: VersionComparisonDescriptor;
  summary: VersionComparisonSummary;
  breakingChanges: VersionBreakingChange[];
  changelog: VersionChangelogEntry[];
  endpointChanges: VersionFieldChange[];
  parameterChanges: VersionParameterChange[];
  responseChanges: VersionResponseChange[];
};

export type ModuleDetail = {
  id: number;
  projectId: number;
  name: string;
};

export type CreateModuleVersionTagPayload = {
  tagName: string;
  description: string;
};

export type ModuleVersionTagEndpointSnapshot = {
  endpointId: number;
  endpointName: string;
  method: string;
  path: string;
  groupName: string;
  releasedVersionId: number | null;
  releasedVersionLabel: string | null;
  releasedAt: string | null;
};

export type ModuleVersionTagDetail = {
  id: number;
  moduleId: number;
  tagName: string;
  description: string | null;
  endpointCount: number;
  releasedEndpointCount: number;
  endpoints: ModuleVersionTagEndpointSnapshot[];
  createdAt: string;
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
  authMode: "none" | "bearer" | "api_key_header" | "api_key_query" | "basic";
  authKey: string;
  authValue: string;
  debugHostMode: "inherit" | "append" | "override";
  debugAllowedHosts: DebugTargetRule[];
};

export type DictionaryGroupDetail = {
  id: number;
  projectId: number;
  name: string;
  description: string | null;
  itemCount: number;
};

export type DictionaryItemDetail = {
  id: number;
  groupId: number;
  code: string;
  value: string;
  description: string | null;
  sortOrder: number;
};

export type ErrorCodeDetail = {
  id: number;
  projectId: number;
  code: string;
  name: string;
  description: string | null;
  solution: string | null;
  httpStatus: number | null;
};

export type ImportDictionaryItemPayload = {
  code: string;
  value: string;
  description?: string;
  sortOrder?: number | null;
};

export type ImportDictionaryGroupPayload = {
  name: string;
  description?: string;
  items?: ImportDictionaryItemPayload[];
};

export type ImportDictionaryPayload = {
  groups: ImportDictionaryGroupPayload[];
};

export type DictionaryImportResult = {
  createdGroups: number;
  updatedGroups: number;
  createdItems: number;
  updatedItems: number;
};

export type ImportErrorCodeItemPayload = {
  code: string;
  name: string;
  description?: string;
  solution?: string;
  httpStatus?: number | null;
};

export type ImportErrorCodePayload = {
  items: ImportErrorCodeItemPayload[];
};

export type ErrorCodeImportResult = {
  createdCount: number;
  updatedCount: number;
};

export type AuditLogDetail = {
  id: number;
  projectId: number;
  actorUserId: number;
  actorDisplayName: string;
  actionType: string;
  resourceType: string;
  resourceId: number | null;
  resourceName: string | null;
  detailJson: string;
  createdAt: string;
};

export type CreateDictionaryGroupPayload = {
  name: string;
  description: string;
};

export type UpdateDictionaryGroupPayload = CreateDictionaryGroupPayload;

export type CreateDictionaryItemPayload = {
  code: string;
  value: string;
  description: string;
  sortOrder: number;
};

export type UpdateDictionaryItemPayload = CreateDictionaryItemPayload;

export type CreateErrorCodePayload = {
  code: string;
  name: string;
  description: string;
  solution: string;
  httpStatus: number | null;
};

export type UpdateErrorCodePayload = CreateErrorCodePayload;

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

export type ImportSpecPayload = {
  sourceName: string;
  sourceUrl?: string;
  content: string;
  createVersionSnapshot: boolean;
  bootstrapEnvironments: boolean;
  enableMockByDefault: boolean;
};

export type ImportProjectPayload = {
  projectName: string;
  projectKey: string;
  description: string;
  sourceName: string;
  sourceUrl?: string;
  content: string;
  createVersionSnapshot: boolean;
  bootstrapEnvironments: boolean;
  enableMockByDefault: boolean;
};

export type ImportResult = {
  projectId: number;
  projectName: string;
  sourceType: "openapi" | "smartdoc";
  createdModules: number;
  createdGroups: number;
  createdEndpoints: number;
  updatedEndpoints: number;
  createdVersions: number;
  createdEnvironments: number;
  warnings: string[];
};

export type ImportPreview = {
  sourceType: "openapi" | "smartdoc";
  resolvedName: string;
  totalEndpoints: number;
  createdModules: number;
  createdGroups: number;
  createdEndpoints: number;
  updatedEndpoints: number;
  detectedEnvironments: number;
  modules: string[];
  groups: string[];
  routes: string[];
  warnings: string[];
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
  authMode: "none" | "bearer" | "api_key_header" | "api_key_query" | "basic";
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
  authMode: "none" | "bearer" | "api_key_header" | "api_key_query" | "basic";
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
  delayMs: number;
  templateMode: "plain" | "mockjs";
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
  delayMs: number;
  templateMode: "plain" | "mockjs";
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
  ruleTraces: MockRuleTrace[];
  statusCode: number;
  mediaType: string;
  body: string;
  delayMs: number;
};

export type MockRuleTrace = {
  ruleName: string;
  priority: number;
  status: "matched" | "skipped" | "not_evaluated" | "disabled";
  checks: string[];
  summary: string;
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

export type TestAssertionItem = {
  type:
    | "status_equals"
    | "status_not_equals"
    | "body_contains"
    | "body_not_contains"
    | "response_time_lte"
    | "json_path_equals"
    | "json_path_exists"
    | "json_path_not_empty";
  expression?: string;
  expectedValue: string;
};

export type TestExtractorItem = {
  variableName: string;
  sourceType: "body_json_path" | "response_header" | "response_status";
  expression: string;
};

export type TestStepUpsertItem = {
  endpointId: number;
  environmentId: number;
  name: string;
  enabled: boolean;
  queryString: string;
  headers: DebugHeader[];
  body: string;
  preScript: string;
  postScript: string;
  assertions: TestAssertionItem[];
  extractors: TestExtractorItem[];
};

export type TestSuiteSummary = {
  id: number;
  projectId: number;
  name: string;
  description: string;
  totalSteps: number;
  enabledSteps: number;
  lastExecutionStatus: "passed" | "failed" | "error" | null;
  lastExecutionSource: "manual" | "trigger" | "schedule" | null;
  lastExecutedAt: string | null;
};

export type TestStepDetail = {
  id: number;
  endpointId: number;
  environmentId: number;
  stepOrder: number;
  name: string;
  enabled: boolean;
  endpointName: string;
  method: string;
  path: string;
  environmentName: string;
  queryString: string;
  headers: DebugHeader[];
  body: string;
  preScript: string;
  postScript: string;
  assertions: TestAssertionItem[];
  extractors: TestExtractorItem[];
};

export type TestExecutionSummary = {
  id: number;
  suiteId: number;
  status: "passed" | "failed" | "error";
  executionSource: "manual" | "trigger" | "schedule";
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  durationMs: number;
  executedAt: string;
};

export type TestDashboardOverview = {
  totalSuites: number;
  activeSuites: number;
  totalExecutions: number;
  passedExecutions: number;
  failedExecutions: number;
  errorExecutions: number;
  averageDurationMs: number;
  passRate: number;
};

export type TestDashboardExecutionItem = {
  executionId: number;
  suiteId: number;
  suiteName: string;
  status: "passed" | "failed" | "error";
  executionSource: "manual" | "trigger" | "schedule";
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  durationMs: number;
  executedAt: string;
};

export type TestDashboardSuiteHealthItem = {
  suiteId: number;
  suiteName: string;
  totalSteps: number;
  enabledSteps: number;
  lastExecutionStatus: "passed" | "failed" | "error" | null;
  lastExecutedAt: string | null;
  totalRuns: number;
  passRate: number;
  averageDurationMs: number;
};

export type TestDashboardDetail = {
  overview: TestDashboardOverview;
  recentExecutions: TestDashboardExecutionItem[];
  suiteHealth: TestDashboardSuiteHealthItem[];
};

export type TestSuiteTriggerSummary = {
  id: number;
  suiteId: number;
  name: string;
  tokenPrefix: string;
  active: boolean;
  createdAt: string;
  lastTriggeredAt: string | null;
  lastExecutionId: number | null;
  lastExecutionStatus: "passed" | "failed" | "error" | null;
  lastExecutedAt: string | null;
};

export type CreateTriggerPayload = {
  name: string;
};

export type CreatedTestSuiteTrigger = {
  trigger: TestSuiteTriggerSummary;
  token: string;
};

export type TestSuiteScheduleDetail = {
  id: number | null;
  suiteId: number;
  enabled: boolean;
  intervalMinutes: number;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastExecutionId: number | null;
  lastExecutionStatus: "passed" | "failed" | "error" | null;
  lastExecutedAt: string | null;
};

export type UpsertTestSuiteSchedulePayload = {
  enabled: boolean;
  intervalMinutes: number;
};

export type TriggerExecutionReceipt = {
  executionId: number;
  suiteId: number;
  suiteName: string;
  status: "passed" | "failed" | "error";
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  durationMs: number;
  executedAt: string;
};

export type TestAssertionResult = {
  type: string;
  expression?: string | null;
  expectedValue: string;
  passed: boolean;
  actualValue: string;
  message: string;
};

export type TestExecutionStepResult = {
  stepOrder: number;
  stepName: string;
  endpointId: number;
  endpointName: string;
  method: string;
  path: string;
  environmentId: number;
  environmentName: string;
  finalUrl: string | null;
  status: "passed" | "failed" | "error";
  startedAt: string | null;
  finishedAt: string | null;
  responseStatusCode: number | null;
  durationMs: number;
  requestQueryString: string | null;
  requestHeaders: DebugHeader[];
  requestBody: string | null;
  responseBody: string | null;
  responseHeaders: DebugHeader[];
  assertions: TestAssertionResult[];
  extractedVariables: Array<{
    variableName: string;
    sourceType: string;
    expression: string;
    value: string;
  }>;
  errorMessage: string | null;
};

export type TestExecutionDetail = {
  id: number;
  suiteId: number;
  suiteName: string;
  status: "passed" | "failed" | "error";
  executionSource: "manual" | "trigger" | "schedule";
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  durationMs: number;
  executedAt: string;
  steps: TestExecutionStepResult[];
};

export type TestSuiteDetail = {
  id: number;
  projectId: number;
  name: string;
  description: string;
  totalSteps: number;
  enabledSteps: number;
  createdAt: string;
  updatedAt: string;
  steps: TestStepDetail[];
  recentExecutions: TestExecutionSummary[];
};

export type UpsertTestSuitePayload = {
  name: string;
  description: string;
};

export function fetchSpaces() {
  return apiFetch<SpaceSummary[]>("/api/v1/spaces");
}

export function createSpace(payload: CreateSpacePayload) {
  return apiFetch<SpaceSummary>("/api/v1/spaces", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchProjects(spaceId?: number | null) {
  const suffix = typeof spaceId === "number" ? `?spaceId=${spaceId}` : "";
  return apiFetch<ProjectSummary[]>(`/api/v1/projects${suffix}`);
}

export function createProject(
  payload: CreateProjectPayload,
  spaceId?: number | null,
) {
  const suffix = typeof spaceId === "number" ? `?spaceId=${spaceId}` : "";
  return apiFetch<ProjectDetail>(`/api/v1/projects${suffix}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchProject(projectId: number) {
  return apiFetch<ProjectDetail>(`/api/v1/projects/${projectId}`);
}

export function fetchProjectDocPushSettings(projectId: number) {
  return apiFetch<ProjectDocPushSettings>(`/api/v1/projects/${projectId}/doc-push`);
}

export function updateProjectDocPushSettings(projectId: number, payload: UpdateProjectDocPushPayload) {
  return apiFetch<ProjectDocPushSettings>(`/api/v1/projects/${projectId}/doc-push`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function regenerateProjectDocPushToken(projectId: number) {
  return apiFetch<ProjectDocPushSettings>(`/api/v1/projects/${projectId}/doc-push/regenerate`, {
    method: "POST",
  });
}

export function exportProjectOpenApi(projectId: number) {
  return apiFetchBlob(`/api/v1/projects/${projectId}/exports/openapi`);
}

export function exportProjectMarkdown(projectId: number) {
  return apiFetchBlob(`/api/v1/projects/${projectId}/exports/markdown`);
}

export function importOpenApiToProject(
  projectId: number,
  payload: ImportSpecPayload,
) {
  return apiFetch<ImportResult>(
    `/api/v1/projects/${projectId}/imports/openapi`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function previewOpenApiToProject(
  projectId: number,
  payload: ImportSpecPayload,
) {
  return apiFetch<ImportPreview>(
    `/api/v1/projects/${projectId}/imports/openapi/preview`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function importSmartDocToProject(
  projectId: number,
  payload: ImportSpecPayload,
) {
  return apiFetch<ImportResult>(
    `/api/v1/projects/${projectId}/imports/smartdoc`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function previewSmartDocToProject(
  projectId: number,
  payload: ImportSpecPayload,
) {
  return apiFetch<ImportPreview>(
    `/api/v1/projects/${projectId}/imports/smartdoc/preview`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function importOpenApiAsProject(
  spaceId: number,
  payload: ImportProjectPayload,
) {
  return apiFetch<ImportResult>(
    `/api/v1/spaces/${spaceId}/imports/openapi-project`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function previewOpenApiAsProject(
  spaceId: number,
  payload: ImportProjectPayload,
) {
  return apiFetch<ImportPreview>(
    `/api/v1/spaces/${spaceId}/imports/openapi-project/preview`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function importSmartDocAsProject(
  spaceId: number,
  payload: ImportProjectPayload,
) {
  return apiFetch<ImportResult>(
    `/api/v1/spaces/${spaceId}/imports/smartdoc-project`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function previewSmartDocAsProject(
  spaceId: number,
  payload: ImportProjectPayload,
) {
  return apiFetch<ImportPreview>(
    `/api/v1/spaces/${spaceId}/imports/smartdoc-project/preview`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function fetchProjectMembers(projectId: number) {
  return apiFetch<ProjectMemberDetail[]>(
    `/api/v1/projects/${projectId}/members`,
  );
}

export function saveProjectMember(
  projectId: number,
  payload: UpsertProjectMemberPayload,
) {
  return apiFetch<ProjectMemberDetail>(
    `/api/v1/projects/${projectId}/members`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

export function deleteProjectMember(projectId: number, memberUserId: number) {
  return apiFetch<null>(
    `/api/v1/projects/${projectId}/members/${memberUserId}`,
    {
      method: "DELETE",
    },
  );
}

export function fetchProjectTree(projectId: number) {
  return apiFetch<ProjectTree>(`/api/v1/projects/${projectId}/tree`);
}

export function updateProject(
  projectId: number,
  payload: UpdateProjectPayload,
) {
  return apiFetch<ProjectDetail>(`/api/v1/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function createModule(projectId: number, payload: CreateModulePayload) {
  return apiFetch<ModuleDetail>(`/api/v1/projects/${projectId}/modules`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateModule(moduleId: number, payload: UpdateModulePayload) {
  return apiFetch<ModuleDetail>(`/api/v1/modules/${moduleId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteModule(moduleId: number) {
  return apiFetch<null>(`/api/v1/modules/${moduleId}`, {
    method: "DELETE",
  });
}

export function fetchModuleVersionTags(moduleId: number) {
  return apiFetch<ModuleVersionTagDetail[]>(`/api/v1/modules/${moduleId}/version-tags`);
}

export function createModuleVersionTag(moduleId: number, payload: CreateModuleVersionTagPayload) {
  return apiFetch<ModuleVersionTagDetail>(`/api/v1/modules/${moduleId}/version-tags`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createGroup(moduleId: number, payload: CreateGroupPayload) {
  return apiFetch<GroupDetail>(`/api/v1/modules/${moduleId}/groups`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchEnvironments(projectId: number) {
  return apiFetch<EnvironmentDetail[]>(
    `/api/v1/projects/${projectId}/environments`,
  );
}

export function fetchDictionaryGroups(projectId: number) {
  return apiFetch<DictionaryGroupDetail[]>(`/api/v1/projects/${projectId}/dictionary-groups`);
}

export function createDictionaryGroup(projectId: number, payload: CreateDictionaryGroupPayload) {
  return apiFetch<DictionaryGroupDetail>(`/api/v1/projects/${projectId}/dictionary-groups`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function importDictionaryGroups(projectId: number, payload: ImportDictionaryPayload) {
  return apiFetch<DictionaryImportResult>(`/api/v1/projects/${projectId}/dictionary-groups/import`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateDictionaryGroup(groupId: number, payload: UpdateDictionaryGroupPayload) {
  return apiFetch<DictionaryGroupDetail>(`/api/v1/dictionary-groups/${groupId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteDictionaryGroup(groupId: number) {
  return apiFetch<null>(`/api/v1/dictionary-groups/${groupId}`, {
    method: "DELETE",
  });
}

export function fetchDictionaryItems(groupId: number) {
  return apiFetch<DictionaryItemDetail[]>(`/api/v1/dictionary-groups/${groupId}/items`);
}

export function createDictionaryItem(groupId: number, payload: CreateDictionaryItemPayload) {
  return apiFetch<DictionaryItemDetail>(`/api/v1/dictionary-groups/${groupId}/items`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateDictionaryItem(itemId: number, payload: UpdateDictionaryItemPayload) {
  return apiFetch<DictionaryItemDetail>(`/api/v1/dictionary-items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteDictionaryItem(itemId: number) {
  return apiFetch<null>(`/api/v1/dictionary-items/${itemId}`, {
    method: "DELETE",
  });
}

export function fetchErrorCodes(projectId: number) {
  return apiFetch<ErrorCodeDetail[]>(`/api/v1/projects/${projectId}/error-codes`);
}

export function fetchAuditLogs(projectId: number, limit = 80) {
  return apiFetch<AuditLogDetail[]>(`/api/v1/projects/${projectId}/audit-logs?limit=${limit}`);
}

export function createErrorCode(projectId: number, payload: CreateErrorCodePayload) {
  return apiFetch<ErrorCodeDetail>(`/api/v1/projects/${projectId}/error-codes`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function importErrorCodes(projectId: number, payload: ImportErrorCodePayload) {
  return apiFetch<ErrorCodeImportResult>(`/api/v1/projects/${projectId}/error-codes/import`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateErrorCode(errorCodeId: number, payload: UpdateErrorCodePayload) {
  return apiFetch<ErrorCodeDetail>(`/api/v1/error-codes/${errorCodeId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteErrorCode(errorCodeId: number) {
  return apiFetch<null>(`/api/v1/error-codes/${errorCodeId}`, {
    method: "DELETE",
  });
}

export function createEnvironment(
  projectId: number,
  payload: CreateEnvironmentPayload,
) {
  return apiFetch<EnvironmentDetail>(
    `/api/v1/projects/${projectId}/environments`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function updateEnvironment(
  environmentId: number,
  payload: UpdateEnvironmentPayload,
) {
  return apiFetch<EnvironmentDetail>(`/api/v1/environments/${environmentId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteEnvironment(environmentId: number) {
  return apiFetch<null>(`/api/v1/environments/${environmentId}`, {
    method: "DELETE",
  });
}

export function updateGroup(groupId: number, payload: UpdateGroupPayload) {
  return apiFetch<GroupDetail>(`/api/v1/groups/${groupId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteGroup(groupId: number) {
  return apiFetch<null>(`/api/v1/groups/${groupId}`, {
    method: "DELETE",
  });
}

export function createEndpoint(
  groupId: number,
  payload: CreateEndpointPayload,
) {
  return apiFetch<EndpointDetail>(`/api/v1/groups/${groupId}/endpoints`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchEndpoint(endpointId: number) {
  return apiFetch<EndpointDetail>(`/api/v1/endpoints/${endpointId}`);
}

export function updateEndpoint(
  endpointId: number,
  payload: UpdateEndpointPayload,
) {
  return apiFetch<EndpointDetail>(`/api/v1/endpoints/${endpointId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteEndpoint(endpointId: number) {
  return apiFetch<null>(`/api/v1/endpoints/${endpointId}`, {
    method: "DELETE",
  });
}

export function fetchEndpointParameters(endpointId: number) {
  return apiFetch<ParameterDetail[]>(
    `/api/v1/endpoints/${endpointId}/parameters`,
  );
}

export function replaceEndpointParameters(
  endpointId: number,
  payload: ParameterUpsertItem[],
) {
  return apiFetch<null>(`/api/v1/endpoints/${endpointId}/parameters`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function fetchEndpointResponses(endpointId: number) {
  return apiFetch<ResponseDetail[]>(
    `/api/v1/endpoints/${endpointId}/responses`,
  );
}

export function replaceEndpointResponses(
  endpointId: number,
  payload: ResponseUpsertItem[],
) {
  return apiFetch<null>(`/api/v1/endpoints/${endpointId}/responses`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function fetchEndpointVersions(endpointId: number) {
  return apiFetch<VersionDetail[]>(`/api/v1/endpoints/${endpointId}/versions`);
}

export function compareEndpointVersions(
  endpointId: number,
  baseVersionId: number,
  targetVersionId?: number | null,
) {
  const params = new URLSearchParams({ baseVersionId: String(baseVersionId) });
  if (targetVersionId != null) {
    params.set("targetVersionId", String(targetVersionId));
  }
  return apiFetch<VersionComparisonResult>(
    `/api/v1/endpoints/${endpointId}/versions/compare?${params.toString()}`,
  );
}

export function fetchEndpointMockRules(endpointId: number) {
  return apiFetch<MockRuleDetail[]>(
    `/api/v1/endpoints/${endpointId}/mock-rules`,
  );
}

export function replaceEndpointMockRules(
  endpointId: number,
  payload: MockRuleUpsertItem[],
) {
  return apiFetch<null>(`/api/v1/endpoints/${endpointId}/mock-rules`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function fetchEndpointMockReleases(endpointId: number) {
  return apiFetch<MockReleaseDetail[]>(
    `/api/v1/endpoints/${endpointId}/mock-releases`,
  );
}

export function publishEndpointMockRelease(endpointId: number) {
  return apiFetch<MockReleaseDetail>(
    `/api/v1/endpoints/${endpointId}/mock-releases`,
    {
      method: "POST",
    },
  );
}

export function simulateEndpointMock(
  endpointId: number,
  payload: MockSimulationPayload,
) {
  return apiFetch<MockSimulationResult>(
    `/api/v1/endpoints/${endpointId}/mock-simulations`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function createVersion(
  endpointId: number,
  payload: CreateVersionPayload,
) {
  return apiFetch<VersionDetail>(`/api/v1/endpoints/${endpointId}/versions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function releaseEndpointVersion(endpointId: number, versionId: number) {
  return apiFetch<EndpointDetail>(
    `/api/v1/endpoints/${endpointId}/versions/${versionId}/release`,
    {
      method: "POST",
    },
  );
}

export function clearEndpointRelease(endpointId: number) {
  return apiFetch<EndpointDetail>(`/api/v1/endpoints/${endpointId}/release`, {
    method: "DELETE",
  });
}

export function executeDebug(payload: ExecuteDebugPayload) {
  return apiFetch<DebugExecutionResult>("/api/v1/debug/execute", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchDebugHistory(
  projectId: number,
  filters: DebugHistoryFilters = {},
) {
  const searchParams = new URLSearchParams({
    limit: String(filters.limit ?? 10),
  });
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

  return apiFetch<DebugHistoryItem[]>(
    `/api/v1/projects/${projectId}/debug-history?${searchParams.toString()}`,
  );
}

export function clearDebugHistory(
  projectId: number,
  filters: Omit<DebugHistoryFilters, "limit"> = {},
) {
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
  return apiFetch<{ deletedCount: number }>(
    `/api/v1/projects/${projectId}/debug-history${query ? `?${query}` : ""}`,
    {
      method: "DELETE",
    },
  );
}

export function fetchTestSuites(projectId: number) {
  return apiFetch<TestSuiteSummary[]>(
    `/api/v1/projects/${projectId}/test-suites`,
  );
}

export function fetchTestDashboard(projectId: number) {
  return apiFetch<TestDashboardDetail>(
    `/api/v1/projects/${projectId}/test-suites/dashboard`,
  );
}

export function fetchTestSuiteTriggers(projectId: number, suiteId: number) {
  return apiFetch<TestSuiteTriggerSummary[]>(
    `/api/v1/projects/${projectId}/test-suites/${suiteId}/triggers`,
  );
}

export function fetchTestSuiteSchedule(projectId: number, suiteId: number) {
  return apiFetch<TestSuiteScheduleDetail>(
    `/api/v1/projects/${projectId}/test-suites/${suiteId}/schedule`,
  );
}

export function updateTestSuiteSchedule(
  projectId: number,
  suiteId: number,
  payload: UpsertTestSuiteSchedulePayload,
) {
  return apiFetch<TestSuiteScheduleDetail>(
    `/api/v1/projects/${projectId}/test-suites/${suiteId}/schedule`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

export function createTestSuiteTrigger(
  projectId: number,
  suiteId: number,
  payload: CreateTriggerPayload,
) {
  return apiFetch<CreatedTestSuiteTrigger>(
    `/api/v1/projects/${projectId}/test-suites/${suiteId}/triggers`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function deleteTestSuiteTrigger(
  projectId: number,
  suiteId: number,
  triggerId: number,
) {
  return apiFetch<void>(
    `/api/v1/projects/${projectId}/test-suites/${suiteId}/triggers/${triggerId}`,
    {
      method: "DELETE",
    },
  );
}

export function createTestSuite(
  projectId: number,
  payload: UpsertTestSuitePayload,
) {
  return apiFetch<TestSuiteDetail>(
    `/api/v1/projects/${projectId}/test-suites`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function fetchTestSuite(projectId: number, suiteId: number) {
  return apiFetch<TestSuiteDetail>(
    `/api/v1/projects/${projectId}/test-suites/${suiteId}`,
  );
}

export function updateTestSuite(
  projectId: number,
  suiteId: number,
  payload: UpsertTestSuitePayload,
) {
  return apiFetch<TestSuiteDetail>(
    `/api/v1/projects/${projectId}/test-suites/${suiteId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

export function deleteTestSuite(projectId: number, suiteId: number) {
  return apiFetch<null>(
    `/api/v1/projects/${projectId}/test-suites/${suiteId}`,
    {
      method: "DELETE",
    },
  );
}

export function replaceTestSuiteSteps(
  projectId: number,
  suiteId: number,
  payload: TestStepUpsertItem[],
) {
  return apiFetch<TestSuiteDetail>(
    `/api/v1/projects/${projectId}/test-suites/${suiteId}/steps`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

export function executeTestSuite(projectId: number, suiteId: number) {
  return apiFetch<TestExecutionDetail>(
    `/api/v1/projects/${projectId}/test-suites/${suiteId}/execute`,
    {
      method: "POST",
    },
  );
}

export function fetchTestSuiteExecutions(projectId: number, suiteId: number) {
  return apiFetch<TestExecutionSummary[]>(
    `/api/v1/projects/${projectId}/test-suites/${suiteId}/executions`,
  );
}

export function fetchTestExecution(projectId: number, executionId: number) {
  return apiFetch<TestExecutionDetail>(
    `/api/v1/projects/${projectId}/test-suites/executions/${executionId}`,
  );
}
