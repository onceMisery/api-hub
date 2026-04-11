import type { VersionDetail } from "@api-hub/api-sdk";

import { EditorPanel, Field } from "./endpoint-editor-shared";

type EndpointVersionPanelProps = {
  compareVersionId: string;
  versions: VersionDetail[];
  compareVersion: VersionDetail | null;
  diffItems: Array<{ title: string; detail: string }>;
  isRestoring: boolean;
  versionForm: {
    version: string;
    changeSummary: string;
  };
  latestSnapshot: string;
  restoreError: string | null;
  restoreMessage: string | null;
  versionMessage: string | null;
  onCompareVersionChange: (value: string) => void;
  onRestoreVersion?: (version: VersionDetail) => void;
  onVersionFieldChange: (field: "version" | "changeSummary", value: string) => void;
  onSaveVersion?: () => void;
};

export function EndpointVersionPanel({
  compareVersionId,
  versions,
  compareVersion,
  diffItems,
  isRestoring,
  versionForm,
  latestSnapshot,
  restoreError,
  restoreMessage,
  versionMessage,
  onCompareVersionChange,
  onRestoreVersion,
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Version Diff</p>
                {compareVersion ? (
                  <p className="mt-2 text-sm text-slate-500">Inspect drift against {compareVersion.version} before rolling back.</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {compareVersion ? (
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">{compareVersion.version}</span>
                ) : null}
                {compareVersion && onRestoreVersion ? (
                  <button
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isRestoring}
                    onClick={() => onRestoreVersion(compareVersion)}
                    type="button"
                  >
                    {isRestoring ? "Restoring..." : "Restore selected snapshot"}
                  </button>
                ) : null}
              </div>
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

            {restoreMessage ? <p className="mt-4 text-sm text-emerald-600">{restoreMessage}</p> : null}
            {restoreError ? <p className="mt-4 text-sm text-rose-600">{restoreError}</p> : null}
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
              <div
                key={version.id}
                className={`rounded-[1.7rem] border px-4 py-4 transition ${
                  compareVersionId === String(version.id)
                    ? "border-slate-900 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.10)]"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{version.version}</p>
                    <p className="mt-1 text-sm text-slate-500">{version.changeSummary || "No change summary."}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500">v#{version.id}</span>
                    <button
                      aria-label={`Compare snapshot ${version.version}`}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                      onClick={() => onCompareVersionChange(String(version.id))}
                      type="button"
                    >
                      Compare snapshot
                    </button>
                    {onRestoreVersion ? (
                      <button
                        aria-label={`Restore snapshot ${version.version}`}
                        className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isRestoring}
                        onClick={() => onRestoreVersion(version)}
                        type="button"
                      >
                        {isRestoring && compareVersionId === String(version.id) ? "Restoring..." : "Restore snapshot"}
                      </button>
                    ) : null}
                  </div>
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
