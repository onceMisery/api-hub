"use client";

import type { CreateEnvironmentPayload, DebugTargetRule, EnvironmentDetail, EnvironmentEntry, UpdateEnvironmentPayload } from "@api-hub/api-sdk";
import { useEffect, useState } from "react";

import { DebugTargetRuleEditor } from "./debug-target-rule-editor";

type EnvironmentPanelProps = {
  canWrite: boolean;
  environments: EnvironmentDetail[];
  projectDebugAllowedHosts: DebugTargetRule[];
  onCreateEnvironment: (payload: CreateEnvironmentPayload) => Promise<void>;
  onDeleteEnvironment: (environmentId: number) => Promise<void>;
  onSelectEnvironment: (environmentId: number) => void;
  onUpdateProjectDebugPolicy: (debugAllowedHosts: DebugTargetRule[]) => Promise<void>;
  onUpdateEnvironment: (environmentId: number, payload: UpdateEnvironmentPayload) => Promise<void>;
  selectedEnvironmentId: number | null;
};

export function EnvironmentPanel({
  canWrite,
  environments,
  projectDebugAllowedHosts,
  onCreateEnvironment,
  onDeleteEnvironment,
  onSelectEnvironment,
  onUpdateProjectDebugPolicy,
  onUpdateEnvironment,
  selectedEnvironmentId
}: EnvironmentPanelProps) {
  const [createForm, setCreateForm] = useState<CreateEnvironmentPayload>({
    baseUrl: "",
    defaultHeaders: [],
    defaultQuery: [],
    authKey: "",
    authMode: "none",
    authValue: "",
    debugAllowedHosts: [],
    debugHostMode: "inherit",
    isDefault: false,
    name: "",
    variables: []
  });
  const [projectDebugRules, setProjectDebugRules] = useState<DebugTargetRule[]>(projectDebugAllowedHosts);
  const [createVariablesText, setCreateVariablesText] = useState("");
  const [createHeadersText, setCreateHeadersText] = useState("");
  const [createQueryText, setCreateQueryText] = useState("");

  useEffect(() => {
    setProjectDebugRules(projectDebugAllowedHosts);
  }, [projectDebugAllowedHosts]);

  return (
    <section className="rounded-[2rem] border border-white/60 bg-white/78 p-6 shadow-[0_24px_64px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Environments</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-950">Target environments</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">Manage base URLs before wiring real request debugging.</p>
      </div>

      <div className="mb-5 space-y-3 rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Project Policy</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Control which hosts this project can debug against before environment overrides apply.</p>
        </div>
        <DebugTargetRuleEditor labelPrefix="Project" onChange={setProjectDebugRules} rules={projectDebugRules} />
        <button
          className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={!canWrite}
          onClick={() => void onUpdateProjectDebugPolicy(sanitizeDebugRules(projectDebugRules))}
          type="button"
        >
          Save project debug policy
        </button>
      </div>

      <form
        className="space-y-3 rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canWrite || !createForm.name.trim() || !createForm.baseUrl.trim()) {
            return;
          }

          void onCreateEnvironment({
            ...createForm,
            baseUrl: createForm.baseUrl.trim(),
            defaultHeaders: parseEntries(createHeadersText, ":"),
            defaultQuery: parseEntries(createQueryText, "="),
            authKey: createForm.authKey.trim(),
            authMode: createForm.authMode,
            authValue: createForm.authValue.trim(),
            debugAllowedHosts: sanitizeDebugRules(createForm.debugAllowedHosts),
            debugHostMode: createForm.debugHostMode,
            name: createForm.name.trim(),
            variables: parseEntries(createVariablesText, "=")
          }).then(() => {
            setCreateForm({
              baseUrl: "",
              defaultHeaders: [],
              defaultQuery: [],
              authKey: "",
              authMode: "none",
              authValue: "",
              debugAllowedHosts: [],
              debugHostMode: "inherit",
              isDefault: false,
              name: "",
              variables: []
            });
            setCreateVariablesText("");
            setCreateHeadersText("");
            setCreateQueryText("");
          });
        }}
      >
        <Field label="New environment name">
          <input
            aria-label="New environment name"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            disabled={!canWrite}
            onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Staging"
            value={createForm.name}
          />
        </Field>
        <Field label="New environment base URL">
          <input
            aria-label="New environment base URL"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-400"
            disabled={!canWrite}
            onChange={(event) => setCreateForm((current) => ({ ...current, baseUrl: event.target.value }))}
            placeholder="https://staging.example.com"
            value={createForm.baseUrl}
          />
        </Field>
        <Field label="New environment variables">
          <textarea
            aria-label="New environment variables"
            className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-400"
            disabled={!canWrite}
            onChange={(event) => setCreateVariablesText(event.target.value)}
            placeholder={"token=dev-token\nuserId=31"}
            value={createVariablesText}
          />
        </Field>
        <Field label="New environment headers">
          <textarea
            aria-label="New environment headers"
            className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-400"
            disabled={!canWrite}
            onChange={(event) => setCreateHeadersText(event.target.value)}
            placeholder={"Authorization: Bearer {{token}}\nX-App: ApiHub"}
            value={createHeadersText}
          />
        </Field>
        <Field label="New environment query">
          <textarea
            aria-label="New environment query"
            className="min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-400"
            disabled={!canWrite}
            onChange={(event) => setCreateQueryText(event.target.value)}
            placeholder={"locale=zh-CN\nregion=cn"}
            value={createQueryText}
          />
        </Field>
        <Field label="New environment auth mode">
          <select
            aria-label="New environment auth mode"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            disabled={!canWrite}
            onChange={(event) => setCreateForm((current) => ({ ...current, authMode: event.target.value as CreateEnvironmentPayload["authMode"] }))}
            value={createForm.authMode}
          >
            <option value="none">No auth preset</option>
            <option value="bearer">Bearer token</option>
            <option value="api_key_header">API key header</option>
          </select>
        </Field>
        <Field label="New environment auth key">
          <input
            aria-label="New environment auth key"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-400"
            disabled={!canWrite}
            onChange={(event) => setCreateForm((current) => ({ ...current, authKey: event.target.value }))}
            placeholder="Authorization"
            value={createForm.authKey}
          />
        </Field>
        <Field label="New environment auth value">
          <input
            aria-label="New environment auth value"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-400"
            disabled={!canWrite}
            onChange={(event) => setCreateForm((current) => ({ ...current, authValue: event.target.value }))}
            placeholder="dev-token"
            value={createForm.authValue}
          />
        </Field>
        <Field label="New environment debug host mode">
          <select
            aria-label="New environment debug host mode"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            disabled={!canWrite}
            onChange={(event) =>
              setCreateForm((current) => ({
                ...current,
                debugHostMode: event.target.value as CreateEnvironmentPayload["debugHostMode"]
              }))
            }
            value={createForm.debugHostMode}
          >
            <option value="inherit">Inherit global + project</option>
            <option value="append">Append environment rules</option>
            <option value="override">Override project rules</option>
          </select>
        </Field>
        <Field label="New environment debug rules">
          <DebugTargetRuleEditor
            labelPrefix="New environment"
            onChange={(debugAllowedHosts) => setCreateForm((current) => ({ ...current, debugAllowedHosts }))}
            rules={createForm.debugAllowedHosts}
          />
        </Field>
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          <input
            checked={createForm.isDefault}
            disabled={!canWrite}
            onChange={(event) => setCreateForm((current) => ({ ...current, isDefault: event.target.checked }))}
            type="checkbox"
          />
          Default environment
        </label>
        <button className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400" disabled={!canWrite} type="submit">
          Add environment
        </button>
      </form>

      <div className="mt-5 space-y-3">
        {environments.length === 0 ? (
          <div className="rounded-[1.6rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500">
            No environments yet.
          </div>
        ) : (
          environments.map((environment) => (
            <EnvironmentCard
              environment={environment}
              isSelected={environment.id === selectedEnvironmentId}
              key={environment.id}
              canWrite={canWrite}
              onDeleteEnvironment={onDeleteEnvironment}
              onSelectEnvironment={onSelectEnvironment}
              onUpdateEnvironment={onUpdateEnvironment}
            />
          ))
        )}
      </div>
    </section>
  );
}

