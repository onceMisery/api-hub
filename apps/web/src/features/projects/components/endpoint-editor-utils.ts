import type { MockConditionEntry, MockReleaseDetail } from "@api-hub/api-sdk";

export type ParameterDraft = {
  sectionType: string;
  name: string;
  dataType: string;
  required: boolean;
  description: string;
  exampleValue: string;
};

export type ResponseDraft = {
  httpStatusCode: number;
  mediaType: string;
  name: string;
  dataType: string;
  required: boolean;
  description: string;
  exampleValue: string;
};

export type MockRuleDraft = {
  ruleName: string;
  priority: number;
  enabled: boolean;
  queryConditionsText: string;
  headerConditionsText: string;
  statusCode: number;
  mediaType: string;
  body: string;
};

export type SnapshotShape = {
  endpoint: {
    name: string;
    method: string;
    path: string;
    description: string;
  };
  parameters: ParameterDraft[];
  responses: ResponseDraft[];
};

export type MockRuntimeSummary = {
  responseFieldCount: number;
  responseGroupCount: number;
  totalRuleCount: number;
  enabledRuleCount: number;
};

export type MockReleaseRuleSnapshot = {
  ruleName: string;
  priority: number;
  enabled: boolean;
  queryConditions: MockConditionEntry[];
  headerConditions: MockConditionEntry[];
  statusCode: number;
  mediaType: string;
};

export type PublishedResponseGroup = {
  key: string;
  label: string;
  fieldCount: number;
};

export type PublishedRuleItem = {
  key: string;
  ruleName: string;
  priorityLabel: string;
  conditions: string[];
};

export function formatConditions(conditions: MockConditionEntry[]) {
  return conditions.map((condition) => `${condition.name}=${condition.value}`).join("\n");
}

export function parseConditions(text: string): MockConditionEntry[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) {
        return {
          name: line,
          value: ""
        };
      }

      return {
        name: line.slice(0, separatorIndex).trim(),
        value: line.slice(separatorIndex + 1).trim()
      };
    })
    .filter((condition) => condition.name);
}

export function buildRuleSummary(rule: MockRuleDraft) {
  const queryConditions = parseConditions(rule.queryConditionsText).map(
    (condition) => `query ${condition.name}=${condition.value}`
  );
  const headerConditions = parseConditions(rule.headerConditionsText).map(
    (condition) => `header ${condition.name}=${condition.value}`
  );
  const conditions = [...queryConditions, ...headerConditions];

  if (conditions.length === 0) {
    return ["Matches any request for this endpoint."];
  }

  return conditions;
}

