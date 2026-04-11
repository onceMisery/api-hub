import type { FormEvent } from "react";

import { EditorPanel, Field } from "./endpoint-editor-shared";

type EndpointBasicsPanelProps = {
  endpointId: number;
  formState: {
    name: string;
    method: string;
    path: string;
    description: string;
    mockEnabled?: boolean;
  };
  mockUrl: string;
  isSaving: boolean;
  saveMessage: string | null;
  canSave: boolean;
  canDelete: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDelete: () => void;
  onFieldChange: <K extends keyof EndpointBasicsPanelProps["formState"]>(
    field: K,
    value: EndpointBasicsPanelProps["formState"][K]
  ) => void;
};

export function EndpointBasicsPanel({
  endpointId,
  formState,
  mockUrl,
  isSaving,
  saveMessage,
  canSave,
  canDelete,
  onSubmit,
  onDelete,
  onFieldChange
}: EndpointBasicsPanelProps) {
  return (
    <EditorPanel title="Basics">
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold text-slate-950">Endpoint basics</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Edit the current endpoint and persist the changes to the backend workspace.</p>
          </div>
          <span className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500">#{endpointId}</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Endpoint name">
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              disabled={!canSave}
              onChange={(event) => onFieldChange("name", event.target.value)}
              value={formState.name}
            />
          </Field>
          <Field label="Method">
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              disabled={!canSave}
              onChange={(event) => onFieldChange("method", event.target.value)}
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
            disabled={!canSave}
            onChange={(event) => onFieldChange("path", event.target.value)}
            value={formState.path}
          />
        </Field>

        <Field label="Description">
          <textarea
            className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            disabled={!canSave}
            onChange={(event) => onFieldChange("description", event.target.value)}
            value={formState.description}
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <Field label="Mock URL">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-700">{mockUrl}</div>
          </Field>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
            <input
              aria-label="Enable mock"
              checked={Boolean(formState.mockEnabled)}
              disabled={!canSave}
              onChange={(event) => onFieldChange("mockEnabled", event.target.checked)}
              type="checkbox"
            />
            Enable mock
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isSaving || !canSave}
            type="submit"
          >
            {isSaving ? "Saving..." : "Save endpoint"}
          </button>
          <button
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canDelete}
            onClick={onDelete}
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
  );
}