function EnvironmentCard({
  canWrite,
  environment,
  isSelected,
  onDeleteEnvironment,
  onSelectEnvironment,
  onUpdateEnvironment
}: {
  canWrite: boolean;
  environment: EnvironmentDetail;
  isSelected: boolean;
  onDeleteEnvironment: (environmentId: number) => Promise<void>;
  onSelectEnvironment: (environmentId: number) => void;
  onUpdateEnvironment: (environmentId: number, payload: UpdateEnvironmentPayload) => Promise<void>;
}) {
  const [draft, setDraft] = useState<UpdateEnvironmentPayload>({
    baseUrl: environment.baseUrl,
    defaultHeaders: environment.defaultHeaders,
    defaultQuery: environment.defaultQuery,
    authKey: environment.authKey,
    authMode: environment.authMode,
    authValue: environment.authValue,
    debugAllowedHosts: environment.debugAllowedHosts ?? [],
    debugHostMode: environment.debugHostMode ?? "inherit",
    isDefault: environment.isDefault,
    name: environment.name,
    variables: environment.variables
  });
  const [variablesText, setVariablesText] = useState(formatEntries(environment.variables, "="));
  const [headersText, setHeadersText] = useState(formatEntries(environment.defaultHeaders, ":"));
  const [queryText, setQueryText] = useState(formatEntries(environment.defaultQuery, "="));

  useEffect(() => {
    setDraft({
      baseUrl: environment.baseUrl,
      defaultHeaders: environment.defaultHeaders,
      defaultQuery: environment.defaultQuery,
      authKey: environment.authKey,
      authMode: environment.authMode,
      authValue: environment.authValue,
      debugAllowedHosts: environment.debugAllowedHosts ?? [],
      debugHostMode: environment.debugHostMode ?? "inherit",
      isDefault: environment.isDefault,
      name: environment.name,
      variables: environment.variables
    });
    setVariablesText(formatEntries(environment.variables, "="));
    setHeadersText(formatEntries(environment.defaultHeaders, ":"));
    setQueryText(formatEntries(environment.defaultQuery, "="));
  }, [environment]);

  return (
    <div className={`rounded-[1.6rem] border p-4 transition ${isSelected ? "border-slate-900 bg-slate-950 text-white" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${isSelected ? "text-white" : "text-slate-900"}`}>{environment.name}</span>
          {isSelected ? <span className="rounded-full bg-white/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">Active</span> : null}
          {environment.isDefault ? (
            <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${isSelected ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"}`}>
              Default
            </span>
          ) : null}
        </div>
        <button
          aria-label={`Use environment ${environment.id}`}
          className={`rounded-2xl border px-3 py-2 text-xs font-medium transition ${isSelected ? "border-white/15 bg-white/10 text-white hover:bg-white/15" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"}`}
          onClick={() => onSelectEnvironment(environment.id)}
          type="button"
        >
          Use environment
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        <Field label={`Environment ${environment.id} name`} dark={isSelected}>
          <input
            aria-label={`Environment ${environment.id} name`}
            className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${isSelected ? "border-white/15 bg-white/10 text-white focus:border-white/30" : "border-slate-200 bg-slate-50 text-slate-700 focus:border-slate-400"}`}
            disabled={!canWrite}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            value={draft.name}
          />
        </Field>
        <Field label={`Environment ${environment.id} base URL`} dark={isSelected}>
          <input
            aria-label={`Environment ${environment.id} base URL`}
            className={`w-full rounded-2xl border px-4 py-3 font-mono text-sm outline-none transition ${isSelected ? "border-white/15 bg-white/10 text-white focus:border-white/30" : "border-slate-200 bg-slate-50 text-slate-700 focus:border-slate-400"}`}
            disabled={!canWrite}
            onChange={(event) => setDraft((current) => ({ ...current, baseUrl: event.target.value }))}
            value={draft.baseUrl}
          />
        </Field>
        <Field label={`Environment ${environment.id} variables`} dark={isSelected}>
          <textarea
            aria-label={`Environment ${environment.id} variables`}
            className={`min-h-24 w-full rounded-2xl border px-4 py-3 font-mono text-sm outline-none transition ${isSelected ? "border-white/15 bg-white/10 text-white focus:border-white/30" : "border-slate-200 bg-slate-50 text-slate-700 focus:border-slate-400"}`}
            disabled={!canWrite}
            onChange={(event) => {
              setVariablesText(event.target.value);
              setDraft((current) => ({ ...current, variables: parseEntries(event.target.value, "=") }));
            }}
            value={variablesText}
          />
        </Field>
        <Field label={`Environment ${environment.id} headers`} dark={isSelected}>
          <textarea
            aria-label={`Environment ${environment.id} headers`}
            className={`min-h-24 w-full rounded-2xl border px-4 py-3 font-mono text-sm outline-none transition ${isSelected ? "border-white/15 bg-white/10 text-white focus:border-white/30" : "border-slate-200 bg-slate-50 text-slate-700 focus:border-slate-400"}`}
            disabled={!canWrite}
            onChange={(event) => {
              setHeadersText(event.target.value);
              setDraft((current) => ({ ...current, defaultHeaders: parseEntries(event.target.value, ":") }));
            }}
            value={headersText}
          />
        </Field>
        <Field label={`Environment ${environment.id} query`} dark={isSelected}>
          <textarea
            aria-label={`Environment ${environment.id} query`}
            className={`min-h-20 w-full rounded-2xl border px-4 py-3 font-mono text-sm outline-none transition ${isSelected ? "border-white/15 bg-white/10 text-white focus:border-white/30" : "border-slate-200 bg-slate-50 text-slate-700 focus:border-slate-400"}`}
            disabled={!canWrite}
            onChange={(event) => {
              setQueryText(event.target.value);
              setDraft((current) => ({ ...current, defaultQuery: parseEntries(event.target.value, "=") }));
            }}
            value={queryText}
          />
        </Field>
        <Field label={`Environment ${environment.id} auth mode`} dark={isSelected}>
          <select
            aria-label={`Environment ${environment.id} auth mode`}
            className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${isSelected ? "border-white/15 bg-white/10 text-white focus:border-white/30" : "border-slate-200 bg-slate-50 text-slate-700 focus:border-slate-400"}`}
            disabled={!canWrite}
            onChange={(event) => setDraft((current) => ({ ...current, authMode: event.target.value as UpdateEnvironmentPayload["authMode"] }))}
            value={draft.authMode}
          >
            <option value="none">No auth preset</option>
            <option value="bearer">Bearer token</option>
            <option value="api_key_header">API key header</option>
          </select>
        </Field>
        <Field label={`Environment ${environment.id} auth key`} dark={isSelected}>
          <input
            aria-label={`Environment ${environment.id} auth key`}
            className={`w-full rounded-2xl border px-4 py-3 font-mono text-sm outline-none transition ${isSelected ? "border-white/15 bg-white/10 text-white focus:border-white/30" : "border-slate-200 bg-slate-50 text-slate-700 focus:border-slate-400"}`}
            disabled={!canWrite}
            onChange={(event) => setDraft((current) => ({ ...current, authKey: event.target.value }))}
            value={draft.authKey}
          />
        </Field>
        <Field label={`Environment ${environment.id} auth value`} dark={isSelected}>
          <input
            aria-label={`Environment ${environment.id} auth value`}
            className={`w-full rounded-2xl border px-4 py-3 font-mono text-sm outline-none transition ${isSelected ? "border-white/15 bg-white/10 text-white focus:border-white/30" : "border-slate-200 bg-slate-50 text-slate-700 focus:border-slate-400"}`}
            disabled={!canWrite}
            onChange={(event) => setDraft((current) => ({ ...current, authValue: event.target.value }))}
            value={draft.authValue}
          />
        </Field>
        <Field label={`Environment ${environment.id} debug host mode`} dark={isSelected}>
          <select
            aria-label={`Environment ${environment.id} debug host mode`}
            className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${isSelected ? "border-white/15 bg-white/10 text-white focus:border-white/30" : "border-slate-200 bg-slate-50 text-slate-700 focus:border-slate-400"}`}
            disabled={!canWrite}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                debugHostMode: event.target.value as UpdateEnvironmentPayload["debugHostMode"]
              }))
            }
            value={draft.debugHostMode}
          >
            <option value="inherit">Inherit global + project</option>
            <option value="append">Append environment rules</option>
            <option value="override">Override project rules</option>
          </select>
        </Field>
        <Field label={`Environment ${environment.id} debug rules`} dark={isSelected}>
          <DebugTargetRuleEditor
            dark={isSelected}
            labelPrefix={`Environment ${environment.id}`}
            onChange={(debugAllowedHosts) => setDraft((current) => ({ ...current, debugAllowedHosts }))}
            rules={draft.debugAllowedHosts}
          />
        </Field>
        <label className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${isSelected ? "border-white/15 bg-white/10 text-white" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
          <input
            aria-label={`Environment ${environment.id} default`}
            checked={draft.isDefault}
            disabled={!canWrite}
            onChange={(event) => setDraft((current) => ({ ...current, isDefault: event.target.checked }))}
            type="checkbox"
          />
          Default environment
        </label>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          aria-label={`Save environment ${environment.id}`}
          className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${isSelected ? "border-white/15 bg-white/10 text-white hover:bg-white/15" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"}`}
          disabled={!canWrite}
          onClick={() =>
            void onUpdateEnvironment(environment.id, {
              baseUrl: draft.baseUrl.trim(),
              defaultHeaders: draft.defaultHeaders,
              defaultQuery: draft.defaultQuery,
              authKey: draft.authKey.trim(),
              authMode: draft.authMode,
              authValue: draft.authValue.trim(),
              debugAllowedHosts: sanitizeDebugRules(draft.debugAllowedHosts),
              debugHostMode: draft.debugHostMode,
              isDefault: draft.isDefault,
              name: draft.name.trim(),
              variables: draft.variables
            })
          }
          type="button"
        >
          Save environment
        </button>
        <button
          aria-label={`Delete environment ${environment.id}`}
          className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${isSelected ? "border-rose-300/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20" : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"}`}
          disabled={!canWrite}
          onClick={() => void onDeleteEnvironment(environment.id)}
          type="button"
        >
          Delete environment
        </button>
      </div>
    </div>
  );
}

function Field({ children, dark = false, label }: { children: React.ReactNode; dark?: boolean; label: string }) {
  return (
    <label className="block space-y-2">
      <span className={`text-sm font-medium ${dark ? "text-slate-200" : "text-slate-700"}`}>{label}</span>
      {children}
    </label>
  );
}

function parseEntries(value: string, separator: ":" | "="): EnvironmentEntry[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.indexOf(separator);
      if (separatorIndex === -1) {
        return { name: line.trim(), value: "" };
      }

      return {
        name: line.slice(0, separatorIndex).trim(),
        value: line.slice(separatorIndex + 1).trim()
      };
    })
    .filter((entry) => entry.name);
}

function formatEntries(entries: EnvironmentEntry[], separator: ":" | "=") {
  return entries.map((entry) => `${entry.name}${separator} ${entry.value}`.trimEnd()).join("\n");
}

function sanitizeDebugRules(rules: DebugTargetRule[]) {
  return rules
    .map((rule) => ({
      allowPrivate: rule.allowPrivate,
      pattern: rule.pattern.trim()
    }))
    .filter((rule) => rule.pattern);
}
