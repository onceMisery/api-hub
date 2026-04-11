import type {
  EndpointDetail,
  MockConditionEntry,
  MockReleaseDetail,
  MockRuleDetail,
  MockRuleUpsertItem,
  MockSimulationPayload,
  MockSimulationResult,
  ParameterDetail,
  ParameterUpsertItem,
  ResponseDetail,
  ResponseUpsertItem,
  UpdateEndpointPayload,
  VersionDetail
} from "@api-hub/api-sdk";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { EndpointBasicsPanel } from "./endpoint-basics-panel";
import { EditorPanel, Field, PreviewMetric } from "./endpoint-editor-shared";
import { EndpointMockRulesPanel } from "./endpoint-mock-rules-panel";
import { EndpointMockSimulatorPanel } from "./endpoint-mock-simulator-panel";
import { EndpointParametersPanel } from "./endpoint-parameters-panel";
import { EndpointResponsesPanel } from "./endpoint-responses-panel";
import { EndpointVersionPanel } from "./endpoint-version-panel";
import { PublishedRuntimePanel } from "./published-runtime-panel";

type EndpointEditorProps = {
  endpoint: EndpointDetail | null;
  projectId: number;
  isLoading?: boolean;
  onDelete?: () => Promise<void>;
  onPublishMockRelease?: () => Promise<void>;
  onSave?: (payload: UpdateEndpointPayload) => Promise<void>;
  onSaveMockRules?: (payload: MockRuleUpsertItem[]) => Promise<void>;
  onSaveParameters?: (payload: ParameterUpsertItem[]) => Promise<void>;
  onSaveResponses?: (payload: ResponseUpsertItem[]) => Promise<void>;
  onSimulateMock?: (payload: MockSimulationPayload) => Promise<MockSimulationResult>;
  onSaveVersion?: (payload: { version: string; changeSummary: string }) => Promise<void>;
  mockReleases?: MockReleaseDetail[];
  mockRules?: MockRuleDetail[];
  parameters?: ParameterDetail[];
  responses?: ResponseDetail[];
  versions: VersionDetail[];
};

type ParameterDraft = {
  sectionType: string;
  name: string;
  dataType: string;
  required: boolean;
  description: string;
  exampleValue: string;
};

type ResponseDraft = {
  httpStatusCode: number;
  mediaType: string;
  name: string;
  dataType: string;
  required: boolean;
  description: string;
  exampleValue: string;
};

type MockRuleDraft = {
  ruleName: string;
  priority: number;
  enabled: boolean;
  queryConditionsText: string;
  headerConditionsText: string;
  statusCode: number;
  mediaType: string;
  body: string;
};

const EMPTY_PARAMETERS: ParameterDetail[] = [];
const EMPTY_RESPONSES: ResponseDetail[] = [];
const EMPTY_MOCK_RULES: MockRuleDetail[] = [];
const EMPTY_MOCK_RELEASES: MockReleaseDetail[] = [];
type SnapshotShape = {
  endpoint: {
    name: string;
    method: string;
    path: string;
    description: string;
  };
  parameters: ParameterDraft[];
  responses: ResponseDraft[];
};
type PreviewSource = "draft" | "latest-version";
type MockRuntimeSummary = {
  responseFieldCount: number;
  responseGroupCount: number;
  totalRuleCount: number;
  enabledRuleCount: number;
};
type MockReleaseRuleSnapshot = {
  ruleName: string;
  priority: number;
  enabled: boolean;
  queryConditions: MockConditionEntry[];
  headerConditions: MockConditionEntry[];
  statusCode: number;
  mediaType: string;
};
type PublishedResponseGroup = {
  key: string;
  label: string;
  fieldCount: number;
};
type PublishedRuleItem = {
  key: string;
  ruleName: string;
  priorityLabel: string;
  conditions: string[];
};

