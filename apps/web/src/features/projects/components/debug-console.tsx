"use client";

import type {
  DebugExecutionResult,
  DebugHistoryItem,
  DebugTargetRule,
  EndpointDetail,
  EnvironmentDetail,
  ExecuteDebugPayload
} from "@api-hub/api-sdk";
import { useEffect, useMemo, useState } from "react";

import {
  deleteDebugPreset,
  describeDebugPreset,
  generateDebugCurlCommand,
  parseDebugCurlCommand,
  readDebugPresets,
  saveDebugPreset,
  type DebugRequestPreset
} from "./debug-console-utils";

type DebugHistoryFiltersState = {
  environmentId: number | null;
  statusCode: number | null;
  createdFrom: string;
  createdTo: string;
};

type DebugConsoleProps = {
  canClearHistory?: boolean;
  endpoint: EndpointDetail | null;
  environment: EnvironmentDetail | null;
  environmentOptions: EnvironmentDetail[];
  projectDebugAllowedHosts: DebugTargetRule[];
  history: DebugHistoryItem[];
  historyFilters: DebugHistoryFiltersState;
  isLoadingHistory: boolean;
  onChangeHistoryFilters: (filters: DebugHistoryFiltersState) => void;
  onClearHistory: () => Promise<void>;
  onReplayHistory: (historyItem: DebugHistoryItem) => void;
  onRunHistory: (historyItem: DebugHistoryItem) => Promise<DebugExecutionResult>;
  replayDraft: {
    historyId: number;
    queryString: string;
    headersText: string;
    body: string;
  } | null;
  onExecute: (payload: ExecuteDebugPayload) => Promise<DebugExecutionResult>;
};

