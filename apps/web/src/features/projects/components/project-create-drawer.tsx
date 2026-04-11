"use client";

import { AnimatePresence, motion } from "framer-motion";

import { useI18n } from "../../../lib/ui-preferences";
import type { ProjectCreateDraft, ProjectDraftErrors } from "./project-catalog-utils";
import { normalizeProjectKey } from "./project-catalog-utils";

type ProjectCreateDrawerProps = {
  draft: ProjectCreateDraft;
  errors: ProjectDraftErrors;
  isOpen: boolean;
  isSubmitting: boolean;
  onChangeDescription: (value: string) => void;
  onChangeName: (value: string) => void;
  onChangeProjectKey: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  submitError: string | null;
};

export function ProjectCreateDrawer({
  draft,
  errors,
  isOpen,
  isSubmitting,
  onChangeDescription,
  onChangeName,
  onChangeProjectKey,
  onClose,
  onSubmit,
  submitError
}: ProjectCreateDrawerProps) {
  const { t } = useI18n();

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.button
            aria-label={t("catalog.createDrawer.closeOverlay")}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            type="button"
          />
          <motion.aside
            aria-label={t("catalog.createProject")}
            aria-modal="true"
            className="relative flex h-full w-full max-w-[580px] flex-col overflow-hidden border-l border-white/40 bg-[#f7f4ec]/95 shadow-[-24px_0_80px_rgba(15,23,42,0.28)]"
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            role="dialog"
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <div className="border-b border-slate-200/80 bg-white/72 px-6 py-5 backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {t("catalog.createDrawer.eyebrow")}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    {t("catalog.createDrawer.title")}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                    {t("catalog.createDrawer.detail")}
                  </p>
                </div>
                <button
                  aria-label={t("catalog.createDrawer.closePanel")}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  onClick={onClose}
                  type="button"
                >
                  {t("catalog.createDrawer.close")}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="rounded-[1.8rem] border border-slate-900/85 bg-[radial-gradient(circle_at_top_left,_rgba(226,232,240,0.16),_rgba(15,23,42,0.97)_58%)] p-5 text-white shadow-[0_22px_60px_rgba(15,23,42,0.24)]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                  {t("catalog.createDrawer.preview")}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <PreviewBadge
                    label={
                      draft.projectKey || normalizeProjectKey(draft.name) || t("catalog.createDrawer.projectKeyFallback")
                    }
                  />
                  <PreviewBadge label={t("project.access.admin")} tone="emerald" />
                  <PreviewBadge label={t("project.debugRuleCount", { count: 0 })} />
                </div>
              </div>

              <div className="mt-6 space-y-4 rounded-[1.8rem] border border-white/70 bg-white/80 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                <Field error={errors.name ? t(errors.name) : undefined} label={t("catalog.createDrawer.projectName")}>
                  <input
                    aria-label={t("catalog.createDrawer.projectName")}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                    onChange={(event) => onChangeName(event.target.value)}
                    placeholder={t("catalog.createDrawer.namePlaceholder")}
                    value={draft.name}
                  />
                </Field>

                <Field error={errors.projectKey ? t(errors.projectKey) : undefined} label={t("catalog.createDrawer.projectKey")}>
                  <input
                    aria-label={t("catalog.createDrawer.projectKey")}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-400"
                    onChange={(event) => onChangeProjectKey(event.target.value)}
                    placeholder={t("catalog.createDrawer.keyPlaceholder")}
                    value={draft.projectKey}
                  />
                </Field>

                <Field
                  error={errors.description ? t(errors.description) : undefined}
                  label={t("catalog.createDrawer.projectDescription")}
                >
                  <textarea
                    aria-label={t("catalog.createDrawer.projectDescription")}
                    className="min-h-32 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                    onChange={(event) => onChangeDescription(event.target.value)}
                    placeholder={t("catalog.createDrawer.descriptionPlaceholder")}
                    value={draft.description}
                  />
                </Field>

                {submitError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{submitError}</div>
                ) : null}

                <button
                  className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  disabled={isSubmitting}
                  onClick={onSubmit}
                  type="button"
                >
                  {isSubmitting ? t("catalog.createDrawer.submitting") : t("catalog.createDrawer.submit")}
                </button>
              </div>
            </div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

function Field({
  children,
  error,
  label
}: {
  children: React.ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error ? <span className="text-xs font-medium text-rose-600">{error}</span> : null}
    </label>
  );
}

function PreviewBadge({
  label,
  tone = "slate"
}: {
  label: string;
  tone?: "slate" | "emerald";
}) {
  if (tone === "emerald") {
    return (
      <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100">
        {label}
      </span>
    );
  }

  return (
    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-100">
      {label}
    </span>
  );
}
