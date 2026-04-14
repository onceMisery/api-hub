"use client";

import type { CreateEnvironmentPayload, DebugTargetRule, EnvironmentDetail, EnvironmentEntry, UpdateEnvironmentPayload } from "@api-hub/api-sdk";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { buildClonedEnvironmentPayload, buildEnvironmentBundle, describeAuthMode, parseEnvironmentBundle } from "./environment-bundle-utils";
import { useI18n } from "../../../lib/ui-preferences";
import { DebugTargetRuleEditor } from "./debug-target-rule-editor";

type EnvironmentPanelProps = {
  canWrite: boolean;
  environments: EnvironmentDetail[];
  projectDebugAllowedHosts: DebugTargetRule[];
  onCreateEnvironment: (payload: CreateEnvironmentPayload) => Promise<void>;
  onDeleteEnvironment: (environmentId: number) => Promise<void>;
  onImportEnvironmentBundle: (payloads: CreateEnvironmentPayload[]) => Promise<void>;
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
  onImportEnvironmentBundle,
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
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importBundleText, setImportBundleText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [isImportingBundle, setIsImportingBundle] = useState(false);
  const selectedEnvironment = useMemo(
    () => environments.find((environment) => environment.id === selectedEnvironmentId) ?? null,
    [environments, selectedEnvironmentId]
  );
  const defaultEnvironment = useMemo(
    () => environments.find((environment) => environment.isDefault) ?? null,
    [environments]
  );
  const { t } = useI18n();
  const createAuthModeDescription = useMemo(() => describeAuthMode(createForm.authMode, t), [createForm.authMode, t]);
  const exportBundleText = useMemo(() => JSON.stringify(buildEnvironmentBundle(environments), null, 2), [environments]);
  const importPreview = useMemo(() => {
    if (!importBundleText.trim()) {
      return {
        error: null as string | null,
        payloads: [] as CreateEnvironmentPayload[]
      };
    }

    try {
      return {
        error: null,
        payloads: parseEnvironmentBundle(importBundleText, t)
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : t("Failed to parse environment bundle"),
        payloads: []
      };
    }
  }, [importBundleText, t]);

  useEffect(() => {
    setProjectDebugRules(projectDebugAllowedHosts);
  }, [projectDebugAllowedHosts]);

  async function handleCreateSubmit() {
    await onCreateEnvironment({
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
    });

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
  }

  async function handleImportBundle() {
    if (!canWrite) {
      return;
    }

    if (importPreview.error) {
      setImportError(importPreview.error);
      return;
    }

    if (importPreview.payloads.length === 0) {
      setImportError(t("Paste a version 1 bundle to import environments"));
      return;
    }

    setImportError(null);
    setIsImportingBundle(true);

    try {
      await onImportEnvironmentBundle(importPreview.payloads);
      setImportBundleText("");
      setIsImportOpen(false);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : t("Failed to import environment bundle"));
    } finally {
      setIsImportingBundle(false);
    }
  }

  const effectiveImportError = importError ?? importPreview.error;
  const importSummary =
    importPreview.payloads.length === 1
      ? t("1 environment ready to import")
      : t("{count} environments ready to import", { count: importPreview.payloads.length });

  return (
    <section className="rounded-[2rem] border border-white/60 bg-white/78 p-6 shadow-[0_24px_64px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{t("Environments")}</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-950">{t("Target environments")}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {t("Manage debug-safe environments, auth presets, and portable workbench bundles.")}
        </p>
      </div>

      <div className="mb-5 overflow-hidden rounded-[1.8rem] border border-slate-200 bg-[linear-gradient(145deg,rgba(15,23,42,0.98),rgba(30,41,59,0.94),rgba(148,163,184,0.28))] p-5 text-white shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-300">{t("Environment Lab")}</p>
            <h4 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              {t("Portable presets with safer import and cloning.")}
            </h4>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {t(
                "Export current environments into a bundle, import non-default copies into this project, or clone a preset for isolated testing without mutating the default lane."
              )}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              aria-pressed={isExportOpen}
              className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15"
              onClick={() => setIsExportOpen((current) => !current)}
              type="button"
            >
              {t("Open export bundle")}
            </button>
            <button
              aria-pressed={isImportOpen}
              className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-400"
              disabled={!canWrite}
              onClick={() => setIsImportOpen((current) => !current)}
              type="button"
            >
              {t("Open environment import")}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <LabStatCard label={t("Environment count")} value={String(environments.length)} detail={t("Live presets in this workbench")} />
          <LabStatCard
            label={t("Active environment")}
            value={selectedEnvironment?.name ?? t("None selected")}
            detail={selectedEnvironment ? formatAuthModeLabel(selectedEnvironment.authMode, t) : t("Pick a preset for debug runs")}
          />
          <LabStatCard
            label={t("Default environment")}
            value={defaultEnvironment?.name ?? t("Not set")}
            detail={defaultEnvironment ? defaultEnvironment.baseUrl : t("Imports never replace the default flag")}
          />
        </div>

        {isExportOpen ? (
          <div className="mt-5 rounded-[1.5rem] border border-white/12 bg-black/15 p-4">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">{t("Export bundle")}</p>
              <p className="mt-1 text-xs leading-5 text-slate-300">
                {t("Version 1 bundles include headers, query presets, variables, debug rules, and auth settings.")}
              </p>
            </div>
              <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                {t("Read only")}
              </span>
            </div>
            <Field
              helper={t("Copy this JSON into another project workbench to seed matching environments.")}
              label={t("Environment bundle export")}
              mutedLabel
            >
              <textarea
                aria-label="Environment bundle export"
                className="min-h-48 w-full rounded-[1.4rem] border border-white/10 bg-slate-950/80 px-4 py-4 font-mono text-sm leading-6 text-slate-100 outline-none"
                readOnly
                value={exportBundleText}
              />
            </Field>
          </div>
        ) : null}

        {isImportOpen ? (
          <div className="mt-5 rounded-[1.5rem] border border-white/12 bg-white/8 p-4 backdrop-blur">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <Field
              helper={t("Only version 1 bundles are accepted. Imported environments are always created as non-default copies.")}
              label={t("Environment bundle import")}
                mutedLabel
              >
                <textarea
                  aria-label="Environment bundle import"
                  className="min-h-52 w-full rounded-[1.4rem] border border-white/10 bg-slate-950/75 px-4 py-4 font-mono text-sm leading-6 text-slate-100 outline-none transition focus:border-cyan-300/60"
                  disabled={!canWrite}
                  onChange={(event) => {
                    setImportBundleText(event.target.value);
                    setImportError(null);
                  }}
                  placeholder='{"version":1,"exportedAt":"2026-04-11T12:00:00.000Z","environments":[]}'
                  value={importBundleText}
                />
              </Field>

              <div className="rounded-[1.4rem] border border-white/12 bg-black/15 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">{t("Import preview")}</p>
              <p className="mt-3 text-lg font-semibold text-white">
                {importPreview.payloads.length > 0 ? importSummary : t("No bundle loaded")}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {effectiveImportError
                  ? effectiveImportError
                  : importPreview.payloads.length > 0
                    ? t("Every imported environment will land as a non-default copy.")
                    : t("Paste a bundle to validate it before running the batch import.")}
              </p>
                <button
                  className="mt-4 w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-slate-300"
                disabled={!canWrite || isImportingBundle || importPreview.payloads.length === 0 || Boolean(importPreview.error)}
                onClick={() => void handleImportBundle()}
                type="button"
              >
                  {isImportingBundle ? t("Importing...") : t("Import environment bundle")}
              </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mb-5 space-y-3 rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t("Project Policy")}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {t("Control which hosts this project can debug against before environment overrides apply.")}
          </p>
        </div>
        <DebugTargetRuleEditor labelPrefix="Project" onChange={setProjectDebugRules} rules={projectDebugRules} />
        <button
          className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={!canWrite}
          onClick={() => void onUpdateProjectDebugPolicy(sanitizeDebugRules(projectDebugRules))}
          type="button"
        >
          {t("Save project debug policy")}
        </button>
      </div>

      <form
        className="space-y-4 rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canWrite || !createForm.name.trim() || !createForm.baseUrl.trim()) {
            return;
          }

          void handleCreateSubmit();
        }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t("New environment")}</p>
            <h4 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">{t("Add a reusable target profile")}</h4>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {formatAuthModeLabel(createForm.authMode, t)}
          </span>
        </div>
        <Field label={t("New environment name")}>
          <input
            aria-label="New environment name"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            disabled={!canWrite}
            onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Staging"
            value={createForm.name}
          />
        </Field>
        <Field label={t("New environment base URL")}>
          <input
            aria-label="New environment base URL"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-400"
            disabled={!canWrite}
            onChange={(event) => setCreateForm((current) => ({ ...current, baseUrl: event.target.value }))}
            placeholder="https://staging.example.com"
            value={createForm.baseUrl}
          />
        </Field>
        <Field label={t("New environment variables")}>
          <textarea
            aria-label="New environment variables"
            className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-400"
            disabled={!canWrite}
            onChange={(event) => setCreateVariablesText(event.target.value)}
            placeholder={"token=dev-token\nuserId=31"}
            value={createVariablesText}
          />
        </Field>
        <Field label={t("New environment headers")}>
          <textarea
            aria-label="New environment headers"
            className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-400"
            disabled={!canWrite}
            onChange={(event) => setCreateHeadersText(event.target.value)}
            placeholder={"Authorization: Bearer {{token}}\nX-App: ApiHub"}
            value={createHeadersText}
          />
        </Field>
        <Field label={t("New environment query")}>
          <textarea
            aria-label="New environment query"
            className="min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-400"
            disabled={!canWrite}
            onChange={(event) => setCreateQueryText(event.target.value)}
            placeholder={"locale=zh-CN\nregion=cn"}
            value={createQueryText}
          />
        </Field>
        <Field label={t("New environment auth mode")}>
          <select
            aria-label="New environment auth mode"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            disabled={!canWrite}
            onChange={(event) => setCreateForm((current) => ({ ...current, authMode: event.target.value as CreateEnvironmentPayload["authMode"] }))}
            value={createForm.authMode}
          >
            <option value="none">{t("No auth preset")}</option>
            <option value="bearer">{t("Bearer token")}</option>
            <option value="api_key_header">{t("API key header")}</option>
            <option value="api_key_query">{t("API key query parameter")}</option>
            <option value="basic">{t("Basic auth")}</option>
          </select>
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field helper={createAuthModeDescription.helper} label={createAuthModeDescription.keyLabel}>
            <input
              aria-label="New environment auth key"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-400"
              disabled={!canWrite}
              onChange={(event) => setCreateForm((current) => ({ ...current, authKey: event.target.value }))}
              placeholder={createAuthModeDescription.keyPlaceholder}
              value={createForm.authKey}
            />
          </Field>
          <Field label={createAuthModeDescription.valueLabel}>
            <input
              aria-label="New environment auth value"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-400"
              disabled={!canWrite}
              onChange={(event) => setCreateForm((current) => ({ ...current, authValue: event.target.value }))}
              placeholder={createAuthModeDescription.valuePlaceholder}
              value={createForm.authValue}
            />
          </Field>
        </div>
        <Field label={t("New environment debug host mode")}>
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
            <option value="inherit">{t("Inherit global + project")}</option>
            <option value="append">{t("Append environment rules")}</option>
            <option value="override">{t("Override project rules")}</option>
          </select>
        </Field>
        <Field label={t("New environment debug rules")}>
          <DebugTargetRuleEditor
            labelPrefix={t("New environment")}
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
          {t("Default environment")}
        </label>
        <button className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400" disabled={!canWrite} type="submit">
          {t("Add environment")}
        </button>
      </form>

      <div className="mt-5 space-y-3">
        {environments.length === 0 ? (
          <div className="rounded-[1.6rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500">
            {t("No environments yet.")}
          </div>
        ) : (
          environments.map((environment) => (
            <EnvironmentCard
              canWrite={canWrite}
              environment={environment}
              isSelected={environment.id === selectedEnvironmentId}
              key={environment.id}
              onCloneEnvironment={onCreateEnvironment}
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
  onCloneEnvironment,
  onDeleteEnvironment,
  onSelectEnvironment,
  onUpdateEnvironment
}: {
  canWrite: boolean;
  environment: EnvironmentDetail;
  isSelected: boolean;
  onCloneEnvironment: (payload: CreateEnvironmentPayload) => Promise<void>;
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
  const { t } = useI18n();
  const authModeDescription = useMemo(() => describeAuthMode(draft.authMode, t), [draft.authMode, t]);

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
          {isSelected ? (
            <span className="rounded-full bg-white/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
              {t("Active")}
            </span>
          ) : null}
          {environment.isDefault ? (
            <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${isSelected ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"}`}>
              {t("Default")}
            </span>
          ) : null}
          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${isSelected ? "bg-cyan-400/15 text-cyan-100" : "bg-sky-50 text-sky-700"}`}>
            {formatAuthModeLabel(environment.authMode, t)}
          </span>
          </div>
          <button
            aria-label={`Use environment ${environment.id}`}
          className={`rounded-2xl border px-3 py-2 text-xs font-medium transition ${isSelected ? "border-white/15 bg-white/10 text-white hover:bg-white/15" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"}`}
          onClick={() => onSelectEnvironment(environment.id)}
          type="button"
        >
            {t("Use environment")}
          </button>
      </div>

      <div className="mt-4 grid gap-3">
        <Field label={t("Environment {id} name", { id: environment.id })} dark={isSelected}>
          <input
            aria-label={`Environment ${environment.id} name`}
            className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${isSelected ? "border-white/15 bg-white/10 text-white focus:border-white/30" : "border-slate-200 bg-slate-50 text-slate-700 focus:border-slate-400"}`}
            disabled={!canWrite}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            value={draft.name}
          />
        </Field>
        <Field label={t("Environment {id} base URL", { id: environment.id })} dark={isSelected}>
          <input
            aria-label={`Environment ${environment.id} base URL`}
            className={`w-full rounded-2xl border px-4 py-3 font-mono text-sm outline-none transition ${isSelected ? "border-white/15 bg-white/10 text-white focus:border-white/30" : "border-slate-200 bg-slate-50 text-slate-700 focus:border-slate-400"}`}
            disabled={!canWrite}
            onChange={(event) => setDraft((current) => ({ ...current, baseUrl: event.target.value }))}
            value={draft.baseUrl}
          />
        </Field>
        <Field label={t("Environment {id} variables", { id: environment.id })} dark={isSelected}>
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
        <Field label={t("Environment {id} headers", { id: environment.id })} dark={isSelected}>
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
        <Field label={t("Environment {id} query", { id: environment.id })} dark={isSelected}>
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
        <Field label={t("Environment {id} auth mode", { id: environment.id })} dark={isSelected}>
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
            <option value="api_key_query">API key query parameter</option>
            <option value="basic">Basic auth</option>
          </select>
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field dark={isSelected} helper={authModeDescription.helper} label={authModeDescription.keyLabel}>
            <input
              aria-label={`Environment ${environment.id} auth key`}
              className={`w-full rounded-2xl border px-4 py-3 font-mono text-sm outline-none transition ${isSelected ? "border-white/15 bg-white/10 text-white focus:border-white/30" : "border-slate-200 bg-slate-50 text-slate-700 focus:border-slate-400"}`}
              disabled={!canWrite}
              onChange={(event) => setDraft((current) => ({ ...current, authKey: event.target.value }))}
              placeholder={authModeDescription.keyPlaceholder}
              value={draft.authKey}
            />
          </Field>
          <Field dark={isSelected} label={authModeDescription.valueLabel}>
            <input
              aria-label={`Environment ${environment.id} auth value`}
              className={`w-full rounded-2xl border px-4 py-3 font-mono text-sm outline-none transition ${isSelected ? "border-white/15 bg-white/10 text-white focus:border-white/30" : "border-slate-200 bg-slate-50 text-slate-700 focus:border-slate-400"}`}
              disabled={!canWrite}
              onChange={(event) => setDraft((current) => ({ ...current, authValue: event.target.value }))}
              placeholder={authModeDescription.valuePlaceholder}
              value={draft.authValue}
            />
          </Field>
        </div>
        <Field label={t("Environment {id} debug host mode", { id: environment.id })} dark={isSelected}>
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
            labelPrefix={t("Environment {id}", { id: environment.id })}
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
          {t("Default environment")}
        </label>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button
          aria-label={`Clone environment ${environment.id}`}
          className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${isSelected ? "border-cyan-300/20 bg-cyan-400/10 text-cyan-50 hover:bg-cyan-400/20" : "border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100"}`}
          disabled={!canWrite}
          onClick={() => void onCloneEnvironment(buildClonedEnvironmentPayload(environment))}
          type="button"
        >
          {t("Clone")}
        </button>
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
          {t("Save environment")}
        </button>
        <button
          aria-label={`Delete environment ${environment.id}`}
          className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${isSelected ? "border-rose-300/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20" : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"}`}
          disabled={!canWrite}
          onClick={() => void onDeleteEnvironment(environment.id)}
          type="button"
        >
          {t("Delete environment")}
        </button>
      </div>
    </div>
  );
}

function Field({
  children,
  dark = false,
  helper,
  label,
  mutedLabel = false
}: {
  children: ReactNode;
  dark?: boolean;
  helper?: string;
  label: string;
  mutedLabel?: boolean;
}) {
  return (
    <label className="block space-y-2">
      <span className={`text-sm font-medium ${mutedLabel ? "text-slate-200" : dark ? "text-slate-200" : "text-slate-700"}`}>{label}</span>
      {children}
      {helper ? <p className={`text-xs leading-5 ${dark || mutedLabel ? "text-slate-300" : "text-slate-500"}`}>{helper}</p> : null}
    </label>
  );
}

function LabStatCard({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-white/8 p-4 backdrop-blur">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">{label}</p>
      <p className="mt-3 text-lg font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-300">{detail}</p>
    </div>
  );
}

function formatAuthModeLabel(mode: CreateEnvironmentPayload["authMode"] | UpdateEnvironmentPayload["authMode"], t: ReturnType<typeof useI18n>["t"]) {
  switch (mode) {
    case "bearer":
      return t("Bearer preset");
    case "api_key_header":
      return t("Header API key");
    case "api_key_query":
      return t("Query API key");
    case "basic":
      return t("Basic auth");
    case "none":
    default:
      return t("No auth preset");
  }
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
