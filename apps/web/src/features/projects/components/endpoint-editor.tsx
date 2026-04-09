import type { EndpointDetail, UpdateEndpointPayload, VersionDetail } from "@api-hub/api-sdk";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

type EndpointEditorProps = {
  endpoint: EndpointDetail | null;
  isLoading?: boolean;
  onSave?: (payload: UpdateEndpointPayload) => Promise<void>;
  versions: VersionDetail[];
};

export function EndpointEditor({ endpoint, isLoading = false, onSave, versions }: EndpointEditorProps) {
  const [formState, setFormState] = useState<UpdateEndpointPayload>({
    description: "",
    method: "GET",
    name: "",
    path: ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!endpoint) {
      return;
    }

    setFormState({
      description: endpoint.description ?? "",
      method: endpoint.method,
      name: endpoint.name,
      path: endpoint.path
    });
    setSaveMessage(null);
  }, [endpoint]);

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

          <div className="flex items-center gap-3">
            <button
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={isSaving || !onSave}
              type="submit"
            >
              {isSaving ? "Saving..." : "Save endpoint"}
            </button>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {formState.method}
            </span>
            {saveMessage ? <p className="text-sm text-emerald-600">{saveMessage}</p> : null}
          </div>
        </form>
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

  function updateField<K extends keyof UpdateEndpointPayload>(field: K, value: UpdateEndpointPayload[K]) {
    setFormState((current) => ({
      ...current,
      [field]: value
    }));
  }
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
