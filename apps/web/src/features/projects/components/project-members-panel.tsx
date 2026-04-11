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
  const [createDraft, setCreateDraft] = useState<UpsertProjectMemberPayload>({
    username: "",
    roleCode: "viewer"
  });

  return (
    <section className="rounded-[2rem] border border-white/60 bg-white/78 p-6 shadow-[0_24px_64px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Members</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-950">Project access</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">Manage project roles without leaving the workbench. Only project admins can change membership.</p>
      </div>

      <form
        className="space-y-3 rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-4"
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
          className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={!canManageMembers}
          type="submit"
        >
          Add project member
        </button>
      </form>

      <div className="mt-5 space-y-3">
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
            />
          ))
        )}
      </div>
    </section>
  );
}

function ProjectMemberCard({
  canManageMembers,
  member,
  onDeleteMember,
  onSaveMember
}: {
  canManageMembers: boolean;
  member: ProjectMemberDetail;
  onDeleteMember: (memberUserId: number) => Promise<void>;
  onSaveMember: (payload: UpsertProjectMemberPayload) => Promise<void>;
}) {
  const [roleCode, setRoleCode] = useState<UpsertProjectMemberPayload["roleCode"]>(member.roleCode);

  useEffect(() => {
    setRoleCode(member.roleCode);
  }, [member.roleCode]);

  return (
    <div className={`rounded-[1.6rem] border p-4 transition ${member.owner ? "border-slate-900 bg-slate-950 text-white" : "border-slate-200 bg-white"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={`text-sm font-semibold ${member.owner ? "text-white" : "text-slate-900"}`}>{member.displayName}</p>
          <p className={`mt-1 text-sm ${member.owner ? "text-slate-300" : "text-slate-500"}`}>@{member.username}</p>
          <p className={`mt-1 text-xs ${member.owner ? "text-slate-400" : "text-slate-400"}`}>{member.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {member.owner ? (
            <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${member.owner ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"}`}>
              Owner
            </span>
          ) : null}
          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${member.owner ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"}`}>
            {formatRoleLabel(member.roleCode)}
          </span>
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
          disabled={!canManageMembers}
          onClick={() => void onSaveMember({ username: member.username, roleCode })}
          type="button"
        >
          Save member
        </button>
        <button
          aria-label={`Delete member ${member.userId}`}
          className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${member.owner ? "border-rose-300/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20" : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"} disabled:cursor-not-allowed disabled:opacity-60`}
          disabled={!canManageMembers}
          onClick={() => void onDeleteMember(member.userId)}
          type="button"
        >
          Delete member
        </button>
      </div>
    </div>
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
