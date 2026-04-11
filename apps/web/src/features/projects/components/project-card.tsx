"use client";

import Link from "next/link";

import type { ProjectSummary } from "@api-hub/api-sdk";

import { useI18n } from "../../../lib/ui-preferences";
import { formatProjectAccess } from "./project-catalog-utils";

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const { t } = useI18n();
  const accessLabel = resolveAccessLabel(project.currentUserRole, t);
  const debugRuleCount = t("project.debugRuleCount", { count: project.debugAllowedHosts.length });

  return (
    <article className="group app-shell-card-strong overflow-hidden rounded-[2rem] p-5 transition hover:-translate-y-1 hover:shadow-[0_32px_90px_rgba(15,23,42,0.14)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{project.projectKey}</p>
          <h2 className="mt-3 truncate text-2xl font-semibold text-slate-950">{project.name}</h2>
        </div>
        <Link
          className="rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          href={`/console/projects/${project.id}`}
        >
          {t("project.action.open")}
        </Link>
      </div>

      <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
        {project.description || t("project.fallbackDescription")}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Badge label={accessLabel} />
        <Badge label={project.canWrite ? t("project.badge.writable") : t("project.badge.readOnly")} tone={project.canWrite ? "emerald" : "amber"} />
        <Badge label={project.canManageMembers ? t("project.badge.manage") : t("project.badge.review")} />
      </div>

      <div className="mt-5 rounded-[1.6rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.97),rgba(15,23,42,0.88))] p-4 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("project.runtimePosture")}</p>
        <p className="mt-2 text-sm text-slate-200">{debugRuleCount}</p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
            href={`/console/projects/${project.id}`}
          >
            {t("project.action.enter")}
          </Link>
          <Link
            className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            href={`/console/projects/${project.id}/browse`}
          >
            {t("project.action.browseDocs")}
          </Link>
        </div>
      </div>
    </article>
  );
}

function Badge({
  label,
  tone = "slate"
}: {
  label: string;
  tone?: "slate" | "emerald" | "amber";
}) {
  if (tone === "emerald") {
    return (
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">
        {label}
      </span>
    );
  }

  if (tone === "amber") {
    return (
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
        {label}
      </span>
    );
  }

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
      {label}
    </span>
  );
}

function resolveAccessLabel(role: string | null | undefined, t: ReturnType<typeof useI18n>["t"]) {
  switch (role) {
    case "project_admin":
      return t("project.access.admin");
    case "editor":
      return t("project.access.editor");
    case "tester":
      return t("project.access.tester");
    case "viewer":
      return t("project.access.viewer");
    default:
      return formatProjectAccess(role);
  }
}
