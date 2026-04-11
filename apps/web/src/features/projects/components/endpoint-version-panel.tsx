import type { VersionDetail } from "@api-hub/api-sdk";
import { useEffect, useMemo, useState } from "react";

import {
  type VersionDiffItem,
  type VersionDiffKind,
  type VersionDiffResult,
  type VersionDiffSection,
  type VersionDiffSectionId
} from "./endpoint-editor-utils";
import { EditorPanel, Field } from "./endpoint-editor-shared";

type VersionDiffSectionFilter = "all" | VersionDiffSectionId;

type EndpointVersionPanelProps = {
  compareVersionId: string;
  versions: VersionDetail[];
  compareVersion: VersionDetail | null;
  diffResult: VersionDiffResult | null;
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
  diffResult,
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
  const [activeSectionFilter, setActiveSectionFilter] = useState<VersionDiffSectionFilter>("all");

  useEffect(() => {
    setActiveSectionFilter("all");
  }, [compareVersionId]);

  const filterItems = useMemo(() => {
    if (!diffResult) {
      return [];
    }

    return [
      { count: diffResult.summary.totalChanges, id: "all" as const, label: "All" },
      { count: diffResult.summary.endpointChanges, id: "endpoint" as const, label: "Endpoint" },
      { count: diffResult.summary.parameterChanges, id: "parameters" as const, label: "Parameters" },
      { count: diffResult.summary.responseChanges, id: "responses" as const, label: "Responses" }
    ];
  }, [diffResult]);

  const visibleSections = useMemo(() => {
    if (!diffResult) {
      return [];
    }

    if (activeSectionFilter === "all") {
      return diffResult.sections;
    }

    return diffResult.sections.filter((section) => section.id === activeSectionFilter);
  }, [activeSectionFilter, diffResult]);

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

          <div className="overflow-hidden rounded-[1.9rem] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.16),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),_transparent_30%),linear-gradient(145deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.92))] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Version Diff</p>
                {compareVersion ? (
                  <>
                    <h3 className="mt-3 text-xl font-semibold text-slate-950">
                      {diffResult ? `${diffResult.summary.totalChanges} total changes` : "Ready to compare snapshots"}
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                      Inspect drift against {compareVersion.version}, review the contract surface, then decide whether to
                      restore or keep the draft moving forward.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="mt-3 text-xl font-semibold text-slate-950">Snapshot command center</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                      Pick a historical snapshot to inspect contract drift, compare operational shape, and restore with
                      confidence.
                    </p>
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {compareVersion ? (
                  <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                    {compareVersion.version}
                  </span>
                ) : null}
                {compareVersion && onRestoreVersion ? (
                  <button
                    className="rounded-full border border-amber-300/80 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-sm transition hover:border-amber-400 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isRestoring}
                    onClick={() => onRestoreVersion(compareVersion)}
                    type="button"
                  >
                    {isRestoring ? "Restoring..." : "Restore selected snapshot"}
                  </button>
                ) : null}
              </div>
            </div>

            {compareVersion && diffResult ? (
              <div className="mt-5 space-y-5">
                <div className="grid gap-3 xl:grid-cols-4 sm:grid-cols-2">
                  <SummaryCard
                    accent="from-slate-950 via-slate-800 to-slate-700"
                    detail={buildMixLabel(diffResult.summary.addedChanges, diffResult.summary.removedChanges, diffResult.summary.changedChanges)}
                    label="Total changes"
                    value={`${diffResult.summary.totalChanges} total changes`}
                  />
                  <SummaryCard
                    accent="from-sky-500 via-cyan-500 to-teal-500"
                    detail={buildChangeCountLabel(diffResult.summary.endpointChanges)}
                    label="Endpoint basics"
                    value={`${diffResult.summary.endpointChanges} updates`}
                  />
                  <SummaryCard
                    accent="from-amber-500 via-orange-500 to-rose-500"
                    detail={buildChangeCountLabel(diffResult.summary.parameterChanges)}
                    label="Request parameters"
                    value={`${diffResult.summary.parameterChanges} updates`}
                  />
                  <SummaryCard
                    accent="from-emerald-500 via-teal-500 to-cyan-500"
                    detail={buildChangeCountLabel(diffResult.summary.responseChanges)}
                    label="Responses"
                    value={`${diffResult.summary.responseChanges} updates`}
                  />
                </div>

                <div className="overflow-hidden rounded-[1.7rem] border border-slate-900/80 bg-slate-950 p-5 text-white shadow-[0_20px_55px_rgba(15,23,42,0.24)]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Selected snapshot vs current draft
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        Fast checksum for the contract shape before restore or version save.
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
                      {compareVersion.version}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 xl:grid-cols-5 md:grid-cols-2">
                    {diffResult.snapshotOverview.map((row) => (
                      <div
                        key={row.label}
                        className="rounded-[1.35rem] border border-white/10 bg-white/[0.05] p-4 backdrop-blur-sm"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{row.label}</p>
                        <div className="mt-3 space-y-3">
                          <OverviewValue label="Selected" value={row.previousValue} />
                          <OverviewValue label="Current" value={row.currentValue} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.7rem] border border-slate-200/80 bg-white/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Contract focus</p>
                      <p className="mt-2 text-sm text-slate-600">Filter change sections to isolate one part of the endpoint contract.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {filterItems.map((filter) => {
                        const isActive = activeSectionFilter === filter.id;

                        return (
                          <button
                            key={filter.id}
                            aria-pressed={isActive}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                              isActive
                                ? "border-slate-950 bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]"
                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                            }`}
                            onClick={() => setActiveSectionFilter(filter.id)}
                            type="button"
                          >
                            {filter.label}
                            <span className={`ml-2 rounded-full px-2 py-0.5 ${isActive ? "bg-white/15" : "bg-slate-100 text-slate-500"}`}>
                              {filter.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {diffResult.summary.totalChanges === 0 ? (
                    <p className="mt-4 rounded-[1.3rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      No visible changes between the selected version and the current draft.
                    </p>
                  ) : visibleSections.length > 0 ? (
                    <div className="mt-4 space-y-4">
                      {visibleSections.map((section) => (
                        <DiffSectionCard key={section.id} section={section} />
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 rounded-[1.3rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      No changes in the selected contract area.
                    </p>
                  )}
                </div>
              </div>
            ) : compareVersion ? (
              <p className="mt-4 text-sm text-slate-500">No visible changes between the selected version and the current draft.</p>
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

function SummaryCard({
  label,
  value,
  detail,
  accent
}: {
  label: string;
  value: string;
  detail: string;
  accent: string;
}) {
  return (
    <div className="overflow-hidden rounded-[1.45rem] border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
      <div className={`h-1.5 rounded-full bg-gradient-to-r ${accent}`} />
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-3 text-lg font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function OverviewValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-50">{value}</p>
    </div>
  );
}

function DiffSectionCard({ section }: { section: VersionDiffSection }) {
  return (
    <div className="rounded-[1.55rem] border border-slate-200/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(248,250,252,0.9))] p-4 shadow-[0_18px_42px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-slate-950">{section.label}</p>
          <p className="mt-2 text-sm text-slate-500">{buildSectionDetail(section)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {section.addedChanges > 0 ? <CountPill label={`${section.addedChanges} added`} tone="added" /> : null}
          {section.removedChanges > 0 ? <CountPill label={`${section.removedChanges} removed`} tone="removed" /> : null}
          {section.changedChanges > 0 ? <CountPill label={`${section.changedChanges} changed`} tone="changed" /> : null}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {section.items.map((item) => (
          <DiffItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function DiffItemCard({ item }: { item: VersionDiffItem }) {
  const toneClasses =
    item.kind === "added"
      ? "border-emerald-200 bg-emerald-50/70"
      : item.kind === "removed"
        ? "border-rose-200 bg-rose-50/70"
        : "border-sky-200 bg-sky-50/70";

  return (
    <div className={`rounded-[1.3rem] border px-4 py-3 ${toneClasses}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
        <CountPill label={formatDiffKind(item.kind)} tone={item.kind} />
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
    </div>
  );
}

function CountPill({
  label,
  tone
}: {
  label: string;
  tone: VersionDiffKind | "changed";
}) {
  const toneClasses =
    tone === "added"
      ? "border-emerald-200 bg-emerald-100 text-emerald-700"
      : tone === "removed"
        ? "border-rose-200 bg-rose-100 text-rose-700"
        : "border-sky-200 bg-sky-100 text-sky-700";

  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${toneClasses}`}>{label}</span>;
}

function buildSectionDetail(section: VersionDiffSection) {
  if (section.totalChanges === 1) {
    return "1 change detected in this contract area.";
  }

  return `${section.totalChanges} changes detected in this contract area.`;
}

function buildChangeCountLabel(count: number) {
  if (count === 0) {
    return "No visible drift";
  }

  if (count === 1) {
    return "1 change detected";
  }

  return `${count} changes detected`;
}

function buildMixLabel(added: number, removed: number, changed: number) {
  return `${changed} changed • ${added} added • ${removed} removed`;
}

function formatDiffKind(kind: VersionDiffKind) {
  if (kind === "added") {
    return "Added";
  }

  if (kind === "removed") {
    return "Removed";
  }

  return "Changed";
}
