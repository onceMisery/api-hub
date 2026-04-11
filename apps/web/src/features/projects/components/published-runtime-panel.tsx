import type { MockReleaseDetail } from "@api-hub/api-sdk";

import { EditorPanel, Field, PreviewMetric } from "./endpoint-editor-shared";

type PublishedRuntimePanelProps = {
  mockUrl: string;
  latestRelease: MockReleaseDetail | null;
  inspectedRelease: MockReleaseDetail | null;
  inspectedReleaseId: string;
  mockReleases: MockReleaseDetail[];
  publishedRuntimeSummary: {
    responseFieldCount: number;
    responseGroupCount: number;
    totalRuleCount: number;
    enabledRuleCount: number;
  };
  draftRuntimeSummary: {
    responseFieldCount: number;
    responseGroupCount: number;
    totalRuleCount: number;
    enabledRuleCount: number;
  };
  runtimeDiffItems: string[];
  publishedResponseGroups: Array<{
    key: string;
    label: string;
    fieldCount: number;
  }>;
  publishedRuleItems: Array<{
    key: string;
    ruleName: string;
    priorityLabel: string;
    conditions: string[];
  }>;
  isPublishing: boolean;
  publishMessage: string | null;
  onInspectedReleaseChange: (releaseId: string) => void;
  onPublish?: () => void;
};

export function PublishedRuntimePanel({
  mockUrl,
  latestRelease,
  inspectedRelease,
  inspectedReleaseId,
  mockReleases,
  publishedRuntimeSummary,
  draftRuntimeSummary,
  runtimeDiffItems,
  publishedResponseGroups,
  publishedRuleItems,
  isPublishing,
  publishMessage,
  onInspectedReleaseChange,
  onPublish
}: PublishedRuntimePanelProps) {
  return (
    <EditorPanel title="Published Runtime">
      <div className="space-y-4">
        <p className="text-sm text-slate-500">Runtime requests to `{mockUrl}` only read the latest published mock release.</p>

        <div className="grid gap-4 md:grid-cols-3">
          <PreviewMetric label="Mock URL" value={mockUrl} mono />
          <PreviewMetric label="Latest Release" value={latestRelease ? `Release #${latestRelease.releaseNo}` : "Not published"} />
          <PreviewMetric label="Created At" value={latestRelease?.createdAt ?? "N/A"} mono />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <PreviewMetric label="Published response fields" value={formatMockResponseSummary(publishedRuntimeSummary)} />
          <PreviewMetric label="Published rules" value={formatMockRuleSummary(publishedRuntimeSummary)} />
          <PreviewMetric label="Draft response fields" value={formatMockResponseSummary(draftRuntimeSummary)} />
          <PreviewMetric label="Draft rules" value={formatMockRuleSummary(draftRuntimeSummary)} />
        </div>

        {mockReleases.length > 0 ? (
          <Field label="Inspect published release">
            <select
              aria-label="Inspect published release"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              onChange={(event) => onInspectedReleaseChange(event.target.value)}
              value={inspectedReleaseId}
            >
              {mockReleases.map((release) => (
                <option key={release.id} value={String(release.id)}>
                  {`Release #${release.releaseNo}`}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
          {latestRelease ? (
            <div className="space-y-3">
              <p>Release #{latestRelease.releaseNo} is the only snapshot served by runtime.</p>
              {inspectedRelease ? <p>{`Inspecting Release #${inspectedRelease.releaseNo}`}</p> : null}
              {inspectedRelease && inspectedRelease.id !== latestRelease.id ? (
                <p>{`Runtime source remains Release #${latestRelease.releaseNo}`}</p>
              ) : null}
              {runtimeDiffItems.length > 0 ? (
                <div className="space-y-2">
                  <p className="font-medium text-slate-900">Draft has unpublished mock changes.</p>
                  {runtimeDiffItems.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              ) : (
                <p>Draft mock rules and responses currently match the published runtime snapshot.</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p>No published release yet.</p>
              <p>Draft simulation can preview changes here, but runtime will not serve them until you publish.</p>
            </div>
          )}
        </div>

        {latestRelease ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Published response groups</p>
              {publishedResponseGroups.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {publishedResponseGroups.map((group) => (
                    <div key={group.key} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">{group.label}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {group.fieldCount} {pluralize(group.fieldCount, "field")}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">No published response groups in this release.</p>
              )}
            </div>

            <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Published rules</p>
              {publishedRuleItems.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {publishedRuleItems.map((rule) => (
                    <div key={rule.key} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900">{rule.ruleName}</p>
                        <span className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500">
                          {rule.priorityLabel}
                        </span>
                      </div>
                      <div className="mt-3 space-y-2 text-sm text-slate-500">
                        {rule.conditions.map((condition) => (
                          <p key={`${rule.key}-${condition}`}>{condition}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">No published rules in this release.</p>
              )}
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={!onPublish || isPublishing}
            onClick={onPublish}
            type="button"
          >
            {isPublishing ? "Publishing..." : "Publish mock"}
          </button>
          {publishMessage ? <p className="text-sm text-emerald-600">{publishMessage}</p> : null}
        </div>
      </div>
    </EditorPanel>
  );
}

function formatMockResponseSummary(summary: PublishedRuntimePanelProps["publishedRuntimeSummary"]) {
  return `${summary.responseFieldCount} ${pluralize(summary.responseFieldCount, "field")} across ${summary.responseGroupCount} status ${pluralize(summary.responseGroupCount, "group")}`;
}

function formatMockRuleSummary(summary: PublishedRuntimePanelProps["publishedRuntimeSummary"]) {
  return `${summary.enabledRuleCount} enabled of ${summary.totalRuleCount} total`;
}

function pluralize(value: number, noun: string) {
  return value === 1 ? noun : `${noun}s`;
}
