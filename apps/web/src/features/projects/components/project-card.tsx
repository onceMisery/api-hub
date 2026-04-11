import Link from "next/link";

import type { ProjectSummary } from "@api-hub/api-sdk";

import { formatDebugRuleCount, formatProjectAccess } from "./project-catalog-utils";

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const accessLabel = formatProjectAccess(project.currentUserRole);
  const debugRuleCount = formatDebugRuleCount(project.debugAllowedHosts.length);

  return (
    <Link
      className="group block overflow-hidden rounded-[2rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(245,247,250,0.82))] p-6 shadow-[0_24px_64px_rgba(15,23,42,0.10)] transition hover:-translate-y-1 hover:shadow-[0_32px_90px_rgba(15,23,42,0.14)]"
      href={`/console/projects/${project.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{project.projectKey}</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">{project.name}</h2>
        </div>
        <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-500 transition group-hover:border-slate-900 group-hover:text-slate-900">
          Open
        </span>
      </div>
      <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
        {project.description || "Structured API docs, grouped endpoints, and version snapshots in one workspace."}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Badge label={accessLabel} />
        <Badge label={project.canWrite ? "Writable" : "Read-only"} tone={project.canWrite ? "emerald" : "amber"} />
        <Badge label={project.canManageMembers ? "Can manage members" : "Member review"} />
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 rounded-[1.4rem] border border-slate-200/80 bg-white/70 px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Runtime posture</p>
          <p className="mt-1 text-sm text-slate-600">{debugRuleCount}</p>
        </div>
        <span className="text-sm font-medium text-slate-900 transition group-hover:translate-x-0.5">Enter workspace</span>
      </div>
    </Link>
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
