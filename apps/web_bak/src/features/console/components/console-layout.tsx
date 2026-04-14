"use client";

import Link from "next/link";
import { useMemo, useState, type ComponentProps, type ReactNode } from "react";

import { SessionBar } from "../../auth/components/session-bar";
import { useI18n } from "../../../lib/ui-preferences";

export type ConsoleView = "projects" | "workbench" | "browse" | "access" | "mock" | "share";

type ConsoleHref = ComponentProps<typeof Link>["href"];

type ConsoleLayoutProps = {
  activeView: ConsoleView;
  backHref?: string;
  children: ReactNode;
  project?: {
    id?: number | null;
    modules?: string[];
    name: string;
    subtitle?: string;
  };
  quickActions?: Array<{
    href?: string;
    label: string;
    onClick?: () => void;
    tone?: "primary" | "secondary";
  }>;
  search?: {
    label: string;
    onChange: (value: string) => void;
    placeholder: string;
    value: string;
  };
};

type NavigationItem = {
  disabled?: boolean;
  href?: string;
  id: ConsoleView;
  label: string;
};

export function ConsoleLayout({
  activeView,
  backHref,
  children,
  project,
  quickActions = [],
  search
}: ConsoleLayoutProps) {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const navigationItems = useMemo<NavigationItem[]>(
    () => [
      {
        href: "/console/projects",
        id: "projects",
        label: t("catalog.title")
      },
      {
        disabled: !project?.id,
        href: project?.id ? `/console/projects/${project.id}` : undefined,
        id: "workbench",
        label: t("workbench.tab.overview")
      },
      {
        disabled: !project?.id,
        href: project?.id ? `/console/projects/${project.id}/browse` : undefined,
        id: "browse",
        label: t("workbench.action.browseDocs")
      },
      {
        disabled: !project?.id,
        href: project?.id ? `/console/projects/${project.id}/access` : undefined,
        id: "access",
        label: t("workbench.action.accessCenter")
      },
      {
        disabled: !project?.id,
        href: project?.id ? `/console/projects/${project.id}/mock-center` : undefined,
        id: "mock",
        label: t("workbench.action.mockCenter")
      },
      {
        disabled: !project?.id,
        href: project?.id ? `/console/projects/${project.id}/share` : undefined,
        id: "share",
        label: t("workbench.action.shareDocs")
      }
    ],
    [project?.id, t]
  );
  const visibleModules = project?.modules?.filter(Boolean).slice(0, 4) ?? [];

  return (
    <div className="console-shell flex min-h-screen">
      <aside
        className={`console-sidebar scrollbar-thin sticky top-0 flex h-screen shrink-0 flex-col transition-[width] duration-300 ${
          collapsed ? "w-[78px]" : "w-[236px]"
        }`}
      >
        <div className="flex h-14 items-center gap-3 border-b border-[var(--console-border)] px-4">
          <div className="gradient-bg shadow-glow flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white">
            A
          </div>
          {!collapsed ? <span className="text-sm font-semibold tracking-[0.02em] text-[var(--console-text)]">ApiHub</span> : null}
        </div>

        {project?.id && !collapsed ? (
          <div className="border-b border-[var(--console-border)] px-3 py-3">
            <div className="rounded-2xl border border-[var(--console-border)] bg-white/45 px-3 py-3 dark:bg-white/5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--console-muted)]">
                {t("workbench.heroEyebrow")}
              </p>
              <h2 className="mt-2 truncate text-sm font-semibold text-[var(--console-text)]">{project.name}</h2>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--console-muted)]">
                {project.subtitle ?? t("catalog.subtitle")}
              </p>
              {visibleModules.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {visibleModules.map((moduleName) => (
                    <span
                      className="rounded-full border border-[var(--console-border)] px-2 py-1 text-[11px] text-[var(--console-muted)]"
                      key={moduleName}
                    >
                      {moduleName}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-2 py-3">
          {navigationItems.map((item) => (
            <NavigationItemView
              active={item.id === activeView}
              collapsed={collapsed}
              disabled={item.disabled}
              href={item.href}
              key={item.id}
              label={item.label}
              view={item.id}
            />
          ))}
        </nav>

        <div className="border-t border-[var(--console-border)] px-2 py-3">
          <button
            aria-label={collapsed ? t("session.themeLight") : t("session.themeDark")}
            className="console-ghost-button flex w-full items-center justify-center rounded-xl px-3 py-2.5 text-sm font-medium"
            onClick={() => setCollapsed((value) => !value)}
            type="button"
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="console-topbar sticky top-0 z-30 px-4 py-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
              {backHref ? (
                <Link
                  className="console-ghost-button inline-flex w-fit items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium"
                  href={toConsoleHref(backHref)}
                >
                  <ChevronLeftIcon />
                  <span>{t("session.backToProjects")}</span>
                </Link>
              ) : null}
              {search ? (
                <label className="relative block min-w-0 flex-1">
                  <span className="sr-only">{search.label}</span>
                  <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--console-muted)]" />
                  <input
                    aria-label={search.label}
                    className="console-input h-11 w-full rounded-xl py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[var(--app-accent-border)]"
                    onChange={(event) => search.onChange(event.target.value)}
                    placeholder={search.placeholder}
                    value={search.value}
                  />
                </label>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {quickActions.map((action) =>
                action.href ? (
                  <Link
                    className={buildQuickActionClassName(action.tone)}
                    href={toConsoleHref(action.href)}
                    key={`${action.label}-${action.href}`}
                  >
                    {action.label}
                  </Link>
                ) : (
                  <button
                    className={buildQuickActionClassName(action.tone)}
                    key={action.label}
                    onClick={action.onClick}
                    type="button"
                  >
                    {action.label}
                  </button>
                )
              )}
              <SessionBar variant="toolbar" />
            </div>
          </div>
        </header>

        <main className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5">{children}</main>
      </div>
    </div>
  );
}

function NavigationItemView({
  active,
  collapsed,
  disabled,
  href,
  label,
  view
}: {
  active: boolean;
  collapsed: boolean;
  disabled?: boolean;
  href?: string;
  label: string;
  view: ConsoleView;
}) {
  const content = (
    <>
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
          active ? "gradient-bg text-white shadow-glow" : "bg-white/70 text-[var(--console-muted)] dark:bg-white/5"
        }`}
      >
        <NavigationIcon view={view} />
      </span>
      {!collapsed ? <span className="truncate text-sm font-medium">{label}</span> : null}
    </>
  );

  const className = `group flex w-full items-center gap-3 rounded-[1.35rem] px-3 py-2.5 text-left transition-fast ${
    active
      ? "bg-[var(--app-accent-active-surface)] text-[var(--console-text)]"
      : "text-[var(--console-muted)] hover:bg-white/45 hover:text-[var(--console-text)] dark:hover:bg-white/5"
  } ${disabled ? "cursor-not-allowed opacity-45" : ""}`;

  if (!href || disabled) {
    return (
      <div aria-disabled="true" className={className}>
        {content}
      </div>
    );
  }

  return (
    <Link className={className} href={toConsoleHref(href)}>
      {content}
    </Link>
  );
}

function toConsoleHref(value: string): ConsoleHref {
  return value as ConsoleHref;
}

function buildQuickActionClassName(tone: "primary" | "secondary" | undefined) {
  if (tone === "primary") {
    return "gradient-bg inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition-fast hover:opacity-90";
  }

  return "console-ghost-button inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-medium";
}

function NavigationIcon({ view }: { view: ConsoleView }) {
  switch (view) {
    case "projects":
      return <FolderIcon />;
    case "workbench":
      return <DashboardIcon />;
    case "browse":
      return <DocumentIcon />;
    case "access":
      return <ShieldIcon />;
    case "mock":
      return <SparkIcon />;
    case "share":
      return <ShareIcon />;
    default:
      return <DashboardIcon />;
  }
}

function DashboardIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M4 5h7v6H4V5Zm9 0h7v10h-7V5ZM4 13h7v6H4v-6Zm9 4h7v2h-7v-2Z" fill="currentColor" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M3.75 7.5A2.25 2.25 0 0 1 6 5.25h4.188c.597 0 1.169.237 1.59.66l.562.562c.14.14.33.218.528.218H18A2.25 2.25 0 0 1 20.25 9v8.25A2.25 2.25 0 0 1 18 19.5H6a2.25 2.25 0 0 1-2.25-2.25V7.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M7.5 3.75h6.44c.398 0 .779.158 1.06.44l2.81 2.81c.282.28.44.661.44 1.06v9.69a2.25 2.25 0 0 1-2.25 2.25h-8.5a2.25 2.25 0 0 1-2.25-2.25v-11.5A2.25 2.25 0 0 1 7.5 3.75Zm2.25 6.5h4.5v1.5h-4.5v-1.5Zm0 3.5h4.5v1.5h-4.5v-1.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="m12 3 2.06 5.94L20 11l-5.94 2.06L12 19l-2.06-5.94L4 11l5.94-2.06L12 3Z" fill="currentColor" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 3.75 5.25 6v5.31c0 4.37 2.83 8.23 6.75 9.44 3.92-1.21 6.75-5.07 6.75-9.44V6L12 3.75Zm0 4.12a2.625 2.625 0 1 1 0 5.25 2.625 2.625 0 0 1 0-5.25Zm0 9.47c-1.51 0-2.89-.56-3.95-1.49.4-1.56 1.82-2.72 3.51-2.72h.88c1.69 0 3.11 1.16 3.51 2.72A5.938 5.938 0 0 1 12 17.34Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M15.75 6.75a3 3 0 1 0-2.917-3.75H12.75a3 3 0 0 0 .083.75L8.34 6.144a3 3 0 1 0 0 5.712l4.493 2.394a3 3 0 1 0 .707-1.322l-4.493-2.394a3.011 3.011 0 0 0 0-1.068l4.493-2.394c.55.49 1.275.787 2.07.787Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M10.5 4.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm0 0 9 9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="m14.25 6.75-5.25 5.25 5.25 5.25" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="m9.75 6.75 5.25 5.25-5.25 5.25" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}
