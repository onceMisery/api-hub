import Link from "next/link";

import type { ProjectSummary } from "@api-hub/api-sdk";

export function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <Link
      className="group block rounded-[2rem] border border-white/60 bg-white/70 p-6 shadow-[0_24px_64px_rgba(15,23,42,0.10)] transition hover:-translate-y-1 hover:shadow-[0_28px_84px_rgba(15,23,42,0.14)]"
      href={`/console/projects/${project.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{project.projectKey}</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">{project.name}</h2>
        </div>
        <span className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 transition group-hover:border-slate-900 group-hover:text-slate-900">
          Open
        </span>
      </div>
      <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
        {project.description || "Structured API docs, grouped endpoints, and version snapshots in one workspace."}
      </p>
    </Link>
  );
}
