"use client";

import type { ProjectCatalogFilter } from "./project-catalog-utils";

type ProjectCatalogToolbarProps = {
  activeFilter: ProjectCatalogFilter;
  editableCount: number;
  manageCount: number;
  onCreate: () => void;
  onFilterChange: (filter: ProjectCatalogFilter) => void;
  onSearchChange: (value: string) => void;
  projectCount: number;
  reviewCount: number;
  searchQuery: string;
};

const FILTER_OPTIONS: Array<{ filter: ProjectCatalogFilter; label: string }> = [
  { filter: "all", label: "All" },
  { filter: "editable", label: "Editable" },
  { filter: "review", label: "Review only" },
  { filter: "manage", label: "Can manage" }
];

export function ProjectCatalogToolbar({
  activeFilter,
  editableCount,
  manageCount,
  onCreate,
  onFilterChange,
  onSearchChange,
  projectCount,
  reviewCount,
  searchQuery
}: ProjectCatalogToolbarProps) {
  return (
    <section className="overflow-hidden rounded-[2.5rem] border border-white/60 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.85),_rgba(244,239,228,0.92)_44%,_rgba(226,232,240,0.72)_100%)] p-6 shadow-[0_32px_90px_rgba(15,23,42,0.10)] backdrop-blur">
      <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Projects</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">Project command center</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Search your API workspaces, separate editable and review-only surfaces, and create the next project without leaving the console.
          </p>

          <label className="mt-6 block max-w-xl space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Search projects</span>
            <input
              aria-label="Search projects"
              className="w-full rounded-[1.6rem] border border-white/70 bg-white/85 px-4 py-3 text-sm text-slate-900 outline-none shadow-[0_12px_28px_rgba(15,23,42,0.05)] transition focus:border-slate-300"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search by project name, key, or description"
              value={searchQuery}
            />
          </label>

          <div className="mt-5 flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((option) => (
              <button
                aria-pressed={activeFilter === option.filter}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  activeFilter === option.filter
                    ? "border-slate-950 bg-slate-950 text-white shadow-[0_12px_28px_rgba(15,23,42,0.18)]"
                    : "border-white/80 bg-white/80 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                }`}
                key={option.filter}
                onClick={() => onFilterChange(option.filter)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 lg:w-[430px]">
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="Projects" value={projectCount} />
            <MetricCard label="Editable" value={editableCount} />
            <MetricCard label="Review" value={reviewCount} />
          </div>
          <div className="rounded-[1.8rem] border border-slate-900/85 bg-[radial-gradient(circle_at_top_left,_rgba(226,232,240,0.16),_rgba(15,23,42,0.97)_58%)] p-5 text-white shadow-[0_22px_60px_rgba(15,23,42,0.26)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">Create and route</p>
                <p className="mt-3 text-xl font-semibold tracking-tight">Open the next workspace in one move.</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {manageCount} project{manageCount === 1 ? "" : "s"} already let you manage collaborators. New workspaces start with you as project admin.
                </p>
              </div>
              <button
                className="shrink-0 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15"
                onClick={onCreate}
                type="button"
              >
                Create project
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.5rem] border border-white/70 bg-white/82 px-5 py-4 shadow-[0_18px_36px_rgba(15,23,42,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
