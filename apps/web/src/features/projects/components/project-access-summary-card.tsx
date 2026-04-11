"use client";

type ProjectAccessSummaryCardProps = {
  canManageMembers: boolean;
  canWrite: boolean;
  currentUserRole: string | null;
  memberCount: number;
  onOpen: () => void;
  projectAdminCount: number;
};

export function ProjectAccessSummaryCard({
  canManageMembers,
  canWrite,
  currentUserRole,
  memberCount,
  onOpen,
  projectAdminCount
}: ProjectAccessSummaryCardProps) {
  return (
    <section className="overflow-hidden rounded-[1.9rem] border border-slate-900/80 bg-[radial-gradient(circle_at_top_left,_rgba(226,232,240,0.16),_rgba(15,23,42,0.97)_58%)] p-5 text-white shadow-[0_22px_60px_rgba(15,23,42,0.26)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">Access &amp; Roles</p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight">Keep collaborators aligned with the workspace.</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
            {canManageMembers
              ? "Project admins can rebalance roles, protect the owner seat, and keep editing ownership clean."
              : "Review the current roster and protected roles without adding another full settings page."}
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
            canManageMembers
              ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
              : "border-amber-300/30 bg-amber-400/10 text-amber-100"
          }`}
        >
          {canManageMembers ? "Admin controls" : "Review only"}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <AccessBadge label={formatProjectAccess(currentUserRole)} />
        <AccessBadge
          label={canWrite ? "Writable workspace" : "Read-only workspace"}
          tone={canWrite ? "emerald" : "amber"}
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <SummaryMetric label="Members" value={String(memberCount)} />
        <SummaryMetric label="Admins" value={String(projectAdminCount)} />
        <SummaryMetric label="Mode" value={canManageMembers ? "Editable" : "Review"} />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-sm leading-6 text-slate-300">
          Open the drawer to inspect the full roster, see protected seats, and manage access without crowding the main workbench.
        </p>
        <button
          aria-label="Manage access"
          className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15"
          onClick={onOpen}
          type="button"
        >
          Manage access
        </button>
      </div>
    </section>
  );
}

function AccessBadge({
  label,
  tone = "slate"
}: {
  label: string;
  tone?: "slate" | "emerald" | "amber";
}) {
  if (tone === "emerald") {
    return (
      <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100">
        {label}
      </span>
    );
  }

  if (tone === "amber") {
    return (
      <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-100">
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

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.3rem] border border-white/10 bg-white/10 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function formatProjectAccess(role: string | null | undefined) {
  switch (role) {
    case "project_admin":
      return "Project admin access";
    case "editor":
      return "Editor access";
    case "tester":
      return "Tester access";
    case "viewer":
      return "Viewer access";
    default:
      return "Project access";
  }
}
