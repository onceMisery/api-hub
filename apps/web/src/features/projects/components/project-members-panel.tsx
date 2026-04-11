"use client";

import type { ProjectMemberDetail, UpsertProjectMemberPayload } from "@api-hub/api-sdk";
import { useEffect, useState } from "react";

type ProjectMembersPanelProps = {
  canManageMembers: boolean;
  members: ProjectMemberDetail[];
  onDeleteMember: (memberUserId: number) => Promise<void>;
  onSaveMember: (payload: UpsertProjectMemberPayload) => Promise<void>;
};

const ROLE_OPTIONS: UpsertProjectMemberPayload["roleCode"][] = ["project_admin", "editor", "tester", "viewer"];

export function ProjectMembersPanel({
  canManageMembers,
  members,
  onDeleteMember,
  onSaveMember
}: ProjectMembersPanelProps) {
  const projectAdminCount = members.filter((member) => member.owner || member.roleCode === "project_admin").length;
  const [createDraft, setCreateDraft] = useState<UpsertProjectMemberPayload>({
    username: "",
    roleCode: "viewer"
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Members</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">Collaborators</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Review who can shape the API workspace, keep the owner seat protected, and make role changes without leaving the console.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard label="Members" value={String(members.length)} />
          <MetricCard label="Admins" value={String(projectAdminCount)} />
        </div>
      </div>

      <div
        className={`rounded-[1.5rem] border px-4 py-3 text-sm ${
          canManageMembers ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        {canManageMembers
          ? "Project admins can add collaborators, rebalance roles, and keep at least one admin seat protected."
          : "You can review project access, but only project admins can change membership."}
      </div>

      <form
        className="grid gap-3 rounded-[1.6rem] border border-white/70 bg-white/82 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canManageMembers || !createDraft.username.trim()) {
            return;
          }

          void onSaveMember({
            username: createDraft.username.trim(),
            roleCode: createDraft.roleCode
          }).then(() => setCreateDraft({ username: "", roleCode: "viewer" }));
        }}
      >
        <Field label="Project member username">
          <input
            aria-label="Project member username"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
            disabled={!canManageMembers}
            onChange={(event) => setCreateDraft((current) => ({ ...current, username: event.target.value }))}
            placeholder="viewer"
            value={createDraft.username}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Field label="Project member role">
            <select
              aria-label="Project member role"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
              disabled={!canManageMembers}
              onChange={(event) =>
                setCreateDraft((current) => ({
                  ...current,
                  roleCode: event.target.value as UpsertProjectMemberPayload["roleCode"]
                }))
              }
              value={createDraft.roleCode}
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {formatRoleLabel(role)}
                </option>
              ))}
            </select>
          </Field>
          <button
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:self-end"
            disabled={!canManageMembers}
            type="submit"
          >
            Add project member
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {members.length === 0 ? (
          <div className="rounded-[1.6rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500">
            No project members yet.
          </div>
        ) : (
          members.map((member) => (
            <ProjectMemberCard
              canManageMembers={canManageMembers}
              key={member.userId}
              member={member}
              onDeleteMember={onDeleteMember}
              onSaveMember={onSaveMember}
              projectAdminCount={projectAdminCount}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ProjectMemberCard({
  canManageMembers,
  member,
  onDeleteMember,
  onSaveMember,
  projectAdminCount
}: {
  canManageMembers: boolean;
  member: ProjectMemberDetail;
  onDeleteMember: (memberUserId: number) => Promise<void>;
  onSaveMember: (payload: UpsertProjectMemberPayload) => Promise<void>;
  projectAdminCount: number;
}) {
  const [roleCode, setRoleCode] = useState<UpsertProjectMemberPayload["roleCode"]>(member.roleCode);

  useEffect(() => {
    setRoleCode(member.roleCode);
  }, [member.roleCode]);

  const isProtectedOwner = member.owner;
  const isAdminSeat = member.owner || member.roleCode === "project_admin";
  const isLastAdminSeat = isAdminSeat && projectAdminCount <= 1;
  const roleChangeBlocked = isProtectedOwner
    ? roleCode !== "project_admin"
    : isLastAdminSeat && roleCode !== "project_admin";
  const deleteBlocked = isProtectedOwner || (member.roleCode === "project_admin" && projectAdminCount <= 1);

  return (
    <article
      className={`rounded-[1.6rem] border p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition ${
        member.owner ? "border-slate-900 bg-slate-950 text-white" : "border-slate-200/80 bg-white/90"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className={`text-sm font-semibold ${member.owner ? "text-white" : "text-slate-950"}`}>{member.displayName}</p>
            {member.owner ? (
              <span className="rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">Owner</span>
            ) : null}
            <RoleBadge roleCode={member.roleCode} owner={member.owner} />
          </div>
          <p className={`mt-2 text-sm ${member.owner ? "text-slate-300" : "text-slate-500"}`}>@{member.username}</p>
          <p className={`mt-1 text-xs ${member.owner ? "text-slate-400" : "text-slate-400"}`}>{member.email}</p>
        </div>
        <div
          className={`rounded-[1.2rem] border px-3 py-2 text-right text-xs ${
            member.owner ? "border-white/12 bg-white/8 text-slate-200" : "border-slate-200 bg-slate-50 text-slate-500"
          }`}
        >
          <p className="font-semibold uppercase tracking-[0.16em]">{member.owner ? "Protected seat" : "Role assignment"}</p>
          <p className={`mt-1 leading-5 ${member.owner ? "text-slate-300" : "text-slate-500"}`}>
            {member.owner ? "Project owner" : formatRoleLabel(member.roleCode)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <label className="block space-y-2">
          <span className={`text-sm font-medium ${member.owner ? "text-slate-200" : "text-slate-700"}`}>{`Member ${member.userId} role`}</span>
          <select
            aria-label={`Member ${member.userId} role`}
            className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${member.owner ? "border-white/15 bg-white/10 text-white focus:border-white/30" : "border-slate-200 bg-slate-50 text-slate-700 focus:border-slate-400"} disabled:cursor-not-allowed disabled:opacity-60`}
            disabled={!canManageMembers}
            onChange={(event) => setRoleCode(event.target.value as UpsertProjectMemberPayload["roleCode"])}
            value={roleCode}
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {formatRoleLabel(role)}
              </option>
            ))}
          </select>
        </label>
        <button
          aria-label={`Save member ${member.userId}`}
          className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${member.owner ? "border-white/15 bg-white/10 text-white hover:bg-white/15" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"} disabled:cursor-not-allowed disabled:opacity-60`}
          disabled={!canManageMembers || roleChangeBlocked}
          onClick={() => void onSaveMember({ username: member.username, roleCode })}
          type="button"
        >
          Save member
        </button>
        <button
          aria-label={`Delete member ${member.userId}`}
          className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${member.owner ? "border-rose-300/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20" : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"} disabled:cursor-not-allowed disabled:opacity-60`}
          disabled={!canManageMembers || deleteBlocked}
          onClick={() => void onDeleteMember(member.userId)}
          type="button"
        >
          Delete member
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {isProtectedOwner ? (
          <span className={`rounded-full px-3 py-1 ${member.owner ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-600"}`}>
            Project owner
          </span>
        ) : null}
        {roleChangeBlocked ? (
          <span className={`rounded-full px-3 py-1 ${member.owner ? "bg-amber-400/10 text-amber-100" : "bg-amber-100 text-amber-800"}`}>
            Keep at least one project admin assigned before changing this role.
          </span>
        ) : null}
        {!canManageMembers ? (
          <span className={`rounded-full px-3 py-1 ${member.owner ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-600"}`}>
            Read-only for your role
          </span>
        ) : null}
      </div>
    </article>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.3rem] border border-slate-200 bg-white/80 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function RoleBadge({
  owner,
  roleCode
}: {
  owner: boolean;
  roleCode: UpsertProjectMemberPayload["roleCode"];
}) {
  if (owner) {
    return (
      <span className="rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
        {formatRoleLabel(roleCode)}
      </span>
    );
  }

  if (roleCode === "project_admin") {
    return (
      <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
        {formatRoleLabel(roleCode)}
      </span>
    );
  }

  if (roleCode === "editor") {
    return (
      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-800">
        {formatRoleLabel(roleCode)}
      </span>
    );
  }

  if (roleCode === "tester") {
    return (
      <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-800">
        {formatRoleLabel(roleCode)}
      </span>
    );
  }

  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
      {formatRoleLabel(roleCode)}
    </span>
  );
}

function formatRoleLabel(roleCode: UpsertProjectMemberPayload["roleCode"]) {
  switch (roleCode) {
    case "project_admin":
      return "Project admin";
    case "editor":
      return "Editor";
    case "tester":
      return "Tester";
    case "viewer":
      return "Viewer";
    default:
      return roleCode;
  }
}
