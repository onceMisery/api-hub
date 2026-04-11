# Project Access Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move project-member management behind a polished `Access & Roles` summary card and right-side drawer while preserving the existing project-member backend contract.

**Architecture:** Keep all access mutations in `ProjectShell`, add a dedicated summary-card entry point in the hero region, and render a drawer shell that hosts a refined `ProjectMembersPanel`. Use focused UI-only protections for owner and last-admin edge cases based on the current loaded roster.

**Tech Stack:** `Next.js 15`, `React 19`, `TypeScript`, `Vitest`, `Testing Library`, `Tailwind CSS`, `framer-motion`

---

### Task 1: Add failing integration coverage for the new entry point and drawer flow

**Files:**
- Modify: `apps/web/src/features/projects/components/project-shell.test.tsx`

- [ ] **Step 1: Add a failing test that opens the access drawer from the header card**

```tsx
it("opens the access drawer from the summary card and hides inline member controls by default", async () => {
  render(<ProjectShell projectId={1} />);

  expect(await screen.findByText("Access & Roles")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Add project member" })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Manage access" }));

  expect(await screen.findByRole("dialog", { name: "Project access" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add project member" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Add a failing read-only integration test for viewer members**

```tsx
it("lets viewer members inspect the drawer in read-only mode", async () => {
  fetchProject.mockResolvedValueOnce({
    data: {
      id: 1,
      name: "Default Project",
      projectKey: "default",
      description: "Seed project",
      debugAllowedHosts: [],
      currentUserRole: "viewer",
      canWrite: false,
      canManageMembers: false
    }
  });

  render(<ProjectShell projectId={1} />);

  expect(await screen.findByText("Viewer access")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Manage access" }));

  expect(await screen.findByText("You can review project access, but only project admins can change membership.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add project member" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Save member 1" })).toBeDisabled();
});
```

- [ ] **Step 3: Run the focused shell test and confirm it fails**

Run: `pnpm --filter web test -- src/features/projects/components/project-shell.test.tsx`

Expected: FAIL because the shell still renders inline member controls and has no summary-card/drawer flow.

### Task 2: Add failing component coverage for protected member states

**Files:**
- Modify: `apps/web/src/features/projects/components/project-members-panel.test.tsx`

- [ ] **Step 1: Add a failing test for owner protection**

```tsx
it("keeps the owner row protected from deletion", () => {
  render(
    <ProjectMembersPanel
      canManageMembers
      members={[
        {
          userId: 1,
          username: "admin",
          displayName: "Administrator",
          email: "admin@local.dev",
          roleCode: "project_admin",
          owner: true
        }
      ]}
      onDeleteMember={vi.fn()}
      onSaveMember={vi.fn()}
    />
  );

  expect(screen.getByRole("button", { name: "Delete member 1" })).toBeDisabled();
  expect(screen.getByText("Project owner")).toBeInTheDocument();
});
```

- [ ] **Step 2: Add a failing test for last-admin demotion protection**

```tsx
it("disables saving when the last project admin is being demoted", () => {
  render(
    <ProjectMembersPanel
      canManageMembers
      members={[
        {
          userId: 1,
          username: "admin",
          displayName: "Administrator",
          email: "admin@local.dev",
          roleCode: "project_admin",
          owner: true
        },
        {
          userId: 2,
          username: "viewer",
          displayName: "Viewer User",
          email: "viewer@local.dev",
          roleCode: "viewer",
          owner: false
        }
      ]}
      onDeleteMember={vi.fn()}
      onSaveMember={vi.fn()}
    />
  );

  fireEvent.change(screen.getByLabelText("Member 1 role"), { target: { value: "viewer" } });

  expect(screen.getByRole("button", { name: "Save member 1" })).toBeDisabled();
  expect(screen.getByText("Keep at least one project admin assigned before changing this role.")).toBeInTheDocument();
});
```

- [ ] **Step 3: Keep the read-only test but update it to expect explicit explanation copy**

```tsx
expect(screen.getByText("You can review project access, but only project admins can change membership.")).toBeInTheDocument();
```

- [ ] **Step 4: Run the focused members-panel test and confirm it fails**

Run: `pnpm --filter web test -- src/features/projects/components/project-members-panel.test.tsx`

Expected: FAIL because the current panel has no protected-member messaging and no last-admin UI guard.

### Task 3: Implement the summary card and drawer shell

**Files:**
- Create: `apps/web/src/features/projects/components/project-access-summary-card.tsx`
- Create: `apps/web/src/features/projects/components/project-access-drawer.tsx`
- Modify: `apps/web/src/features/projects/components/project-shell.tsx`
- Test: `apps/web/src/features/projects/components/project-shell.test.tsx`

- [ ] **Step 1: Add the new summary-card component**

```tsx
export function ProjectAccessSummaryCard({
  canManageMembers,
  canWrite,
  currentUserRole,
  memberCount,
  onOpen,
  projectAdminCount
}: {
  canManageMembers: boolean;
  canWrite: boolean;
  currentUserRole: string | null;
  memberCount: number;
  onOpen: () => void;
  projectAdminCount: number;
}) {
  return (
    <button
      className="group w-full rounded-[1.8rem] border border-slate-900/80 bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.2),_rgba(15,23,42,0.96)_58%)] p-5 text-left text-white shadow-[0_22px_48px_rgba(15,23,42,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_72px_rgba(15,23,42,0.34)]"
      onClick={onOpen}
      type="button"
    >
      {/* summary layout */}
    </button>
  );
}
```

- [ ] **Step 2: Add the new drawer shell component**

```tsx
export function ProjectAccessDrawer({ isOpen, onClose, ...props }: ProjectAccessDrawerProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button aria-label="Close access drawer" className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={onClose} type="button" />
      <aside aria-label="Project access" aria-modal="true" className="relative h-full w-full max-w-[560px] overflow-y-auto border-l border-white/40 bg-[#f6f4ef]/95 p-6 shadow-[-24px_0_80px_rgba(15,23,42,0.24)]" role="dialog">
        {/* header + summary + ProjectMembersPanel */}
      </aside>
    </div>
  );
}
```

- [ ] **Step 3: Wire the new access flow into `ProjectShell`**

```tsx
const [isAccessDrawerOpen, setIsAccessDrawerOpen] = useState(false);
const projectAdminCount = useMemo(
  () => projectMembers.filter((member) => member.owner || member.roleCode === "project_admin").length,
  [projectMembers]
);
```

```tsx
<div className="grid gap-3 lg:w-[430px]">
  <div className="grid gap-3 sm:grid-cols-3">
    <StatCard ... />
  </div>
  <ProjectAccessSummaryCard
    canManageMembers={canManageMembers}
    canWrite={canWrite}
    currentUserRole={project?.currentUserRole ?? null}
    memberCount={projectMembers.length}
    onOpen={() => setIsAccessDrawerOpen(true)}
    projectAdminCount={projectAdminCount}
  />
</div>
```

```tsx
<ProjectAccessDrawer
  canManageMembers={canManageMembers}
  canWrite={canWrite}
  currentUserRole={project?.currentUserRole ?? null}
  isOpen={isAccessDrawerOpen}
  memberCount={projectMembers.length}
  members={projectMembers}
  onClose={() => setIsAccessDrawerOpen(false)}
  onDeleteMember={handleDeleteProjectMember}
  onSaveMember={handleSaveProjectMember}
  projectAdminCount={projectAdminCount}
/>
```

- [ ] **Step 4: Re-run the shell test and confirm the drawer flow passes**

Run: `pnpm --filter web test -- src/features/projects/components/project-shell.test.tsx`

Expected: PASS

### Task 4: Refine the member-management body for drawer use

**Files:**
- Modify: `apps/web/src/features/projects/components/project-members-panel.tsx`
- Modify: `apps/web/src/features/projects/components/project-members-panel.test.tsx`

- [ ] **Step 1: Add protected-member derived state**

```tsx
const projectAdminCount = members.filter((member) => member.owner || member.roleCode === "project_admin").length;
```

```tsx
const isProtectedOwner = member.owner;
const isLastAdmin = (member.owner || member.roleCode === "project_admin") && projectAdminCount <= 1;
const roleChangeBlocked = isLastAdmin && roleCode !== "project_admin";
```

- [ ] **Step 2: Add the read-only explainer and refined add-member composer**

```tsx
{!canManageMembers ? (
  <div className="rounded-[1.4rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
    You can review project access, but only project admins can change membership.
  </div>
) : (
  <div className="rounded-[1.6rem] border border-white/70 bg-white/80 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
    {/* username + role + add button */}
  </div>
)}
```

- [ ] **Step 3: Refine member cards and disable invalid actions**

```tsx
<button
  aria-label={`Save member ${member.userId}`}
  disabled={!canManageMembers || roleChangeBlocked}
  type="button"
>
  Save member
</button>

<button
  aria-label={`Delete member ${member.userId}`}
  disabled={!canManageMembers || isProtectedOwner}
  type="button"
>
  Delete member
</button>
```

```tsx
{isProtectedOwner ? <p className="text-xs text-slate-500">Project owner</p> : null}
{roleChangeBlocked ? <p className="text-xs text-amber-700">Keep at least one project admin assigned before changing this role.</p> : null}
```

- [ ] **Step 4: Re-run the focused members-panel test and confirm it passes**

Run: `pnpm --filter web test -- src/features/projects/components/project-members-panel.test.tsx`

Expected: PASS

### Task 5: Final verification and cleanup

**Files:**
- Modify: `docs/superpowers/specs/2026-04-11-project-access-drawer-design.md`
- Modify: `docs/superpowers/plans/2026-04-11-project-access-drawer.md`
- Verify: `apps/web/src/features/projects/components/project-shell.tsx`
- Verify: `apps/web/src/features/projects/components/project-access-summary-card.tsx`
- Verify: `apps/web/src/features/projects/components/project-access-drawer.tsx`
- Verify: `apps/web/src/features/projects/components/project-members-panel.tsx`

- [ ] **Step 1: Run the affected frontend tests together**

Run: `pnpm --filter web test -- src/features/projects/components/project-shell.test.tsx src/features/projects/components/project-members-panel.test.tsx`

Expected: PASS

- [ ] **Step 2: Run the production build**

Run: `pnpm --filter web build`

Expected: PASS

- [ ] **Step 3: Check the diff surface**

Run: `git status --short`

Expected: only the access-drawer code changes plus the new spec/plan docs are present, alongside any pre-existing user docs already in the worktree.

- [ ] **Step 4: Commit the completed feature**

```bash
git add apps/web/src/features/projects/components/project-shell.tsx apps/web/src/features/projects/components/project-access-summary-card.tsx apps/web/src/features/projects/components/project-access-drawer.tsx apps/web/src/features/projects/components/project-members-panel.tsx apps/web/src/features/projects/components/project-shell.test.tsx apps/web/src/features/projects/components/project-members-panel.test.tsx docs/superpowers/specs/2026-04-11-project-access-drawer-design.md docs/superpowers/plans/2026-04-11-project-access-drawer.md
git commit -m "feat: add project access drawer"
```
