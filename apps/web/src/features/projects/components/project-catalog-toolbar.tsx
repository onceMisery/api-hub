"use client";

import { useI18n } from "../../../lib/ui-preferences";
import type { ProjectCatalogFilter, ProjectCatalogGroup } from "./project-catalog-utils";

type ProjectCatalogToolbarProps = {
  activeFilter: ProjectCatalogFilter;
  editableCount: number;
  groups: ProjectCatalogGroup[];
  manageCount: number;
  onCreate: () => void;
  onFilterChange: (filter: ProjectCatalogFilter) => void;
  onSearchChange: (value: string) => void;
  projectCount: number;
  reviewCount: number;
  searchQuery: string;
};

export function ProjectCatalogToolbar({
  activeFilter,
  editableCount,
  groups,
  manageCount,
  onCreate,
  onFilterChange,
  onSearchChange,
  projectCount,
  reviewCount,
  searchQuery
}: ProjectCatalogToolbarProps) {
  const { t } = useI18n();

  return (
    <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-[2rem] border border-slate-900/80 bg-[linear-gradient(180deg,#1f1f22_0%,#0b0b0d_100%)] p-4 text-white shadow-[0_28px_80px_rgba(15,23,42,0.28)]">
        <div className="rounded-[1.4rem] bg-white/8 p-3">
          <div className="flex items-center justify-between gap-3 rounded-[1rem] bg-white/8 px-4 py-3">
            <span className="text-lg font-semibold">{t("catalog.title")}</span>
            <span className="text-sm text-slate-300">Dynamic</span>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {groups.map((group) => (
            <button
              aria-pressed={activeFilter === group.filter}
              className={`flex w-full items-center justify-between gap-4 rounded-[1.2rem] px-4 py-4 text-left transition ${
                activeFilter === group.filter ? "bg-white/12 text-white" : "bg-transparent text-slate-200 hover:bg-white/8"
              }`}
              key={group.filter}
              onClick={() => onFilterChange(group.filter)}
              type="button"
            >
              <div>
                <p className="text-base font-semibold">{group.label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">{group.description}</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold text-slate-300">
                {group.count}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4 border-t border-white/10 pt-4">
          <button
            className="flex w-full items-center justify-between rounded-[1.2rem] px-4 py-4 text-left text-slate-200 transition hover:bg-white/8"
            onClick={onCreate}
            type="button"
          >
            <span className="text-base font-semibold">{t("catalog.createProject")}</span>
            <span className="text-xl leading-none text-slate-400">+</span>
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="app-shell-card rounded-[2rem] p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{t("catalog.heading")}</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">{t("catalog.subtitle")}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Start from a project group, then move into the exact workspace you want to edit, review, or govern.
              </p>
            </div>
            <button
              className="app-button-primary rounded-2xl px-5 py-3 text-sm font-semibold transition hover:opacity-90"
              onClick={onCreate}
              type="button"
            >
              {t("catalog.createProject")}
            </button>
          </div>

          <label className="mt-6 block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{t("catalog.search")}</span>
            <input
              aria-label={t("catalog.search")}
              className="app-input w-full rounded-[1.6rem] px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t("catalog.searchPlaceholder")}
              value={searchQuery}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <MetricCard label={t("catalog.group.all")} value={projectCount} />
          <MetricCard label={t("catalog.group.manage")} value={manageCount} />
          <MetricCard label={t("catalog.group.editable")} value={editableCount} />
          <MetricCard label={t("catalog.group.review")} value={reviewCount} />
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="app-shell-card-strong rounded-[1.5rem] px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
