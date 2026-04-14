"use client";

import type { DebugTargetRule } from "@api-hub/api-sdk";

type DebugTargetRuleEditorProps = {
  labelPrefix: string;
  rules: DebugTargetRule[];
  disabled?: boolean;
  dark?: boolean;
  onChange: (rules: DebugTargetRule[]) => void;
};

const EMPTY_RULE: DebugTargetRule = { pattern: "", allowPrivate: false };

export function DebugTargetRuleEditor({
  labelPrefix,
  rules,
  disabled = false,
  dark = false,
  onChange
}: DebugTargetRuleEditorProps) {
  const safeRules = rules.length > 0 ? rules : [EMPTY_RULE];
  const inputClassName = `w-full rounded-2xl border px-4 py-3 font-mono text-sm outline-none transition ${
    dark
      ? "border-white/15 bg-white/10 text-white focus:border-white/30"
      : "border-slate-200 bg-white text-slate-700 focus:border-slate-400"
  }`;
  const panelClassName = dark ? "border-white/15 bg-white/5" : "border-slate-200 bg-slate-50/80";
  const buttonClassName = dark
    ? "border-white/15 bg-white/10 text-white hover:bg-white/15"
    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <div className="space-y-3">
      {safeRules.map((rule, index) => (
        <div className={`rounded-[1.4rem] border p-3 ${panelClassName}`} key={`${labelPrefix}-${index}`}>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
            <input
              aria-label={`${labelPrefix} debug rule ${index + 1} pattern`}
              className={inputClassName}
              disabled={disabled}
              onChange={(event) =>
                onChange(
                  safeRules.map((currentRule, ruleIndex) =>
                    ruleIndex === index ? { ...currentRule, pattern: event.target.value } : currentRule
                  )
                )
              }
              placeholder="*.example.com or 10.10.1.8"
              value={rule.pattern}
            />
            <label
              className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-sm ${
                dark ? "border-white/15 bg-white/10 text-white" : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              <input
                aria-label={`${labelPrefix} debug rule ${index + 1} allow private`}
                checked={rule.allowPrivate}
                disabled={disabled}
                onChange={(event) =>
                  onChange(
                    safeRules.map((currentRule, ruleIndex) =>
                      ruleIndex === index ? { ...currentRule, allowPrivate: event.target.checked } : currentRule
                    )
                  )
                }
                type="checkbox"
              />
              Allow private
            </label>
            <button
              aria-label={`${labelPrefix} remove debug rule ${index + 1}`}
              className={`rounded-2xl border px-3 py-3 text-sm font-medium transition ${buttonClassName}`}
              disabled={disabled || safeRules.length === 1}
              onClick={() => onChange(safeRules.filter((_, ruleIndex) => ruleIndex !== index))}
              type="button"
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      <button
        aria-label={`${labelPrefix} add debug rule`}
        className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${buttonClassName}`}
        disabled={disabled}
        onClick={() => onChange([...safeRules, EMPTY_RULE])}
        type="button"
      >
        Add rule
      </button>
    </div>
  );
}
