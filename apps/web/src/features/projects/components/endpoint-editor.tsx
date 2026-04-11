import type {
  EndpointDetail,
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
import { EditorPanel } from "./endpoint-editor-shared";
import {
  buildPublishedResponseGroups,
  buildPublishedRuleItems,
  buildRuleSummary,
  buildRuntimeDiffItems,
  formatBodyConditions,
  buildSnapshotDiff,
  formatConditions,
  formatRulePreviewBody,
  normalizeSnapshot,
  parseRestorableSnapshot,
  parseBodyConditions,
  parseConditions,
  summarizeDraftRuntime,
  summarizeMockRelease,
  type MockRuleDraft,
  type ParameterDraft,
  type ResponseDraft,
  type SnapshotShape
} from "./endpoint-editor-utils";
import { EndpointMockRulesPanel } from "./endpoint-mock-rules-panel";
import { EndpointMockSimulatorPanel } from "./endpoint-mock-simulator-panel";
import { EndpointParametersPanel } from "./endpoint-parameters-panel";
import { EndpointResponsesPanel } from "./endpoint-responses-panel";
import { EndpointVersionPanel } from "./endpoint-version-panel";
import { PublishedRuntimePanel } from "./published-runtime-panel";

type EndpointEditorProps = {
  canWrite?: boolean;
  endpoint: EndpointDetail | null;
  projectId: number;
  isLoading?: boolean;
  onDelete?: () => Promise<void>;
  onPublishMockRelease?: () => Promise<void>;
  onSave?: (payload: UpdateEndpointPayload) => Promise<void>;
  onSaveMockRules?: (payload: MockRuleUpsertItem[]) => Promise<void>;
  onSaveParameters?: (payload: ParameterUpsertItem[]) => Promise<void>;
  onSaveResponses?: (payload: ResponseUpsertItem[]) => Promise<void>;
  onReleaseVersion?: (version: VersionDetail) => Promise<void>;
  onRestoreVersion?: (version: VersionDetail, snapshot: SnapshotShape) => Promise<void>;
  onClearReleasedVersion?: () => Promise<void>;
  onSimulateMock?: (payload: MockSimulationPayload) => Promise<MockSimulationResult>;
  onSaveVersion?: (payload: { version: string; changeSummary: string }) => Promise<void>;
  mockReleases?: MockReleaseDetail[];
  mockRules?: MockRuleDetail[];
  parameters?: ParameterDetail[];
  responses?: ResponseDetail[];
  versions: VersionDetail[];
};

const EMPTY_PARAMETERS: ParameterDetail[] = [];
const EMPTY_RESPONSES: ResponseDetail[] = [];
const EMPTY_MOCK_RULES: MockRuleDetail[] = [];
const EMPTY_MOCK_RELEASES: MockReleaseDetail[] = [];

export function EndpointEditor(props: EndpointEditorProps) {
  const {
    endpoint,
    canWrite = true,
    projectId,
    isLoading = false,
    onDelete,
    onPublishMockRelease,
    onSave,
    onSaveMockRules,
    onSaveParameters,
    onSaveResponses,
    onReleaseVersion,
    onRestoreVersion,
    onClearReleasedVersion,
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
  const [inspectedReleaseId, setInspectedReleaseId] = useState("");
  const [simulationQueryText, setSimulationQueryText] = useState("");
  const [simulationHeaderText, setSimulationHeaderText] = useState("");
  const [simulationBodyText, setSimulationBodyText] = useState("");
  const [simulationResult, setSimulationResult] = useState<MockSimulationResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isManagingRelease, setIsManagingRelease] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [mockRuleMessage, setMockRuleMessage] = useState<string | null>(null);
  const [parameterMessage, setParameterMessage] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [releaseMessage, setReleaseMessage] = useState<string | null>(null);
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
    setSimulationBodyText("");
    setSimulationResult(null);
    setPublishMessage(null);
    setSaveMessage(null);
    setMockRuleMessage(null);
    setParameterMessage(null);
    setResponseMessage(null);
    setReleaseError(null);
    setReleaseMessage(null);
    setRestoreError(null);
    setRestoreMessage(null);
    setSimulationMessage(null);
    setVersionMessage(null);
  }, [endpoint]);

  useEffect(() => {
    setInspectedReleaseId(mockReleases[0] ? String(mockReleases[0].id) : "");
  }, [endpoint?.id, mockReleases]);

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
        bodyConditionsText: formatBodyConditions(rule.bodyConditions),
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
  const diffResult = useMemo(() => {
    if (!compareVersion) {
      return null;
    }

    return buildSnapshotDiff(normalizeSnapshot(compareVersion.snapshotJson), currentSnapshot);
  }, [compareVersion, currentSnapshot]);
  const latestRelease = mockReleases[0] ?? null;
  const inspectedRelease = useMemo(
    () => mockReleases.find((release) => String(release.id) === inspectedReleaseId) ?? latestRelease,
    [inspectedReleaseId, latestRelease, mockReleases]
  );
  const publishedRuntimeSummary = useMemo(() => summarizeMockRelease(inspectedRelease), [inspectedRelease]);
  const draftRuntimeSummary = useMemo(
    () => summarizeDraftRuntime(responseRows, mockRuleRows),
    [responseRows, mockRuleRows]
  );
  const runtimeDiffItems = useMemo(
    () => buildRuntimeDiffItems(publishedRuntimeSummary, draftRuntimeSummary, inspectedRelease !== null),
    [draftRuntimeSummary, inspectedRelease, publishedRuntimeSummary]
  );
  const publishedResponseGroups = useMemo(() => buildPublishedResponseGroups(inspectedRelease), [inspectedRelease]);
  const publishedRuleItems = useMemo(() => buildPublishedRuleItems(inspectedRelease), [inspectedRelease]);

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
        canDelete={canWrite && Boolean(onDelete)}
        canSave={canWrite && Boolean(onSave)}
        endpointId={endpoint.id}
        formState={formState}
        isSaving={isSaving}
        mockUrl={buildMockUrl(projectId, formState.path)}
        releaseState={{
          releasedAt: endpoint.releasedAt ?? null,
          releasedVersionLabel: endpoint.releasedVersionLabel ?? null,
          status: endpoint.status ?? "draft"
        }}
        onDelete={() => void onDelete?.()}
        onFieldChange={updateField}
        onSubmit={(event) => void handleSubmit(event)}
        saveMessage={saveMessage}
      />

      <EndpointParametersPanel
        canSave={canWrite && Boolean(onSaveParameters)}
        onAddRow={() => setParameterRows((current) => [...current, createParameterDraft()])}
        onRemoveRow={(index) => setParameterRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}
        onSave={() => void handleSaveParameters()}
        onUpdateRow={updateParameterRow}
        parameterMessage={parameterMessage}
        parameterRows={parameterRows}
      />

      <EndpointResponsesPanel
        canSave={canWrite && Boolean(onSaveResponses)}
        onAddRow={() => setResponseRows((current) => [...current, createResponseDraft()])}
        onRemoveRow={(index) => setResponseRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}
        onSave={() => void handleSaveResponses()}
        onUpdateRow={updateResponseRow}
        responseMessage={responseMessage}
        responseRows={responseRows}
      />

      <EndpointMockRulesPanel
        buildRuleSummary={buildRuleSummary}
        canSave={canWrite && Boolean(onSaveMockRules)}
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
        onBodyTextChange={setSimulationBodyText}
        onHeaderTextChange={setSimulationHeaderText}
        onQueryTextChange={setSimulationQueryText}
        onRun={() => void handleRunSimulation()}
        simulationBodyText={simulationBodyText}
        simulationHeaderText={simulationHeaderText}
        simulationMessage={simulationMessage}
        simulationQueryText={simulationQueryText}
        simulationResult={simulationResult}
      />

      <PublishedRuntimePanel
        draftRuntimeSummary={draftRuntimeSummary}
        inspectedRelease={inspectedRelease}
        inspectedReleaseId={inspectedRelease ? String(inspectedRelease.id) : ""}
        isPublishing={isPublishing}
        latestRelease={latestRelease}
        mockUrl={buildMockUrl(projectId, formState.path)}
        mockReleases={mockReleases}
        onInspectedReleaseChange={setInspectedReleaseId}
        onPublish={canWrite && onPublishMockRelease ? () => void handlePublishMock() : undefined}
        publishMessage={publishMessage}
        publishedResponseGroups={publishedResponseGroups}
        publishedRuleItems={publishedRuleItems}
        publishedRuntimeSummary={publishedRuntimeSummary}
        runtimeDiffItems={runtimeDiffItems}
      />

      <EndpointVersionPanel
        compareVersion={compareVersion}
        compareVersionId={compareVersionId}
        diffResult={diffResult}
        endpointStatus={endpoint.status ?? "draft"}
        isRestoring={isRestoring}
        isManagingRelease={isManagingRelease}
        latestSnapshot={latestSnapshot}
        onClearReleasedVersion={canWrite && onClearReleasedVersion ? () => void handleClearReleasedVersion() : undefined}
        onCompareVersionChange={setCompareVersionId}
        onReleaseVersion={canWrite && onReleaseVersion ? (version) => void handleReleaseVersion(version) : undefined}
        onRestoreVersion={canWrite && onRestoreVersion ? (version) => void handleRestoreVersion(version) : undefined}
        onSaveVersion={canWrite && onSaveVersion ? () => void handleSaveVersion() : undefined}
        onVersionFieldChange={(field, value) => setVersionForm((current) => ({ ...current, [field]: value }))}
        releaseError={releaseError}
        releasedVersionId={endpoint.releasedVersionId ?? null}
        releasedVersionLabel={endpoint.releasedVersionLabel ?? null}
        releasedAt={endpoint.releasedAt ?? null}
        releaseMessage={releaseMessage}
        restoreError={restoreError}
        restoreMessage={restoreMessage}
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

  async function handleReleaseVersion(version: VersionDetail) {
    if (!onReleaseVersion) {
      return;
    }

    setIsManagingRelease(true);
    setReleaseError(null);
    setReleaseMessage(null);

    try {
      await onReleaseVersion(version);
      setCompareVersionId(String(version.id));
      setReleaseMessage(`${version.version} is now the live endpoint version.`);
    } catch (error) {
      setReleaseError(error instanceof Error ? error.message : "Failed to release version.");
    } finally {
      setIsManagingRelease(false);
    }
  }

  async function handleClearReleasedVersion() {
    if (!onClearReleasedVersion) {
      return;
    }

    setIsManagingRelease(true);
    setReleaseError(null);
    setReleaseMessage(null);

    try {
      await onClearReleasedVersion();
      setReleaseMessage("Endpoint returned to the draft lane.");
    } catch (error) {
      setReleaseError(error instanceof Error ? error.message : "Failed to return endpoint to draft lane.");
    } finally {
      setIsManagingRelease(false);
    }
  }

  async function handleRestoreVersion(version: VersionDetail) {
    if (!onRestoreVersion) {
      return;
    }

    setIsRestoring(true);
    setRestoreError(null);
    setRestoreMessage(null);

    try {
      const snapshot = parseRestorableSnapshot(version.snapshotJson);
      await onRestoreVersion(version, snapshot);
      setCompareVersionId(String(version.id));
      setRestoreMessage(`Restored snapshot from ${version.version}. Save a new version if you want to record this rollback.`);
    } catch (error) {
      setRestoreError(error instanceof Error ? error.message : "Version snapshot cannot be restored.");
    } finally {
      setIsRestoring(false);
    }
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
        bodyConditions: parseBodyConditions(rule.bodyConditionsText),
        enabled: rule.enabled,
        headerConditions: parseConditions(rule.headerConditionsText),
        mediaType: rule.mediaType,
        priority: rule.priority,
        queryConditions: parseConditions(rule.queryConditionsText),
        ruleName: rule.ruleName,
        statusCode: rule.statusCode
      })),
      bodySample: simulationBodyText,
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
    bodyConditionsText: "",
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
