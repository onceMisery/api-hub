"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ProjectMemberDetail, UpsertProjectMemberPayload } from "@api-hub/api-sdk";
import { useEffect } from "react";

import { ProjectMembersPanel } from "./project-members-panel";

type ProjectAccessDrawerProps = {
  canManageMembers: boolean;
  canWrite: boolean;
  currentUserRole: string | null;
  isOpen: boolean;
  memberCount: number;
  members: ProjectMemberDetail[];
  onClose: () => void;
  onDeleteMember: (memberUserId: number) => Promise<void>;
  onSaveMember: (payload: UpsertProjectMemberPayload) => Promise<void>;
  projectAdminCount: number;
};

export function ProjectAccessDrawer({
  canManageMembers,
  canWrite,
  currentUserRole,
  isOpen,
  memberCount,
  members,
  onClose,
  onDeleteMember,
  onSaveMember,
  projectAdminCount
}: ProjectAccessDrawerProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.button
            aria-label="Close access drawer"
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            type="button"
          />
          <motion.aside
            aria-label="Project access"
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
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Project governance</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Project access</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                    {canManageMembers
                      ? "Adjust collaborators, preserve the owner seat, and keep the workbench roles clear."
                      : "Inspect the live roster and protected roles. Membership changes remain locked to project admins."}
                  </p>
                </div>
                <button
                  aria-label="Close access panel"
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  onClick={onClose}
                  type="button"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 rounded-[1.8rem] border border-slate-900/80 bg-[radial-gradient(circle_at_top_left,_rgba(226,232,240,0.18),_rgba(15,23,42,0.98)_58%)] p-5 text-white shadow-[0_18px_48px_rgba(15,23,42,0.24)]">
                <div className="flex flex-wrap items-center gap-2">
                  <SummaryBadge label={formatProjectAccess(currentUserRole)} />
                  <SummaryBadge label={canWrite ? "Writable" : "Read-only"} tone={canWrite ? "emerald" : "amber"} />
                  <SummaryBadge label={canManageMembers ? "Can manage members" : "Cannot manage members"} />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <DrawerMetric label="Members" value={String(memberCount)} />
                  <DrawerMetric label="Admins" value={String(projectAdminCount)} />
                  <DrawerMetric label="Workspace" value={canWrite ? "Edit" : "Review"} />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <ProjectMembersPanel
                canManageMembers={canManageMembers}
                members={members}
                onDeleteMember={onDeleteMember}
                onSaveMember={onSaveMember}
              />
            </div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

function SummaryBadge({
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

function DrawerMetric({ label, value }: { label: string; value: string }) {
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
