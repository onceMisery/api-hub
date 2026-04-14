import type { MockRuleTrace } from "@api-hub/api-sdk";

const STATUS_STYLES: Record<
  MockRuleTrace["status"],
  {
    badge: string;
    label: string;
    panel: string;
    ring: string;
  }
> = {
  matched: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    label: "Matched",
    panel: "border-emerald-200/80 bg-[linear-gradient(145deg,rgba(236,253,245,0.96),rgba(255,255,255,0.96))]",
    ring: "bg-emerald-300/60"
  },
  skipped: {
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    label: "Skipped",
    panel: "border-amber-200/80 bg-[linear-gradient(145deg,rgba(255,251,235,0.97),rgba(255,255,255,0.96))]",
    ring: "bg-amber-300/65"
  },
  not_evaluated: {
    badge: "border-sky-200 bg-sky-50 text-sky-700",
    label: "Not evaluated",
    panel: "border-sky-200/80 bg-[linear-gradient(145deg,rgba(240,249,255,0.97),rgba(255,255,255,0.96))]",
    ring: "bg-sky-300/65"
  },
  disabled: {
    badge: "border-slate-200 bg-slate-100 text-slate-600",
    label: "Disabled",
    panel: "border-slate-200/80 bg-[linear-gradient(145deg,rgba(248,250,252,0.97),rgba(255,255,255,0.96))]",
    ring: "bg-slate-300/60"
  }
};

export function MockRuleMatchboard({ ruleTraces }: { ruleTraces: MockRuleTrace[] }) {
  if (ruleTraces.length === 0) {
    return null;
  }

  const winner = ruleTraces.find((trace) => trace.status === "matched");
  const evaluatedCount = ruleTraces.filter((trace) => trace.status === "matched" || trace.status === "skipped").length;
  const skippedCount = ruleTraces.filter((trace) => trace.status === "skipped").length;
  const deferredCount = ruleTraces.filter((trace) => trace.status === "not_evaluated").length;

  return (
    <div
      aria-label="Rule Matchboard"
      className="rounded-[1.7rem] border border-slate-200 bg-[linear-gradient(145deg,rgba(248,250,252,0.98),rgba(255,255,255,0.98))] p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
      role="region"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Rule Matchboard</p>
          <h4 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
            {winner ? `${winner.ruleName} won the draft simulation.` : "No draft rule won the simulation."}
          </h4>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Review the exact evaluation path in runtime order before changing priorities or condition samples.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <BoardMetric label="Evaluated" value={String(evaluatedCount)} />
          <BoardMetric label="Skipped" value={String(skippedCount)} />
          <BoardMetric label="Deferred" value={String(deferredCount)} />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {ruleTraces.map((trace) => {
          const styles = STATUS_STYLES[trace.status];

          return (
            <article
              className={`relative overflow-hidden rounded-[1.4rem] border p-4 shadow-[0_14px_35px_rgba(15,23,42,0.05)] ${styles.panel}`}
              key={`${trace.ruleName}-${trace.priority}-${trace.status}`}
            >
              <div className={`absolute -right-6 top-[-2rem] h-20 w-20 rounded-full blur-2xl ${styles.ring}`} />

              <div className="relative">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-base font-semibold tracking-tight text-slate-950">{trace.ruleName}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{trace.summary}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${styles.badge}`}>
                      {styles.label}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Priority {trace.priority}
                    </span>
                  </div>
                </div>

                {trace.checks.length > 0 ? (
                  <div className="mt-4 grid gap-2">
                    {trace.checks.map((check) => (
                      <div
                        className="rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-sm leading-6 text-slate-700"
                        key={`${trace.ruleName}-${check}`}
                      >
                        {check}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function BoardMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-slate-200 bg-white/90 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-base font-semibold text-slate-950">{value}</p>
    </div>
  );
}