export function DebugConsole({
  canClearHistory = true,
  endpoint,
  environment,
  environmentOptions,
  projectDebugAllowedHosts,
  history,
  historyFilters,
  isLoadingHistory,
  onChangeHistoryFilters,
  onClearHistory,
  onExecute,
  onReplayHistory,
  onRunHistory,
  replayDraft
}: DebugConsoleProps) {
  const [queryString, setQueryString] = useState("");
  const [headersText, setHeadersText] = useState("");
  const [body, setBody] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [policyError, setPolicyError] = useState<{
    errorCode: string;
    message: string;
    host: string | null;
    matchedPatterns: string[];
  } | null>(null);
  const [result, setResult] = useState<DebugExecutionResult | null>(null);
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<DebugRequestPreset[]>([]);
  const [presetMessage, setPresetMessage] = useState<string | null>(null);
  const [presetError, setPresetError] = useState<string | null>(null);
  const [curlImportText, setCurlImportText] = useState("");
  const [curlMessage, setCurlMessage] = useState<string | null>(null);
  const [curlError, setCurlError] = useState<string | null>(null);
  const [curlWarning, setCurlWarning] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setPolicyError(null);
    setResult(null);
    setHeadersText(formatHeaderEntries(environment?.defaultHeaders ?? []));
    setQueryString("");
    setBody("");
  }, [endpoint?.id, environment?.id]);

  useEffect(() => {
    setPresetName("");
    setPresetMessage(null);
    setPresetError(null);
    setCurlImportText("");
    setCurlMessage(null);
    setCurlError(null);
    setCurlWarning(null);

    if (!environment?.projectId || !endpoint?.id) {
      setPresets([]);
      return;
    }

    setPresets(readDebugPresets(environment.projectId, endpoint.id));
  }, [endpoint?.id, environment?.projectId]);

  useEffect(() => {
    if (!replayDraft) {
      return;
    }

    setQueryString(replayDraft.queryString);
    setHeadersText(replayDraft.headersText);
    setBody(replayDraft.body);
    setResult(null);
    setError(null);
    setPolicyError(null);
  }, [replayDraft]);

  const previewUrl = useMemo(
    () => buildPreviewUrl(environment?.baseUrl, endpoint?.path, environment?.defaultQuery ?? [], queryString),
    [environment?.baseUrl, environment?.defaultQuery, endpoint?.path, queryString]
  );
  const policySummary = useMemo(() => {
    if (!environment) {
      return null;
    }

    return {
      projectRuleCount: projectDebugAllowedHosts.length,
      environmentMode: environment.debugHostMode,
      environmentRuleCount: (environment.debugAllowedHosts ?? []).length,
      effectiveSummary: describeDebugPolicyMode(environment.debugHostMode)
    };
  }, [environment, projectDebugAllowedHosts]);
  const generatedCurl = useMemo(
    () =>
      generateDebugCurlCommand({
        method: endpoint?.method ?? "GET",
        url: previewUrl,
        headersText,
        body
      }),
    [body, endpoint?.method, headersText, previewUrl]
  );
  const canExecute = Boolean(endpoint && environment);

  function handleSavePreset() {
    try {
      const nextPresets = saveDebugPreset(environment?.projectId, endpoint?.id, {
        name: presetName,
        queryString,
        headersText,
        body
      });

      setPresets(nextPresets);
      setPresetName("");
      setPresetError(null);
      setPresetMessage(`Saved preset ${presetName.trim()}.`);
    } catch (presetSaveError) {
      setPresetMessage(null);
      setPresetError(presetSaveError instanceof Error ? presetSaveError.message : "Failed to save preset.");
    }
  }

  function handleApplyPreset(preset: DebugRequestPreset) {
    setQueryString(preset.queryString);
    setHeadersText(preset.headersText);
    setBody(preset.body);
    setResult(null);
    setError(null);
    setPolicyError(null);
    setPresetError(null);
    setPresetMessage(`Applied preset ${preset.name}.`);
  }

  function handleDeletePreset(preset: DebugRequestPreset) {
    const nextPresets = deleteDebugPreset(environment?.projectId, endpoint?.id, preset.id);
    setPresets(nextPresets);
    setPresetError(null);
    setPresetMessage(`Deleted preset ${preset.name}.`);

    if (presetName.trim().toLowerCase() === preset.name.trim().toLowerCase()) {
      setPresetName("");
    }
  }

  async function handleCopyCurl() {
    if (!generatedCurl) {
      setCurlMessage(null);
      setCurlError("No cURL command is available yet.");
      return;
    }

    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setCurlMessage(null);
      setCurlError("Clipboard is unavailable in this browser.");
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedCurl);
      setCurlError(null);
      setCurlMessage("Copied cURL command.");
    } catch {
      setCurlMessage(null);
      setCurlError("Failed to copy cURL command.");
    }
  }

  function handleImportCurl() {
    try {
      const parsedCommand = parseDebugCurlCommand(curlImportText);
      setQueryString(parsedCommand.queryString);
      setHeadersText(parsedCommand.headersText);
      setBody(parsedCommand.body);
      setResult(null);
      setError(null);
      setPolicyError(null);
      setCurlError(null);
      setCurlMessage("Imported cURL into the current draft.");
      setCurlWarning(
        endpoint && parsedCommand.method.toUpperCase() !== endpoint.method.toUpperCase()
          ? `Imported method ${parsedCommand.method.toUpperCase()} differs from endpoint ${endpoint.method}.`
          : null
      );
    } catch (curlImportError) {
      setCurlMessage(null);
      setCurlWarning(null);
      setCurlError(curlImportError instanceof Error ? curlImportError.message : "Failed to import cURL command.");
    }
  }

  return (
    <section className="rounded-[2rem] border border-white/60 bg-white/78 p-6 shadow-[0_24px_64px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Debug</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-950">Live request console</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">Run the selected endpoint against the active environment without leaving the workbench.</p>
      </div>

      {!canExecute ? (
        <div className="rounded-[1.6rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500">
          Select both an endpoint and an environment to enable debugging.
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!endpoint || !environment) {
              return;
            }

            setIsExecuting(true);
            setError(null);
            setPolicyError(null);

            void onExecute({
              body,
              endpointId: endpoint.id,
              environmentId: environment.id,
              headers: parseHeaders(headersText),
              queryString: queryString.trim()
            })
              .then((response) => setResult(response))
              .catch((executionError) => {
                const nextPolicyError = extractPolicyError(executionError);
                if (nextPolicyError) {
                  setPolicyError(nextPolicyError);
                  setError(null);
                  return;
                }

                setError(executionError instanceof Error ? executionError.message : "Failed to execute debug request");
              })
              .finally(() => setIsExecuting(false));
          }}
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Field label="Target environment">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <div className="font-medium text-slate-950">{environment?.name}</div>
                <div className="mt-1 font-mono text-xs text-slate-500">{environment?.baseUrl}</div>
              </div>
            </Field>
            <Field label="Endpoint route">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <div className="font-medium text-slate-950">
                  {endpoint?.method} {endpoint?.name}
                </div>
                <div className="mt-1 font-mono text-xs text-slate-500">{endpoint?.path}</div>
              </div>
            </Field>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="rounded-[1.8rem] border border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.92),_rgba(244,239,228,0.92)_44%,_rgba(226,232,240,0.74)_100%)] p-5 shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Request presets</p>
                  <p className="mt-3 text-base font-semibold text-slate-950">Keep your best debug drafts one click away.</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Saved locally in this browser and scoped to the current endpoint.</p>
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                  <Field label="Preset name">
                    <input
                      aria-label="Preset name"
                      className="w-full rounded-2xl border border-white/80 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                      onChange={(event) => {
                        setPresetName(event.target.value);
                        setPresetError(null);
                        setPresetMessage(null);
                      }}
                      placeholder="Strict user trace"
                      value={presetName}
                    />
                  </Field>
                  <button
                    className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                    onClick={() => handleSavePreset()}
                    type="button"
                  >
                    Save preset
                  </button>
                </div>

                {presetError ? <MessageBanner message={presetError} tone="rose" /> : null}
                {!presetError && presetMessage ? <MessageBanner message={presetMessage} tone="emerald" /> : null}

                {presets.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white/70 px-4 py-5 text-sm text-slate-500">
                    No presets yet. Save a draft you want to reuse across repeated debugging runs.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {presets.map((preset) => (
                      <div className="rounded-[1.5rem] border border-white/75 bg-white/82 px-4 py-4 shadow-[0_14px_35px_rgba(15,23,42,0.05)]" key={preset.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">{preset.name}</p>
                            <p className="mt-2 text-xs leading-5 text-slate-500">{describeDebugPreset(preset)}</p>
                          </div>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
                            Saved
                          </span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            aria-label={`Apply preset ${preset.name}`}
                            className="rounded-2xl bg-slate-950 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-800"
                            onClick={() => handleApplyPreset(preset)}
                            type="button"
                          >
                            Apply
                          </button>
                          <button
                            aria-label={`Delete preset ${preset.name}`}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                            onClick={() => handleDeletePreset(preset)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-slate-900/85 bg-[radial-gradient(circle_at_top_left,_rgba(226,232,240,0.16),_rgba(15,23,42,0.97)_58%)] p-5 text-white shadow-[0_22px_60px_rgba(15,23,42,0.24)]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">cURL bridge</p>
                <p className="mt-3 text-base font-semibold tracking-tight">Move the current draft in and out of terminal flows.</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">Export the exact request you are about to run, or paste a cURL command back into this console.</p>
              </div>

              <div className="mt-5 space-y-4">
                <DarkField label="Generated cURL">
                  <textarea
                    aria-label="Generated cURL"
                    className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 font-mono text-sm text-slate-100 outline-none"
                    readOnly
                    value={generatedCurl}
                  />
                </DarkField>

                <button
                  className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!generatedCurl}
                  onClick={() => void handleCopyCurl()}
                  type="button"
                >
                  Copy cURL
                </button>

                <DarkField label="Import cURL">
                  <textarea
                    aria-label="Import cURL"
                    className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 font-mono text-sm text-slate-100 outline-none transition focus:border-white/25"
                    onChange={(event) => {
                      setCurlImportText(event.target.value);
                      setCurlError(null);
                      setCurlMessage(null);
                    }}
                    placeholder="curl 'https://local.dev/users/{id}?mode=compact' -H 'X-Trace: imported'"
                    value={curlImportText}
                  />
                </DarkField>

                {curlError ? <DarkMessageBanner message={curlError} tone="rose" /> : null}
                {curlWarning ? <DarkMessageBanner message={curlWarning} tone="amber" /> : null}
                {!curlError && curlMessage ? <DarkMessageBanner message={curlMessage} tone="emerald" /> : null}

                <button
                  className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
                  onClick={() => handleImportCurl()}
                  type="button"
                >
                  Import cURL
                </button>
              </div>
            </div>
          </div>

          <Field label="Query string">
            <input
              aria-label="Query string"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-400"
              onChange={(event) => setQueryString(event.target.value)}
              placeholder="verbose=true&include=profile"
              value={queryString}
            />
          </Field>

          <Field label="Headers">
            <textarea
              aria-label="Headers"
              className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-400"
              onChange={(event) => setHeadersText(event.target.value)}
              placeholder={"Authorization: Bearer xxx\nX-Trace: abc"}
              value={headersText}
            />
          </Field>

          <Field label="Body">
            <textarea
              aria-label="Body"
              className="min-h-40 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-400"
              onChange={(event) => setBody(event.target.value)}
              placeholder='{"name":"Alice"}'
              value={body}
            />
          </Field>

          <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Request preview</p>
            <p className="mt-2 font-mono text-sm text-slate-700">{previewUrl ?? "Invalid target"}</p>
          </div>

          {policySummary ? (
            <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Debug target policy</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <PolicyMetric label="Project rules" value={String(policySummary.projectRuleCount)} />
                <PolicyMetric label="Environment mode" value={policySummary.environmentMode} />
                <PolicyMetric label="Environment rules" value={String(policySummary.environmentRuleCount)} />
              </div>
              <p className="mt-3 text-sm text-slate-600">{policySummary.effectiveSummary}</p>
            </div>
          ) : null}

          {policyError ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">Request blocked by debug policy</p>
              <p className="mt-1">{policyError.message}</p>
              {policyError.host ? (
                <p className="mt-2">
                  <span className="font-semibold">Blocked host</span>: {policyError.host}
                </p>
              ) : null}
              {policyError.matchedPatterns.length > 0 ? (
                <div className="mt-2 space-y-1">
                  <p className="font-semibold">Matched rules</p>
                  {policyError.matchedPatterns.map((pattern) => (
                    <p className="font-mono text-xs" key={pattern}>
                      {pattern}
                    </p>
                  ))}
                </div>
              ) : null}
              <p className="mt-2 font-mono text-xs">{policyError.errorCode}</p>
            </div>
          ) : null}

          {!policyError && error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

          <button
            className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={!canExecute || isExecuting}
            type="submit"
          >
            {isExecuting ? "Sending..." : "Send request"}
          </button>
        </form>
      )}

      {result ? (
        <div className="mt-5 space-y-4 rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">{result.statusCode}</span>
            <span className="text-sm text-slate-600">{result.durationMs} ms</span>
            <span className="font-mono text-xs text-slate-500">{result.finalUrl}</span>
          </div>

          <Field label="Response headers">
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              {result.responseHeaders.length === 0 ? (
                <p className="text-slate-500">No response headers.</p>
              ) : (
                result.responseHeaders.map((header, index) => (
                  <div className="font-mono text-xs text-slate-600" key={`${header.name}-${index}`}>
                    {header.name}: {header.value}
                  </div>
                ))
              )}
            </div>
          </Field>

          <Field label="Response body">
            <pre className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950 px-4 py-4 text-xs text-slate-100">
              {result.responseBody || "<empty>"}
            </pre>
          </Field>
        </div>
      ) : null}

      <div className="mt-5 rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Recent history</p>
        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_180px_auto]">
          <select
            aria-label="Debug history environment filter"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            onChange={(event) =>
              onChangeHistoryFilters({
                ...historyFilters,
                environmentId: event.target.value ? Number(event.target.value) : null
              })
            }
            value={historyFilters.environmentId ?? ""}
          >
            <option value="">All environments</option>
            {environmentOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <input
            aria-label="Debug history status filter"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            onChange={(event) =>
              onChangeHistoryFilters({
                ...historyFilters,
                statusCode: event.target.value ? Number(event.target.value) : null
              })
            }
            placeholder="Status code"
            type="number"
            value={historyFilters.statusCode ?? ""}
          />
          <input
            aria-label="Debug history created from filter"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            onChange={(event) =>
              onChangeHistoryFilters({
                ...historyFilters,
                createdFrom: event.target.value
              })
            }
            type="datetime-local"
            value={historyFilters.createdFrom}
          />
          <input
            aria-label="Debug history created to filter"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            onChange={(event) =>
              onChangeHistoryFilters({
                ...historyFilters,
                createdTo: event.target.value
              })
            }
            type="datetime-local"
            value={historyFilters.createdTo}
          />
          <button
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            disabled={!canClearHistory}
            onClick={() => void onClearHistory()}
            type="button"
          >
            Clear debug history
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {isLoadingHistory ? (
            <p className="text-sm text-slate-500">Loading history...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-500">No debug history yet.</p>
          ) : (
            history.map((item) => (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3" key={item.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{item.statusCode}</span>
                    <span className="text-xs text-slate-500">{item.durationMs} ms</span>
                    <span className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <button
                    aria-label={`Replay history ${item.id}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-white"
                    onClick={() => onReplayHistory(item)}
                    type="button"
                  >
                    Replay
                  </button>
                  <button
                    aria-label={`Run history ${item.id}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-white"
                    onClick={() => {
                      setIsExecuting(true);
                      setError(null);
                      setPolicyError(null);

                      void onRunHistory(item)
                        .then((response) => setResult(response))
                        .catch((executionError) => {
                          const nextPolicyError = extractPolicyError(executionError);
                          if (nextPolicyError) {
                            setPolicyError(nextPolicyError);
                            setError(null);
                            return;
                          }

                          setError(executionError instanceof Error ? executionError.message : "Failed to execute debug request");
                        })
                        .finally(() => setIsExecuting(false));
                    }}
                    type="button"
                  >
                    Run again
                  </button>
                </div>
                <p className="mt-2 font-mono text-xs text-slate-600">{item.finalUrl}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function MessageBanner({
  message,
  tone
}: {
  message: string;
  tone: "emerald" | "rose";
}) {
  if (tone === "rose") {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</div>;
  }

  return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>;
}

function DarkMessageBanner({
  message,
  tone
}: {
  message: string;
  tone: "amber" | "emerald" | "rose";
}) {
  if (tone === "amber") {
    return <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{message}</div>;
  }

  if (tone === "rose") {
    return <div className="rounded-2xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{message}</div>;
  }

  return <div className="rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">{message}</div>;
}

function DarkField({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">{label}</span>
      {children}
    </label>
  );
}

function parseHeaders(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.indexOf(":");
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
    .filter((header) => header.name);
}

function buildPreviewUrl(baseUrl?: string, path?: string, defaultQuery?: { name: string; value: string }[], queryString?: string) {
  if (!baseUrl || !path) {
    return null;
  }

  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const mergedQuery = new URLSearchParams();

  for (const entry of defaultQuery ?? []) {
    if (!entry.name?.trim()) {
      continue;
    }
    mergedQuery.set(entry.name.trim(), entry.value ?? "");
  }

  const normalizedQuery = queryString?.trim().replace(/^\?/, "") ?? "";
  for (const pair of normalizedQuery.split("&")) {
    if (!pair.trim()) {
      continue;
    }
    const [name, ...valueParts] = pair.split("=");
    if (!name?.trim()) {
      continue;
    }
    mergedQuery.set(name.trim(), valueParts.join("="));
  }

  const finalQuery = mergedQuery.toString();

  return finalQuery ? `${normalizedBaseUrl}${normalizedPath}?${finalQuery}` : `${normalizedBaseUrl}${normalizedPath}`;
}

function formatHeaderEntries(entries: { name: string; value: string }[]) {
  return entries.map((entry) => `${entry.name}: ${entry.value}`.trimEnd()).join("\n");
}

function extractPolicyError(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const maybeError = error as {
    message?: unknown;
    errorCode?: unknown;
    data?: { errorCode?: unknown; host?: unknown; matchedPatterns?: unknown } | null;
  };
  const errorCode =
    typeof maybeError.errorCode === "string"
      ? maybeError.errorCode
      : typeof maybeError.data?.errorCode === "string"
        ? maybeError.data.errorCode
        : undefined;

  if (!errorCode) {
    return null;
  }

  return {
    errorCode,
    message: typeof maybeError.message === "string" ? maybeError.message : "Request blocked by debug policy",
    host: typeof maybeError.data?.host === "string" ? maybeError.data.host : null,
    matchedPatterns: Array.isArray(maybeError.data?.matchedPatterns)
      ? maybeError.data.matchedPatterns.filter((pattern): pattern is string => typeof pattern === "string")
      : []
  };
}

function describeDebugPolicyMode(mode: EnvironmentDetail["debugHostMode"]) {
  switch (mode) {
    case "append":
      return "Effective policy uses global + project rules, then appends environment rules.";
    case "override":
      return "Effective policy uses global rules plus environment rules, overriding project rules.";
    case "inherit":
    default:
      return "Effective policy uses global + project rules.";
  }
}

function PolicyMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm text-slate-700">{value}</p>
    </div>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}