export function formatRulePreviewBody(body: string) {
  if (!body.trim()) {
    return "{}";
  }

  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

export function normalizeSnapshot(snapshotJson: string | null): SnapshotShape {
  if (!snapshotJson) {
    return emptySnapshot();
  }

  try {
    const parsed = JSON.parse(snapshotJson) as Partial<SnapshotShape> & {
      path?: string;
      method?: string;
      name?: string;
      description?: string;
    };

    const endpointSource = parsed.endpoint ?? parsed;

    return {
      endpoint: {
        description: typeof endpointSource.description === "string" ? endpointSource.description : "",
        method: typeof endpointSource.method === "string" ? endpointSource.method : "GET",
        name: typeof endpointSource.name === "string" ? endpointSource.name : "",
        path: typeof endpointSource.path === "string" ? endpointSource.path : ""
      },
      parameters: Array.isArray(parsed.parameters) ? parsed.parameters.map(normalizeParameterDraft) : [],
      responses: Array.isArray(parsed.responses) ? parsed.responses.map(normalizeResponseDraft) : []
    };
  } catch {
    return emptySnapshot();
  }
}

export function normalizeParameterDraft(parameter: Partial<ParameterDraft>): ParameterDraft {
  return {
    dataType: typeof parameter.dataType === "string" ? parameter.dataType : "string",
    description: typeof parameter.description === "string" ? parameter.description : "",
    exampleValue: typeof parameter.exampleValue === "string" ? parameter.exampleValue : "",
    name: typeof parameter.name === "string" ? parameter.name : "",
    required: Boolean(parameter.required),
    sectionType: typeof parameter.sectionType === "string" ? parameter.sectionType : "query"
  };
}

export function normalizeResponseDraft(response: Partial<ResponseDraft>): ResponseDraft {
  return {
    dataType: typeof response.dataType === "string" ? response.dataType : "string",
    description: typeof response.description === "string" ? response.description : "",
    exampleValue: typeof response.exampleValue === "string" ? response.exampleValue : "",
    httpStatusCode: typeof response.httpStatusCode === "number" ? response.httpStatusCode : 200,
    mediaType: typeof response.mediaType === "string" ? response.mediaType : "application/json",
    name: typeof response.name === "string" ? response.name : "",
    required: Boolean(response.required)
  };
}

export function buildSnapshotDiff(previous: SnapshotShape, current: SnapshotShape) {
  const items: Array<{ title: string; detail: string }> = [];

  pushEndpointFieldDiff(items, "Changed endpoint name", previous.endpoint.name, current.endpoint.name);
  pushEndpointFieldDiff(items, "Changed endpoint path", previous.endpoint.path, current.endpoint.path);
  pushEndpointFieldDiff(items, "Changed endpoint method", previous.endpoint.method, current.endpoint.method);
  pushEndpointFieldDiff(items, "Changed endpoint description", previous.endpoint.description, current.endpoint.description);

  const previousParameters = new Map(previous.parameters.map((parameter) => [buildParameterKey(parameter), parameter]));
  const currentParameters = new Map(current.parameters.map((parameter) => [buildParameterKey(parameter), parameter]));

  for (const [parameterKey, parameter] of currentParameters) {
    if (!previousParameters.has(parameterKey)) {
      items.push({
        title: "Added request parameter",
        detail: parameterKey
      });
      continue;
    }

    const previousParameter = previousParameters.get(parameterKey);
    if (!previousParameter) {
      continue;
    }

    pushFieldChange(items, "Changed request parameter type", parameterKey, previousParameter.dataType, parameter.dataType);
    pushFieldChange(items, "Changed request parameter required flag", parameterKey, String(previousParameter.required), String(parameter.required));
    pushFieldChange(items, "Changed request parameter description", parameterKey, previousParameter.description, parameter.description);
    pushFieldChange(items, "Changed request parameter example", parameterKey, previousParameter.exampleValue, parameter.exampleValue);
  }

  for (const [parameterKey] of previousParameters) {
    if (!currentParameters.has(parameterKey)) {
      items.push({
        title: "Removed request parameter",
        detail: parameterKey
      });
    }
  }

  const previousResponses = new Map(previous.responses.map((response) => [buildResponseKey(response), response]));
  const currentResponses = new Map(current.responses.map((response) => [buildResponseKey(response), response]));

  for (const [responseKey, response] of currentResponses) {
    if (!previousResponses.has(responseKey)) {
      items.push({
        title: "Added response field",
        detail: responseKey
      });
      continue;
    }

    const previousResponse = previousResponses.get(responseKey);
    if (!previousResponse) {
      continue;
    }

    pushFieldChange(items, "Changed response field type", responseKey, previousResponse.dataType, response.dataType);
    pushFieldChange(items, "Changed response field required flag", responseKey, String(previousResponse.required), String(response.required));
    pushFieldChange(items, "Changed response field description", responseKey, previousResponse.description, response.description);
    pushFieldChange(items, "Changed response field example", responseKey, previousResponse.exampleValue, response.exampleValue);
  }

  for (const [responseKey] of previousResponses) {
    if (!currentResponses.has(responseKey)) {
      items.push({
        title: "Removed response field",
        detail: responseKey
      });
    }
  }

  return items;
}

export function summarizeMockRelease(release: MockReleaseDetail | null): MockRuntimeSummary {
  if (!release) {
    return emptyMockRuntimeSummary();
  }

  const responses = readReleaseResponses(release.responseSnapshotJson);
  const rules = readReleaseRules(release.rulesSnapshotJson);

  return summarizeMockRuntime(responses, rules);
}

export function summarizeDraftRuntime(responseRows: ResponseDraft[], mockRuleRows: MockRuleDraft[]): MockRuntimeSummary {
  return summarizeMockRuntime(responseRows, mockRuleRows);
}

export function buildRuntimeDiffItems(
  published: MockRuntimeSummary,
  draft: MockRuntimeSummary,
  hasPublishedRelease: boolean
) {
  if (!hasPublishedRelease) {
    return [];
  }

  const items: string[] = [];

  if (published.responseFieldCount !== draft.responseFieldCount) {
    items.push(`Draft response fields changed from ${published.responseFieldCount} to ${draft.responseFieldCount}.`);
  }

  if (published.responseGroupCount !== draft.responseGroupCount) {
    items.push(`Draft response groups changed from ${published.responseGroupCount} to ${draft.responseGroupCount}.`);
  }

  if (published.enabledRuleCount !== draft.enabledRuleCount) {
    items.push(`Draft enabled rules changed from ${published.enabledRuleCount} to ${draft.enabledRuleCount}.`);
  }

  if (published.totalRuleCount !== draft.totalRuleCount) {
    items.push(`Draft total rules changed from ${published.totalRuleCount} to ${draft.totalRuleCount}.`);
  }

  return items;
}

export function buildPublishedResponseGroups(release: MockReleaseDetail | null): PublishedResponseGroup[] {
  if (!release) {
    return [];
  }

  const groups = new Map<string, PublishedResponseGroup>();
  for (const response of readReleaseResponses(release.responseSnapshotJson)) {
    const key = `${response.httpStatusCode}:${response.mediaType}`;
    const existing = groups.get(key);
    if (existing) {
      existing.fieldCount += 1;
      continue;
    }

    groups.set(key, {
      key,
      label: `${response.httpStatusCode} ${response.mediaType}`,
      fieldCount: 1
    });
  }

  return [...groups.values()];
}

export function buildPublishedRuleItems(release: MockReleaseDetail | null): PublishedRuleItem[] {
  if (!release) {
    return [];
  }

  return readReleaseRules(release.rulesSnapshotJson)
    .filter((rule) => rule.enabled)
    .map((rule) => ({
      conditions: buildPublishedRuleConditions(rule),
      key: `${rule.ruleName}:${rule.priority}:${rule.statusCode}:${rule.mediaType}`,
      priorityLabel: `Priority ${rule.priority}`,
      ruleName: rule.ruleName || "Unnamed rule"
    }));
}

function emptySnapshot(): SnapshotShape {
  return {
    endpoint: {
      description: "",
      method: "GET",
      name: "",
      path: ""
    },
    parameters: [],
    responses: []
  };
}

function pushEndpointFieldDiff(
  items: Array<{ title: string; detail: string }>,
  title: string,
  previousValue: string,
  currentValue: string
) {
  if (previousValue === currentValue) {
    return;
  }

  items.push({
    title,
    detail: `${displayDiffValue(previousValue)} -> ${displayDiffValue(currentValue)}`
  });
}

function buildParameterKey(parameter: ParameterDraft) {
  return `${parameter.sectionType}.${parameter.name}`;
}

function buildResponseKey(response: ResponseDraft) {
  return `${response.httpStatusCode} ${response.mediaType} ${response.name}`.trim();
}

function pushFieldChange(
  items: Array<{ title: string; detail: string }>,
  title: string,
  fieldKey: string,
  previousValue: string,
  currentValue: string
) {
  if (previousValue === currentValue) {
    return;
  }

  items.push({
    title,
    detail: `${fieldKey}: ${displayDiffValue(previousValue)} -> ${displayDiffValue(currentValue)}`
  });
}

function displayDiffValue(value: string) {
  return value.trim() ? value : "(empty)";
}

function summarizeMockRuntime(
  responses: Array<Pick<ResponseDraft, "httpStatusCode" | "mediaType">>,
  rules: Array<Pick<MockRuleDraft, "enabled">>
): MockRuntimeSummary {
  const responseGroups = new Set(
    responses.map((response) => `${response.httpStatusCode}:${response.mediaType || "application/json"}`)
  );

  return {
    enabledRuleCount: rules.filter((rule) => rule.enabled).length,
    responseFieldCount: responses.length,
    responseGroupCount: responseGroups.size,
    totalRuleCount: rules.length
  };
}

function readReleaseResponses(snapshotJson: string): ResponseDraft[] {
  try {
    const parsed = JSON.parse(snapshotJson) as Partial<ResponseDraft>[];
    return Array.isArray(parsed) ? parsed.map(normalizeResponseDraft) : [];
  } catch {
    return [];
  }
}

function readReleaseRules(snapshotJson: string): MockReleaseRuleSnapshot[] {
  try {
    const parsed = JSON.parse(snapshotJson) as Partial<MockReleaseRuleSnapshot>[];
    return Array.isArray(parsed) ? parsed.map(normalizeMockReleaseRule) : [];
  } catch {
    return [];
  }
}

function normalizeMockReleaseRule(rule: Partial<MockReleaseRuleSnapshot>): MockReleaseRuleSnapshot {
  return {
    enabled: rule.enabled !== false,
    headerConditions: normalizeConditionEntries(rule.headerConditions),
    mediaType: typeof rule.mediaType === "string" ? rule.mediaType : "application/json",
    priority: typeof rule.priority === "number" ? rule.priority : 100,
    queryConditions: normalizeConditionEntries(rule.queryConditions),
    ruleName: typeof rule.ruleName === "string" ? rule.ruleName : "",
    statusCode: typeof rule.statusCode === "number" ? rule.statusCode : 200
  };
}

function normalizeConditionEntries(conditions: unknown): MockConditionEntry[] {
  if (!Array.isArray(conditions)) {
    return [];
  }

  return conditions
    .map((condition) => {
      if (!condition || typeof condition !== "object") {
        return null;
      }

      const candidate = condition as Partial<MockConditionEntry>;
      if (typeof candidate.name !== "string") {
        return null;
      }

      return {
        name: candidate.name,
        value: typeof candidate.value === "string" ? candidate.value : ""
      };
    })
    .filter((condition): condition is MockConditionEntry => condition !== null);
}

function emptyMockRuntimeSummary(): MockRuntimeSummary {
  return {
    enabledRuleCount: 0,
    responseFieldCount: 0,
    responseGroupCount: 0,
    totalRuleCount: 0
  };
}

function buildPublishedRuleConditions(rule: MockReleaseRuleSnapshot) {
  const queryConditions = rule.queryConditions.map((condition) => `query ${condition.name}=${condition.value}`);
  const headerConditions = rule.headerConditions.map((condition) => `header ${condition.name}=${condition.value}`);
  const conditions = [...queryConditions, ...headerConditions];

  if (conditions.length > 0) {
    return conditions;
  }

  return [`Returns ${rule.statusCode} ${rule.mediaType}`];
}
