import type {
  EndpointDetail,
  ParameterDetail,
  ParameterUpsertItem,
  ResponseDetail,
  ResponseUpsertItem,
  UpdateEndpointPayload,
  VersionDetail
} from "@api-hub/api-sdk";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

type EndpointEditorProps = {
  endpoint: EndpointDetail | null;
  projectId: number;
  isLoading?: boolean;
  onDelete?: () => Promise<void>;
  onSave?: (payload: UpdateEndpointPayload) => Promise<void>;
  onSaveParameters?: (payload: ParameterUpsertItem[]) => Promise<void>;
  onSaveResponses?: (payload: ResponseUpsertItem[]) => Promise<void>;
  onSaveVersion?: (payload: { version: string; changeSummary: string }) => Promise<void>;
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

const EMPTY_PARAMETERS: ParameterDetail[] = [];
const EMPTY_RESPONSES: ResponseDetail[] = [];
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

export function EndpointEditor(props: EndpointEditorProps) {
  const {
    endpoint,
    projectId,
    isLoading = false,
    onDelete,
    onSave,
    onSaveParameters,
    onSaveResponses,
    onSaveVersion,
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
  const [versionForm, setVersionForm] = useState({ changeSummary: "", version: "" });
  const [compareVersionId, setCompareVersionId] = useState("");
  const [previewSelection, setPreviewSelection] = useState("");
  const [previewSource, setPreviewSource] = useState<PreviewSource>("draft");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [parameterMessage, setParameterMessage] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
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
    setPreviewSelection("");
    setPreviewSource("draft");
    setSaveMessage(null);
    setParameterMessage(null);
    setResponseMessage(null);
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
  const latestSavedSnapshot = useMemo(
    () => (versions.length > 0 ? normalizeSnapshot(versions[versions.length - 1].snapshotJson) : emptySnapshot()),
    [versions]
  );
  const diffItems = useMemo(() => {
    if (!compareVersion) {
      return [];
    }

    return buildSnapshotDiff(normalizeSnapshot(compareVersion.snapshotJson), currentSnapshot);
  }, [compareVersion, currentSnapshot]);
  const activePreviewRows = useMemo(
    () => (previewSource === "latest-version" ? latestSavedSnapshot.responses : responseRows),
    [latestSavedSnapshot.responses, previewSource, responseRows]
  );
  const previewOptions = useMemo(() => buildPreviewOptions(activePreviewRows), [activePreviewRows]);
  const selectedPreviewKey = previewSelection || previewOptions[0]?.key || "";
  const mockPreview = useMemo(
    () => buildMockPreview(activePreviewRows, selectedPreviewKey),
    [activePreviewRows, selectedPreviewKey]
  );

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
      <EditorPanel title="Basics">
        <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-semibold text-slate-950">Endpoint basics</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Edit the current endpoint and persist the changes to the backend workspace.
              </p>
            </div>
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500">#{endpoint.id}</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Endpoint name">
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                onChange={(event) => updateField("name", event.target.value)}
                value={formState.name}
              />
            </Field>
            <Field label="Method">
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                onChange={(event) => updateField("method", event.target.value)}
                value={formState.method}
              >
                {["GET", "POST", "PUT", "PATCH", "DELETE"].map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Path">
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-700 outline-none transition focus:border-slate-400"
              onChange={(event) => updateField("path", event.target.value)}
              value={formState.path}
            />
          </Field>

          <Field label="Description">
            <textarea
              className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              onChange={(event) => updateField("description", event.target.value)}
              value={formState.description}
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <Field label="Mock URL">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-700">
                {buildMockUrl(projectId, formState.path)}
              </div>
            </Field>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
              <input
                aria-label="Enable mock"
                checked={formState.mockEnabled}
                onChange={(event) => updateField("mockEnabled", event.target.checked)}
                type="checkbox"
              />
              Enable mock
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={isSaving || !onSave}
              type="submit"
            >
              {isSaving ? "Saving..." : "Save endpoint"}
            </button>
            <button
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!onDelete}
              onClick={() => void onDelete?.()}
              type="button"
            >
              Delete endpoint
            </button>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {formState.method}
            </span>
            {saveMessage ? <p className="text-sm text-emerald-600">{saveMessage}</p> : null}
          </div>
        </form>
      </EditorPanel>

      <EditorPanel title="Request Parameters">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Flat rows for query, path, header, or body fields.</p>
            <button
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
              onClick={() => setParameterRows((current) => [...current, createParameterDraft()])}
              type="button"
            >
              Add parameter row
            </button>
          </div>

          <div className="space-y-3">
            {parameterRows.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-sm text-slate-500">
                No request parameters yet.
              </p>
            ) : (
              parameterRows.map((parameter, index) => (
                <div key={`parameter-${index}`} className="grid gap-3 rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label={`Parameter ${index + 1} name`}>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                      onChange={(event) => updateParameterRow(index, "name", event.target.value)}
                      value={parameter.name}
                    />
                  </Field>
                  <Field label={`Parameter ${index + 1} type`}>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                      onChange={(event) => updateParameterRow(index, "dataType", event.target.value)}
                      value={parameter.dataType}
                    />
                  </Field>
                  <Field label={`Parameter ${index + 1} section`}>
                    <select
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                      onChange={(event) => updateParameterRow(index, "sectionType", event.target.value)}
                      value={parameter.sectionType}
                    >
                      {["query", "path", "header", "body"].map((sectionType) => (
                        <option key={sectionType} value={sectionType}>
                          {sectionType}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={`Parameter ${index + 1} example`}>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                      onChange={(event) => updateParameterRow(index, "exampleValue", event.target.value)}
                      value={parameter.exampleValue}
                    />
                  </Field>
                  <Field label={`Parameter ${index + 1} description`}>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                      onChange={(event) => updateParameterRow(index, "description", event.target.value)}
                      value={parameter.description}
                    />
                  </Field>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <input
                      checked={parameter.required}
                      onChange={(event) => updateParameterRow(index, "required", event.target.checked)}
                      type="checkbox"
                    />
                    Required
                  </label>
                  <div className="flex items-end">
                    <button
                      className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                      onClick={() => setParameterRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}
                      type="button"
                    >
                      Remove parameter row {index + 1}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={!onSaveParameters}
              onClick={() => void handleSaveParameters()}
              type="button"
            >
              Save parameters
            </button>
            {parameterMessage ? <p className="text-sm text-emerald-600">{parameterMessage}</p> : null}
          </div>
        </div>
      </EditorPanel>

      <EditorPanel title="Response Structure">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Flat response fields with status code and media type.</p>
            <button
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
              onClick={() => setResponseRows((current) => [...current, createResponseDraft()])}
              type="button"
            >
              Add response row
            </button>
          </div>

          <div className="space-y-3">
            {responseRows.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-sm text-slate-500">
                No response fields yet.
              </p>
            ) : (
              responseRows.map((response, index) => (
                <div key={`response-${index}`} className="grid gap-3 rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label={`Response ${index + 1} name`}>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                      onChange={(event) => updateResponseRow(index, "name", event.target.value)}
                      value={response.name}
                    />
                  </Field>
                  <Field label={`Response ${index + 1} type`}>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                      onChange={(event) => updateResponseRow(index, "dataType", event.target.value)}
                      value={response.dataType}
                    />
                  </Field>
                  <Field label={`Response ${index + 1} status`}>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                      onChange={(event) => updateResponseRow(index, "httpStatusCode", Number(event.target.value) || 200)}
                      value={response.httpStatusCode}
                    />
                  </Field>
                  <Field label={`Response ${index + 1} media type`}>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                      onChange={(event) => updateResponseRow(index, "mediaType", event.target.value)}
                      value={response.mediaType}
                    />
                  </Field>
                  <Field label={`Response ${index + 1} description`}>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                      onChange={(event) => updateResponseRow(index, "description", event.target.value)}
                      value={response.description}
                    />
                  </Field>
                  <Field label={`Response ${index + 1} example`}>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                      onChange={(event) => updateResponseRow(index, "exampleValue", event.target.value)}
                      value={response.exampleValue}
                    />
                  </Field>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <input
                      checked={response.required}
                      onChange={(event) => updateResponseRow(index, "required", event.target.checked)}
                      type="checkbox"
                    />
                    Required
                  </label>
                  <div className="flex items-end">
                    <button
                      className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                      onClick={() => setResponseRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}
                      type="button"
                    >
                      Remove response row {index + 1}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={!onSaveResponses}
              onClick={() => void handleSaveResponses()}
              type="button"
            >
              Save responses
            </button>
            {responseMessage ? <p className="text-sm text-emerald-600">{responseMessage}</p> : null}
          </div>
        </div>
      </EditorPanel>

      <EditorPanel title="Mock Preview">
        <div className="space-y-4">
          {versions.length > 0 ? (
            <Field label="Preview source">
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                onChange={(event) => {
                  setPreviewSource(event.target.value as PreviewSource);
                  setPreviewSelection("");
                }}
                value={previewSource}
              >
                <option value="draft">Current draft</option>
                <option value="latest-version">Latest saved version</option>
              </select>
            </Field>
          ) : null}

          {previewOptions.length > 1 ? (
            <Field label="Preview status">
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                onChange={(event) => setPreviewSelection(event.target.value)}
                value={selectedPreviewKey}
              >
                {previewOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            <PreviewMetric label="Mock URL" value={buildMockUrl(projectId, formState.path)} mono />
            <PreviewMetric label="Status" value={String(mockPreview.statusCode)} />
            <PreviewMetric label="Content-Type" value={mockPreview.mediaType} />
          </div>

          <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Preview Body</p>
            <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-200">{mockPreview.body}</pre>
          </div>
        </div>
      </EditorPanel>

      <EditorPanel title="Versions">
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
            <Field label="Compare against version">
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                onChange={(event) => setCompareVersionId(event.target.value)}
                value={compareVersionId}
              >
                <option value="">Current draft only</option>
                {versions.map((version) => (
                  <option key={version.id} value={String(version.id)}>
                    {version.version}
                  </option>
                ))}
              </select>
            </Field>

            <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Version Diff</p>
                {compareVersion ? (
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">{compareVersion.version}</span>
                ) : null}
              </div>

              {compareVersion ? (
                diffItems.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {diffItems.map((item, index) => (
                      <div key={`${item.title}-${index}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">No visible changes between the selected version and the current draft.</p>
                )
              ) : (
                <p className="mt-4 text-sm text-slate-500">Choose a historical snapshot to compare against the current draft.</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Version label">
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                onChange={(event) => setVersionForm((current) => ({ ...current, version: event.target.value }))}
                value={versionForm.version}
              />
            </Field>
            <Field label="Version summary">
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                onChange={(event) => setVersionForm((current) => ({ ...current, changeSummary: event.target.value }))}
                value={versionForm.changeSummary}
              />
            </Field>
          </div>

          <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Generated Snapshot</p>
            <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-200">{latestSnapshot}</pre>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={!onSaveVersion}
              onClick={() => void handleSaveVersion()}
              type="button"
            >
              Save version snapshot
            </button>
            {versionMessage ? <p className="text-sm text-emerald-600">{versionMessage}</p> : null}
          </div>

          {versions.length === 0 ? (
            <p className="text-sm text-slate-500">No version snapshots yet.</p>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => (
                <div key={version.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{version.version}</p>
                      <p className="mt-1 text-sm text-slate-500">{version.changeSummary || "No change summary."}</p>
                    </div>
                    <span className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500">v#{version.id}</span>
                  </div>
                  <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-200">
                    {version.snapshotJson || "{}"}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </EditorPanel>
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

  if (previous.endpoint.path !== current.endpoint.path) {
    items.push({
      title: "Changed endpoint path",
      detail: `${previous.endpoint.path || "(empty)"} -> ${current.endpoint.path || "(empty)"}`
    });
  }

  if (previous.endpoint.method !== current.endpoint.method) {
    items.push({
      title: "Changed endpoint method",
      detail: `${previous.endpoint.method || "(empty)"} -> ${current.endpoint.method || "(empty)"}`
    });
  }

  if (previous.endpoint.description !== current.endpoint.description) {
    items.push({
      title: "Changed endpoint description",
      detail: `${previous.endpoint.description || "(empty)"} -> ${current.endpoint.description || "(empty)"}`
    });
  }

  const previousParameters = new Set(previous.parameters.map((parameter) => `${parameter.sectionType}.${parameter.name}`));
  for (const parameter of current.parameters) {
    const parameterKey = `${parameter.sectionType}.${parameter.name}`;
    if (!previousParameters.has(parameterKey)) {
      items.push({
        title: "Added request parameter",
        detail: parameterKey
      });
    }
  }

  const previousResponses = new Set(previous.responses.map((response) => `${response.httpStatusCode} ${response.mediaType} ${response.name}`.trim()));
  for (const response of current.responses) {
    const responseKey = `${response.httpStatusCode} ${response.mediaType} ${response.name}`.trim();
    if (!previousResponses.has(responseKey)) {
      items.push({
        title: "Added response field",
        detail: responseKey
      });
    }
  }

  return items;
}

function EditorPanel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="rounded-[2rem] border border-white/60 bg-white/78 p-6 shadow-[0_24px_64px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{title}</p>
      </div>
      {children}
    </div>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function PreviewMetric({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className={`mt-3 text-sm text-slate-700 ${mono ? "break-all font-mono" : ""}`}>{value}</p>
    </div>
  );
}
