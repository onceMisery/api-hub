import { EditorPanel, Field } from "./endpoint-editor-shared";

type MockRuleRow = {
  ruleName: string;
  priority: number;
  enabled: boolean;
  queryConditionsText: string;
  headerConditionsText: string;
  bodyConditionsText: string;
  statusCode: number;
  mediaType: string;
  body: string;
};

type EndpointMockRulesPanelProps = {
  mockRuleRows: MockRuleRow[];
  mockRuleMessage: string | null;
  canSave: boolean;
  onAddRule: () => void;
  onUpdateRule: <K extends keyof MockRuleRow>(index: number, field: K, value: MockRuleRow[K]) => void;
  onRemoveRule: (index: number) => void;
  onSaveRules: () => void;
  buildRuleSummary: (rule: MockRuleRow) => string[];
  formatRulePreviewBody: (body: string) => string;
};

export function EndpointMockRulesPanel({
  mockRuleRows,
  mockRuleMessage,
  canSave,
  onAddRule,
  onUpdateRule,
  onRemoveRule,
  onSaveRules,
  buildRuleSummary,
  formatRulePreviewBody
}: EndpointMockRulesPanelProps) {
  return (
    <EditorPanel title="Mock Rules">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">Match exact query, header, or body JSONPath values before falling back to the default mock preview.</p>
          <button
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
            onClick={onAddRule}
            type="button"
          >
            Add mock rule
          </button>
        </div>

        <div className="space-y-3">
          {mockRuleRows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-sm text-slate-500">
              No conditional mock rules yet.
            </p>
          ) : (
            mockRuleRows.map((rule, index) => (
              <div key={`mock-rule-${index}`} className="space-y-3 rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Field label={`Mock rule ${index + 1} name`}>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                      onChange={(event) => onUpdateRule(index, "ruleName", event.target.value)}
                      value={rule.ruleName}
                    />
                  </Field>
                  <Field label={`Mock rule ${index + 1} priority`}>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                      onChange={(event) => onUpdateRule(index, "priority", Number(event.target.value) || 0)}
                      value={rule.priority}
                    />
                  </Field>
                  <Field label={`Mock rule ${index + 1} response status`}>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                      onChange={(event) => onUpdateRule(index, "statusCode", Number(event.target.value) || 200)}
                      value={rule.statusCode}
                    />
                  </Field>
                  <Field label={`Mock rule ${index + 1} media type`}>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                      onChange={(event) => onUpdateRule(index, "mediaType", event.target.value)}
                      value={rule.mediaType}
                    />
                  </Field>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <Field label={`Mock rule ${index + 1} query conditions`}>
                    <textarea
                      className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-400"
                      onChange={(event) => onUpdateRule(index, "queryConditionsText", event.target.value)}
                      placeholder="mode=strict"
                      value={rule.queryConditionsText}
                    />
                  </Field>
                  <Field label={`Mock rule ${index + 1} header conditions`}>
                    <textarea
                      className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-400"
                      onChange={(event) => onUpdateRule(index, "headerConditionsText", event.target.value)}
                      placeholder="x-scenario=unauthorized"
                      value={rule.headerConditionsText}
                    />
                  </Field>
                </div>

                <Field label={`Mock rule ${index + 1} body conditions`}>
                  <textarea
                    aria-label={`Mock rule ${index + 1} body conditions`}
                    className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-400"
                    onChange={(event) => onUpdateRule(index, "bodyConditionsText", event.target.value)}
                    placeholder="$.user.id=31"
                    value={rule.bodyConditionsText}
                  />
                </Field>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                  <Field label={`Mock rule ${index + 1} body`}>
                    <textarea
                      className="min-h-32 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-400"
                      onChange={(event) => onUpdateRule(index, "body", event.target.value)}
                      value={rule.body}
                    />
                  </Field>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                      <input
                        checked={rule.enabled}
                        onChange={(event) => onUpdateRule(index, "enabled", event.target.checked)}
                        type="checkbox"
                      />
                      Enabled
                    </label>
                    <button
                      className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                      onClick={() => onRemoveRule(index)}
                      type="button"
                    >
                      Remove mock rule {index + 1}
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Match summary</p>
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      {buildRuleSummary(rule).map((item, itemIndex) => (
                        <p key={`${item}-${itemIndex}`}>{item}</p>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Rule response preview</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="rounded-full border border-slate-200 px-3 py-1">{rule.statusCode}</span>
                      <span className="rounded-full border border-slate-200 px-3 py-1">{rule.mediaType}</span>
                    </div>
                    <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-200">
                      {formatRulePreviewBody(rule.body)}
                    </pre>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={!canSave}
            onClick={onSaveRules}
            type="button"
          >
            Save mock rules
          </button>
          {mockRuleMessage ? <p className="text-sm text-emerald-600">{mockRuleMessage}</p> : null}
        </div>
      </div>
    </EditorPanel>
  );
}
