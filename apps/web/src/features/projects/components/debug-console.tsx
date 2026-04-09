"use client";

import type { DebugExecutionResult, DebugHistoryItem, EndpointDetail, EnvironmentDetail, ExecuteDebugPayload } from "@api-hub/api-sdk";
import { useEffect, useMemo, useState } from "react";

type DebugConsoleProps = {
  endpoint: EndpointDetail | null;
  environment: EnvironmentDetail | null;
  history: DebugHistoryItem[];
  isLoadingHistory: boolean;
  onExecute: (payload: ExecuteDebugPayload) => Promise<DebugExecutionResult>;
};

export function DebugConsole({ endpoint, environment, history, isLoadingHistory, onExecute }: DebugConsoleProps) {
  const [queryString, setQueryString] = useState("");
  const [headersText, setHeadersText] = useState("");
  const [body, setBody] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DebugExecutionResult | null>(null);

  useEffect(() => {
    setError(null);
    setResult(null);
    setHeadersText(formatHeaderEntries(environment?.defaultHeaders ?? []));
  }, [endpoint?.id, environment?.id]);

  const previewUrl = useMemo(() => buildPreviewUrl(environment?.baseUrl, endpoint?.path, queryString), [environment?.baseUrl, endpoint?.path, queryString]);
  const canExecute = Boolean(endpoint && environment);

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

            void onExecute({
              body,
              endpointId: endpoint.id,
              environmentId: environment.id,
              headers: parseHeaders(headersText),
              queryString: queryString.trim()
            })
              .then((response) => setResult(response))
              .catch((executionError) => setError(executionError instanceof Error ? executionError.message : "Failed to execute debug request"))
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

          {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

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
        <div className="mt-3 space-y-3">
          {isLoadingHistory ? (
            <p className="text-sm text-slate-500">Loading history...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-500">No debug history yet.</p>
          ) : (
            history.map((item) => (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3" key={item.id}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{item.statusCode}</span>
                  <span className="text-xs text-slate-500">{item.durationMs} ms</span>
                  <span className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</span>
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

function buildPreviewUrl(baseUrl?: string, path?: string, queryString?: string) {
  if (!baseUrl || !path) {
    return null;
  }

  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const normalizedQuery = queryString?.trim().replace(/^\?/, "") ?? "";

  return normalizedQuery ? `${normalizedBaseUrl}${normalizedPath}?${normalizedQuery}` : `${normalizedBaseUrl}${normalizedPath}`;
}

function formatHeaderEntries(entries: { name: string; value: string }[]) {
  return entries.map((entry) => `${entry.name}: ${entry.value}`.trimEnd()).join("\n");
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}
