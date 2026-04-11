import type { VersionDetail } from "@api-hub/api-sdk";

import { EditorPanel, Field } from "./endpoint-editor-shared";

type EndpointVersionPanelProps = {
  compareVersionId: string;
  versions: VersionDetail[];
  compareVersion: VersionDetail | null;
  diffItems: Array<{ title: string; detail: string }>;
  versionForm: {
    version: string;
    changeSummary: string;
  };
  latestSnapshot: string;
  versionMessage: string | null;
  onCompareVersionChange: (value: string) => void;
  onVersionFieldChange: (field: "version" | "changeSummary", value: string) => void;
  onSaveVersion?: () => void;
};

export function EndpointVersionPanel({
  compareVersionId,
  versions,
  compareVersion,
  diffItems,
  versionForm,
  latestSnapshot,
  versionMessage,
  onCompareVersionChange,
  onVersionFieldChange,
  onSaveVersion
}: EndpointVersionPanelProps) {
  return (
    <EditorPanel title="Versions">
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
          <Field label="Compare against version">
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              onChange={(event) => onCompareVersionChange(event.target.value)}
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
              disabled={!onSaveVersion}
              onChange={(event) => onVersionFieldChange("version", event.target.value)}
              value={versionForm.version}
            />
          </Field>
          <Field label="Version summary">
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              disabled={!onSaveVersion}
              onChange={(event) => onVersionFieldChange("changeSummary", event.target.value)}
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
            onClick={onSaveVersion}
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
  );
}
