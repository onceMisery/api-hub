import type { MockSimulationResult } from "@api-hub/api-sdk";

import { EditorPanel, Field, PreviewMetric } from "./endpoint-editor-shared";
import { MockRuleMatchboard } from "./mock-rule-matchboard";

type EndpointMockSimulatorPanelProps = {
  simulationQueryText: string;
  simulationHeaderText: string;
  simulationBodyText: string;
  simulationResult: MockSimulationResult | null;
  simulationMessage: string | null;
  isSimulating: boolean;
  canRun: boolean;
  onQueryTextChange: (value: string) => void;
  onHeaderTextChange: (value: string) => void;
  onBodyTextChange: (value: string) => void;
  onRun: () => void;
};

export function EndpointMockSimulatorPanel({
  simulationQueryText,
  simulationHeaderText,
  simulationBodyText,
  simulationResult,
  simulationMessage,
  isSimulating,
  canRun,
  onQueryTextChange,
  onHeaderTextChange,
  onBodyTextChange,
  onRun
}: EndpointMockSimulatorPanelProps) {
  return (
    <EditorPanel title="Mock Simulator">
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Send query, header, and request body samples to the backend resolver. This simulates exact `query/header` matches plus body JSONPath checks against the current draft.
        </p>

        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Simulator query samples">
            <textarea
              aria-label="Simulator query samples"
              className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-400"
              onChange={(event) => onQueryTextChange(event.target.value)}
              placeholder="mode=strict"
              value={simulationQueryText}
            />
          </Field>
          <Field label="Simulator header samples">
            <textarea
              aria-label="Simulator header samples"
              className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-400"
              onChange={(event) => onHeaderTextChange(event.target.value)}
              placeholder="x-scenario=unauthorized"
              value={simulationHeaderText}
            />
          </Field>
        </div>

        <Field label="Simulator request body">
          <textarea
            aria-label="Simulator request body"
            className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-400"
            onChange={(event) => onBodyTextChange(event.target.value)}
            placeholder='{"user":{"id":31}}'
            value={simulationBodyText}
          />
        </Field>

        <div className="flex items-center gap-3">
          <button
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={!canRun || isSimulating}
            onClick={onRun}
            type="button"
          >
            {isSimulating ? "Running..." : "Run mock simulation"}
          </button>
          {simulationMessage ? <p className="text-sm text-emerald-600">{simulationMessage}</p> : null}
        </div>

        {simulationResult ? (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <PreviewMetric label="Source" value={simulationResult.source} />
              <PreviewMetric label="Status" value={String(simulationResult.statusCode)} />
              <PreviewMetric label="Content-Type" value={simulationResult.mediaType} />
            </div>

            <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Simulation details</p>
                {simulationResult.matchedRuleName ? (
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
                    {simulationResult.matchedRuleName}
                  </span>
                ) : null}
                {simulationResult.matchedRulePriority !== null ? (
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
                    Priority {simulationResult.matchedRulePriority}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                {simulationResult.explanations.map((line, index) => (
                  <p key={`${line}-${index}`}>{line}</p>
                ))}
              </div>
            </div>

            <MockRuleMatchboard ruleTraces={simulationResult.ruleTraces} />

            <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Simulation Body</p>
              <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-200">{simulationResult.body}</pre>
            </div>
          </>
        ) : null}
      </div>
    </EditorPanel>
  );
}
