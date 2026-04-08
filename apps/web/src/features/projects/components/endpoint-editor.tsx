import type { EndpointDetail, VersionDetail } from "@api-hub/api-sdk";
import type { ReactNode } from "react";

type EndpointEditorProps = {
  endpoint: EndpointDetail | null;
  isLoading?: boolean;
  versions: VersionDetail[];
};

export function EndpointEditor({ endpoint, isLoading = false, versions }: EndpointEditorProps) {
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
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <h3 className="text-2xl font-semibold text-slate-950">{endpoint.name}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {endpoint.description || "No description yet. Use the backend endpoint payload to enrich this section later."}
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
              {endpoint.method}
            </span>
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500">#{endpoint.id}</span>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-700">
          {endpoint.path}
        </div>
      </EditorPanel>

      <EditorPanel title="Request Parameters">
        <p className="text-sm text-slate-500">Phase 1 keeps request editing minimal. Schema-level editors come after repository-backed persistence.</p>
      </EditorPanel>

      <EditorPanel title="Response Structure">
        <p className="text-sm text-slate-500">Response schema cards will be hydrated from backend detail payloads in the next iteration.</p>
      </EditorPanel>

      <EditorPanel title="Versions">
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
      </EditorPanel>
    </section>
  );
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