export function EndpointEditor(props: EndpointEditorProps) {
  const {
    endpoint,
    projectId,
    isLoading = false,
    onDelete,
    onPublishMockRelease,
    onSave,
    onSaveMockRules,
    onSaveParameters,
    onSaveResponses,
    onSimulateMock,
    onSaveVersion,
    mockReleases = EMPTY_MOCK_RELEASES,
    mockRules = EMPTY_MOCK_RULES,
    parameters = EMPTY_PARAMETERS,
    responses = EMPTY_RESPONSES,
    versions
  } = props;
  const [formState, setFormState] = useState<UpdateEndpointPayload>({
    description: "",
    method: "GET",
    mockEnabled: false,
    name: "",
    path: ""
  });
  const [parameterRows, setParameterRows] = useState<ParameterDraft[]>([]);
  const [responseRows, setResponseRows] = useState<ResponseDraft[]>([]);
  const [mockRuleRows, setMockRuleRows] = useState<MockRuleDraft[]>([]);
  const [versionForm, setVersionForm] = useState({ changeSummary: "", version: "" });
  const [compareVersionId, setCompareVersionId] = useState("");
  const [simulationQueryText, setSimulationQueryText] = useState("");
  const [simulationHeaderText, setSimulationHeaderText] = useState("");
  const [simulationResult, setSimulationResult] = useState<MockSimulationResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [mockRuleMessage, setMockRuleMessage] = useState<string | null>(null);
  const [parameterMessage, setParameterMessage] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const [simulationMessage, setSimulationMessage] = useState<string | null>(null);
  const [versionMessage, setVersionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!endpoint) {
      return;
    }

    setFormState({
      description: endpoint.description ?? "",
      method: endpoint.method,
      mockEnabled: endpoint.mockEnabled,
      name: endpoint.name,
      path: endpoint.path
    });
    setVersionForm({ changeSummary: "", version: "" });
    setCompareVersionId("");
    setSimulationQueryText("");
    setSimulationHeaderText("");
    setSimulationResult(null);
    setPublishMessage(null);
    setSaveMessage(null);
    setMockRuleMessage(null);
    setParameterMessage(null);
    setResponseMessage(null);
    setSimulationMessage(null);
    setVersionMessage(null);
  }, [endpoint]);

  useEffect(() => {
    setParameterRows(
      parameters.map((parameter) => ({
        dataType: parameter.dataType,
        description: parameter.description ?? "",
        exampleValue: parameter.exampleValue ?? "",
        name: parameter.name,
        required: parameter.required,
        sectionType: parameter.sectionType
      }))
    );
  }, [parameters]);

  useEffect(() => {
    setResponseRows(
      responses.map((response) => ({
        dataType: response.dataType,
        description: response.description ?? "",
        exampleValue: response.exampleValue ?? "",
        httpStatusCode: response.httpStatusCode,
        mediaType: response.mediaType,
        name: response.name ?? "",
        required: response.required
      }))
    );
  }, [responses]);

  useEffect(() => {
    setMockRuleRows(
      mockRules.map((rule) => ({
        body: rule.body ?? "{}",
        enabled: rule.enabled,
        headerConditionsText: formatConditions(rule.headerConditions),
        mediaType: rule.mediaType,
        priority: rule.priority,
        queryConditionsText: formatConditions(rule.queryConditions),
        ruleName: rule.ruleName,
        statusCode: rule.statusCode
      }))
    );
  }, [mockRules]);

  const latestSnapshot = useMemo(
    () =>
      JSON.stringify(
        {
          endpoint: formState,
          parameters: parameterRows,
          responses: responseRows
        },
        null,
        2
      ),
    [formState, parameterRows, responseRows]
  );
  const currentSnapshot = useMemo<SnapshotShape>(
    () => ({
      endpoint: {
        description: formState.description,
        method: formState.method,
        name: formState.name,
        path: formState.path
      },
      parameters: parameterRows,
      responses: responseRows
    }),
    [formState, parameterRows, responseRows]
  );
  const compareVersion = useMemo(
    () => versions.find((version) => String(version.id) === compareVersionId) ?? null,
    [compareVersionId, versions]
  );
  const diffItems = useMemo(() => {
    if (!compareVersion) {
      return [];
    }

    return buildSnapshotDiff(normalizeSnapshot(compareVersion.snapshotJson), currentSnapshot);
  }, [compareVersion, currentSnapshot]);
  const latestRelease = mockReleases[0] ?? null;
  const publishedRuntimeSummary = useMemo(() => summarizeMockRelease(latestRelease), [latestRelease]);
  const draftRuntimeSummary = useMemo(
    () => summarizeDraftRuntime(responseRows, mockRuleRows),
    [responseRows, mockRuleRows]
  );
  const runtimeDiffItems = useMemo(
    () => buildRuntimeDiffItems(publishedRuntimeSummary, draftRuntimeSummary, latestRelease !== null),
    [draftRuntimeSummary, latestRelease, publishedRuntimeSummary]
  );
  const publishedResponseGroups = useMemo(() => buildPublishedResponseGroups(latestRelease), [latestRelease]);
  const publishedRuleItems = useMemo(() => buildPublishedRuleItems(latestRelease), [latestRelease]);

  if (isLoading) {
    return (
      <section className="space-y-6">
        <EditorPanel title="Loading endpoint">
          <p className="text-sm text-slate-500">Fetching endpoint details and version snapshots.</p>
        </EditorPanel>
      </section>
    );
  }

  if (!endpoint) {
    return (
      <section className="space-y-6">
        <EditorPanel title="Pick an endpoint">
          <p className="text-sm text-slate-500">Select an endpoint from the tree to inspect its latest shape and versions.</p>
        </EditorPanel>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <EndpointBasicsPanel
        canDelete={Boolean(onDelete)}
        canSave={Boolean(onSave)}
        endpointId={endpoint.id}
        formState={formState}
        isSaving={isSaving}
        mockUrl={buildMockUrl(projectId, formState.path)}
        onDelete={() => void onDelete?.()}
        onFieldChange={updateField}
        onSubmit={(event) => void handleSubmit(event)}
        saveMessage={saveMessage}
      />

      <EndpointParametersPanel
        canSave={Boolean(onSaveParameters)}
        onAddRow={() => setParameterRows((current) => [...current, createParameterDraft()])}
        onRemoveRow={(index) => setParameterRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}
        onSave={() => void handleSaveParameters()}
        onUpdateRow={updateParameterRow}
        parameterMessage={parameterMessage}
        parameterRows={parameterRows}
      />

      <EndpointResponsesPanel
        canSave={Boolean(onSaveResponses)}
        onAddRow={() => setResponseRows((current) => [...current, createResponseDraft()])}
        onRemoveRow={(index) => setResponseRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}
        onSave={() => void handleSaveResponses()}
        onUpdateRow={updateResponseRow}
        responseMessage={responseMessage}
        responseRows={responseRows}
      />

      <EndpointMockRulesPanel
        buildRuleSummary={buildRuleSummary}
        canSave={Boolean(onSaveMockRules)}
        formatRulePreviewBody={formatRulePreviewBody}
        mockRuleMessage={mockRuleMessage}
        mockRuleRows={mockRuleRows}
        onAddRule={() => setMockRuleRows((current) => [...current, createMockRuleDraft()])}
        onRemoveRule={(index) => setMockRuleRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}
        onSaveRules={() => void handleSaveMockRules()}
        onUpdateRule={updateMockRuleRow}
      />

      <EndpointMockSimulatorPanel
        canRun={Boolean(onSimulateMock)}
        isSimulating={isSimulating}
        onHeaderTextChange={setSimulationHeaderText}
        onQueryTextChange={setSimulationQueryText}
        onRun={() => void handleRunSimulation()}
        simulationHeaderText={simulationHeaderText}
        simulationMessage={simulationMessage}
        simulationQueryText={simulationQueryText}
        simulationResult={simulationResult}
      />

      <PublishedRuntimePanel
        draftRuntimeSummary={draftRuntimeSummary}
        isPublishing={isPublishing}
        latestRelease={latestRelease}
        mockUrl={buildMockUrl(projectId, formState.path)}
        onPublish={onPublishMockRelease ? () => void handlePublishMock() : undefined}
        publishMessage={publishMessage}
        publishedResponseGroups={publishedResponseGroups}
        publishedRuleItems={publishedRuleItems}
        publishedRuntimeSummary={publishedRuntimeSummary}
        runtimeDiffItems={runtimeDiffItems}
      />

      <EndpointVersionPanel
        compareVersion={compareVersion}
        compareVersionId={compareVersionId}
        diffItems={diffItems}
        latestSnapshot={latestSnapshot}
        onCompareVersionChange={setCompareVersionId}
        onSaveVersion={onSaveVersion ? () => void handleSaveVersion() : undefined}
        onVersionFieldChange={(field, value) => setVersionForm((current) => ({ ...current, [field]: value }))}
        versionForm={versionForm}
        versionMessage={versionMessage}
        versions={versions}
      />
    </section>
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onSave) {
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      await onSave(formState);
      setSaveMessage("Saved");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveParameters() {
    if (!onSaveParameters) {
      return;
    }

    await onSaveParameters(parameterRows);
    setParameterMessage("Saved");
  }

  async function handleSaveResponses() {
    if (!onSaveResponses) {
      return;
    }

    await onSaveResponses(responseRows);
    setResponseMessage("Saved");
  }

  async function handleSaveMockRules() {
    if (!onSaveMockRules) {
      return;
    }

    await onSaveMockRules(buildSimulationPayload().draftRules);
    setMockRuleMessage("Saved");
  }

  async function handleRunSimulation() {
    if (!onSimulateMock) {
      return;
    }

    setIsSimulating(true);
    setSimulationMessage(null);

    try {
      const result = await onSimulateMock(buildSimulationPayload());
      setSimulationResult(result);
      setSimulationMessage("Simulation complete");
    } finally {
      setIsSimulating(false);
    }
  }

  async function handlePublishMock() {
    if (!onPublishMockRelease) {
      return;
    }

    setIsPublishing(true);
    setPublishMessage(null);

    try {
      await onPublishMockRelease();
      setPublishMessage("Published");
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleSaveVersion() {
    if (!onSaveVersion) {
      return;
    }

    await onSaveVersion(versionForm);
    setVersionMessage("Saved");
  }

  function updateField<K extends keyof UpdateEndpointPayload>(field: K, value: UpdateEndpointPayload[K]) {
    setFormState((current) => ({
      ...current,
      [field]: value
    }));
  }

  function updateParameterRow<K extends keyof ParameterDraft>(index: number, field: K, value: ParameterDraft[K]) {
    setParameterRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
  }

  function updateResponseRow<K extends keyof ResponseDraft>(index: number, field: K, value: ResponseDraft[K]) {
    setResponseRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
  }

  function updateMockRuleRow<K extends keyof MockRuleDraft>(index: number, field: K, value: MockRuleDraft[K]) {
    setMockRuleRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
  }

  function buildSimulationPayload(): MockSimulationPayload {
    return {
      draftRules: mockRuleRows.map((rule) => ({
        body: rule.body,
        enabled: rule.enabled,
        headerConditions: parseConditions(rule.headerConditionsText),
        mediaType: rule.mediaType,
        priority: rule.priority,
        queryConditions: parseConditions(rule.queryConditionsText),
        ruleName: rule.ruleName,
        statusCode: rule.statusCode
      })),
      draftResponses: responseRows.map((response) => ({
        dataType: response.dataType,
        description: response.description,
        exampleValue: response.exampleValue,
        httpStatusCode: response.httpStatusCode,
        mediaType: response.mediaType,
        name: response.name,
        required: response.required
      })),
      headerSamples: parseConditions(simulationHeaderText),
      querySamples: parseConditions(simulationQueryText)
    };
  }
}

function createParameterDraft(): ParameterDraft {
  return {
    dataType: "string",
    description: "",
    exampleValue: "",
    name: "",
    required: false,
    sectionType: "query"
  };
}

function createResponseDraft(): ResponseDraft {
  return {
    dataType: "string",
    description: "",
    exampleValue: "",
    httpStatusCode: 200,
    mediaType: "application/json",
    name: "",
    required: false
  };
}

function createMockRuleDraft(): MockRuleDraft {
  return {
    body: "{}",
    enabled: true,
    headerConditionsText: "",
    mediaType: "application/json",
    priority: 100,
    queryConditionsText: "",
    ruleName: "",
    statusCode: 200
  };
}

function buildMockUrl(projectId: number, path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `/mock/${projectId}${normalizedPath}`;
}

function buildPreviewOptions(responseRows: ResponseDraft[]) {
  const options = new Map<string, { key: string; label: string }>();

  for (const response of responseRows) {
    const mediaType = response.mediaType || "application/json";
    const key = `${response.httpStatusCode}:${mediaType}`;
    if (!options.has(key)) {
      options.set(key, {
        key,
        label: `${response.httpStatusCode} ${mediaType}`
      });
    }
  }

  return [...options.values()];
}

function buildMockPreview(responseRows: ResponseDraft[], previewKey: string) {
  if (responseRows.length === 0) {
    return {
      body: "{}",
      mediaType: "application/json",
      statusCode: 200
    };
  }

  const fallbackRow = responseRows[0];
  const [selectedStatus, selectedMediaType] = previewKey.split(":");
  const activeRows = responseRows.filter((response) => {
    const mediaType = response.mediaType || "application/json";
    if (!previewKey) {
      return response.httpStatusCode === fallbackRow.httpStatusCode && mediaType === fallbackRow.mediaType;
    }

    return String(response.httpStatusCode) === selectedStatus && mediaType === selectedMediaType;
  });
  const activeRow = activeRows[0] ?? fallbackRow;

  return {
    body: JSON.stringify(buildMockPayload(activeRows), null, 2),
    mediaType: activeRow.mediaType || "application/json",
    statusCode: activeRow.httpStatusCode || 200
  };
}

function buildMockPayload(responseRows: ResponseDraft[]) {
  if (responseRows.length === 1 && !responseRows[0].name.trim()) {
    return resolveMockValue(responseRows[0]);
  }

  return responseRows.reduce<Record<string, unknown>>((payload, response) => {
    const fieldName = response.name.trim();
    if (!fieldName) {
      return payload;
    }

    payload[fieldName] = resolveMockValue(response);
    return payload;
  }, {});
}

function resolveMockValue(response: ResponseDraft) {
  if (response.exampleValue.trim()) {
    return parseMockExample(response.dataType, response.exampleValue.trim());
  }

  return defaultMockValue(response.dataType);
}

function parseMockExample(dataType: string, exampleValue: string) {
  try {
    switch (dataType.toLowerCase()) {
      case "integer":
      case "int":
      case "long":
        return Number.parseInt(exampleValue, 10);
      case "number":
      case "float":
      case "double":
      case "decimal":
        return Number.parseFloat(exampleValue);
      case "boolean":
        return exampleValue === "true";
      case "array":
      case "object":
        return JSON.parse(exampleValue);
      default:
        return exampleValue;
    }
  } catch {
    return defaultMockValue(dataType);
  }
}

function defaultMockValue(dataType: string) {
  switch (dataType.toLowerCase()) {
    case "integer":
    case "int":
    case "long":
      return 0;
    case "number":
    case "float":
    case "double":
    case "decimal":
      return 0;
    case "boolean":
      return true;
    case "array":
      return [];
    case "object":
      return {};
    default:
      return "";
  }
}

function formatConditions(conditions: MockConditionEntry[]) {
  return conditions.map((condition) => `${condition.name}=${condition.value}`).join("\n");
}

function parseConditions(text: string): MockConditionEntry[] {
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

function buildRuleSummary(rule: MockRuleDraft) {
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

function buildPreviewDetails(
  previewSource: PreviewSource,
  mockRuleRows: MockRuleDraft[],
  selectedPreviewKey: string,
  mockPreview: { statusCode: number; mediaType: string; body: string }
) {
  const activeKey = selectedPreviewKey || `${mockPreview.statusCode}:${mockPreview.mediaType}`;
  const matchingRule = mockRuleRows.find((rule) => {
    if (!rule.enabled) {
      return false;
    }

    const ruleKey = `${rule.statusCode}:${rule.mediaType || "application/json"}`;
    return ruleKey === activeKey;
  });

  if (matchingRule) {
    return {
      badge: "Conditional rule override",
      lines: [`Rule: ${matchingRule.ruleName || "Unnamed rule"}`, ...buildRuleSummary(matchingRule)],
      priorityLabel: `Priority ${matchingRule.priority}`
    };
  }

  if (previewSource === "latest-version") {
    return {
      badge: "Latest saved version",
      lines: ["Preview is generated from the latest saved version snapshot.", `Status group: ${activeKey}`],
      priorityLabel: null
    };
  }

  return {
    badge: "Current draft",
    lines: ["Preview is generated from the current draft response rows.", `Status group: ${activeKey}`],
    priorityLabel: null
  };
}

function formatRulePreviewBody(body: string) {
  if (!body.trim()) {
    return "{}";
  }

  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

function normalizeSnapshot(snapshotJson: string | null): SnapshotShape {
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

function normalizeParameterDraft(parameter: Partial<ParameterDraft>): ParameterDraft {
  return {
    dataType: typeof parameter.dataType === "string" ? parameter.dataType : "string",
    description: typeof parameter.description === "string" ? parameter.description : "",
    exampleValue: typeof parameter.exampleValue === "string" ? parameter.exampleValue : "",
    name: typeof parameter.name === "string" ? parameter.name : "",
    required: Boolean(parameter.required),
    sectionType: typeof parameter.sectionType === "string" ? parameter.sectionType : "query"
  };
}

function normalizeResponseDraft(response: Partial<ResponseDraft>): ResponseDraft {
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

function buildSnapshotDiff(previous: SnapshotShape, current: SnapshotShape) {
  const items: Array<{ title: string; detail: string }> = [];

  pushEndpointFieldDiff(items, "name", "Changed endpoint name", previous.endpoint.name, current.endpoint.name);
  pushEndpointFieldDiff(items, "path", "Changed endpoint path", previous.endpoint.path, current.endpoint.path);
  pushEndpointFieldDiff(items, "method", "Changed endpoint method", previous.endpoint.method, current.endpoint.method);
  pushEndpointFieldDiff(
    items,
    "description",
    "Changed endpoint description",
    previous.endpoint.description,
    current.endpoint.description
  );

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

function pushEndpointFieldDiff(
  items: Array<{ title: string; detail: string }>,
  _field: string,
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

function summarizeMockRelease(release: MockReleaseDetail | null): MockRuntimeSummary {
  if (!release) {
    return emptyMockRuntimeSummary();
  }

  const responses = readReleaseResponses(release.responseSnapshotJson);
  const rules = readReleaseRules(release.rulesSnapshotJson);

  return summarizeMockRuntime(responses, rules);
}

function summarizeDraftRuntime(responseRows: ResponseDraft[], mockRuleRows: MockRuleDraft[]): MockRuntimeSummary {
  return summarizeMockRuntime(responseRows, mockRuleRows);
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

function buildRuntimeDiffItems(
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

function emptyMockRuntimeSummary(): MockRuntimeSummary {
  return {
    enabledRuleCount: 0,
    responseFieldCount: 0,
    responseGroupCount: 0,
    totalRuleCount: 0
  };
}

function buildPublishedResponseGroups(release: MockReleaseDetail | null): PublishedResponseGroup[] {
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

function buildPublishedRuleItems(release: MockReleaseDetail | null): PublishedRuleItem[] {
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

function buildPublishedRuleConditions(rule: MockReleaseRuleSnapshot) {
  const queryConditions = rule.queryConditions.map((condition) => `query ${condition.name}=${condition.value}`);
  const headerConditions = rule.headerConditions.map((condition) => `header ${condition.name}=${condition.value}`);
  const conditions = [...queryConditions, ...headerConditions];

  if (conditions.length > 0) {
    return conditions;
  }

  return [`Returns ${rule.statusCode} ${rule.mediaType}`];
}
