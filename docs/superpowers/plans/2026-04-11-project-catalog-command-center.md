# Project Catalog Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `/console/projects` into a richer command center with search, access filters, and a polished frontend create-project flow.

**Architecture:** Keep backend contracts unchanged. Extend the API SDK to expose the actual list-project access fields and add a create-project helper, then build a frontend-only command-center layer composed of a toolbar, create drawer, richer cards, and small catalog utilities.

**Tech Stack:** `Next.js 15`, `React 19`, `TypeScript`, `Vitest`, `Testing Library`, `Tailwind CSS`, `framer-motion`

---

### Task 1: Add failing tests for the upgraded catalog flow

**Files:**
- Create: `apps/web/src/app/console/projects/page.test.tsx`
- Create: `apps/web/src/features/projects/components/project-card.test.tsx`

- [ ] **Step 1: Write a failing page test for search and access filtering**

```tsx
it("filters the project catalog by search text and access mode", async () => {
  fetchProjects.mockResolvedValue({
    data: [
      {
        id: 1,
        name: "Default Project",
        projectKey: "default",
        description: "Seed workspace",
        debugAllowedHosts: [],
        currentUserRole: "project_admin",
        canWrite: true,
        canManageMembers: true
      },
      {
        id: 2,
        name: "Docs Review",
        projectKey: "review",
        description: "Review-only workspace",
        debugAllowedHosts: [],
        currentUserRole: "viewer",
        canWrite: false,
        canManageMembers: false
      }
    ]
  });

  render(<ProjectsPage />);

  expect(await screen.findByText("Default Project")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Search projects"), { target: { value: "review" } });
  expect(screen.queryByText("Default Project")).not.toBeInTheDocument();
  expect(screen.getByText("Docs Review")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Editable" }));
  expect(screen.queryByText("Docs Review")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Write a failing page test for project creation**

```tsx
it("creates a project from the drawer and routes into the workspace", async () => {
  createProject.mockResolvedValue({
    data: {
      id: 9,
      name: "Billing Hub",
      projectKey: "billing-hub",
      description: "Billing APIs",
      debugAllowedHosts: [],
      currentUserRole: "project_admin",
      canWrite: true,
      canManageMembers: true
    }
  });

  render(<ProjectsPage />);

  fireEvent.click(await screen.findByRole("button", { name: "Create project" }));
  fireEvent.change(screen.getByLabelText("Project name"), { target: { value: "Billing Hub" } });
  expect(screen.getByDisplayValue("billing-hub")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Project description"), { target: { value: "Billing APIs" } });
  fireEvent.click(screen.getByRole("button", { name: "Create workspace" }));

  await waitFor(() =>
    expect(createProject).toHaveBeenCalledWith({
      name: "Billing Hub",
      projectKey: "billing-hub",
      description: "Billing APIs",
      debugAllowedHosts: []
    })
  );
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/console/projects/9"));
});
```

- [ ] **Step 3: Write a failing project-card test for access badges**

```tsx
it("shows access posture and debug policy count", () => {
  render(
    <ProjectCard
      project={{
        id: 1,
        name: "Default Project",
        projectKey: "default",
        description: "Seed workspace",
        debugAllowedHosts: [{ pattern: "*.corp.example.com", allowPrivate: false }],
        currentUserRole: "editor",
        canWrite: true,
        canManageMembers: false
      }}
    />
  );

  expect(screen.getByText("Editor access")).toBeInTheDocument();
  expect(screen.getByText("Writable")).toBeInTheDocument();
  expect(screen.getByText("1 debug rule")).toBeInTheDocument();
});
```

- [ ] **Step 4: Run the focused tests and confirm they fail**

Run: `apps/web/node_modules/.bin/vitest.cmd run src/app/console/projects/page.test.tsx src/features/projects/components/project-card.test.tsx`

Expected: FAIL because the current projects page has no filters or create drawer, and the current card does not expose access posture.

### Task 2: Extend SDK and add small catalog helpers

**Files:**
- Modify: `packages/api-sdk/src/modules/projects.ts`
- Create: `apps/web/src/features/projects/components/project-catalog-utils.ts`

- [ ] **Step 1: Extend the list-project type and create API helper**

```ts
export type ProjectSummary = {
  id: number;
  name: string;
  projectKey: string;
  description: string | null;
  debugAllowedHosts: DebugTargetRule[];
  currentUserRole: string | null;
  canWrite: boolean;
  canManageMembers: boolean;
};

export type CreateProjectPayload = {
  name: string;
  projectKey: string;
  description: string;
  debugAllowedHosts: DebugTargetRule[];
};

export function createProject(payload: CreateProjectPayload) {
  return apiFetch<ProjectDetail>("/api/v1/projects", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
```

- [ ] **Step 2: Add catalog utility helpers**

```ts
export type ProjectCatalogFilter = "all" | "editable" | "review" | "manage";

export function normalizeProjectKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
```

```ts
export function filterProjects(projects: ProjectSummary[], search: string, filter: ProjectCatalogFilter) {
  const query = search.trim().toLowerCase();

  return projects.filter((project) => {
    const matchesQuery =
      !query ||
      `${project.name} ${project.projectKey} ${project.description ?? ""}`.toLowerCase().includes(query);

    if (!matchesQuery) {
      return false;
    }

    switch (filter) {
      case "editable":
        return project.canWrite;
      case "review":
        return !project.canWrite;
      case "manage":
        return project.canManageMembers;
      default:
        return true;
    }
  });
}
```

- [ ] **Step 3: Re-run the focused tests to confirm type and helper gaps remain only in UI**

Run: `apps/web/node_modules/.bin/vitest.cmd run src/app/console/projects/page.test.tsx src/features/projects/components/project-card.test.tsx`

Expected: still FAIL, but for missing UI rendering rather than missing API/helper symbols.

### Task 3: Implement richer cards and create drawer

**Files:**
- Modify: `apps/web/src/features/projects/components/project-card.tsx`
- Create: `apps/web/src/features/projects/components/project-create-drawer.tsx`
- Test: `apps/web/src/features/projects/components/project-card.test.tsx`

- [ ] **Step 1: Upgrade `ProjectCard` to render access context**

```tsx
<div className="mt-4 flex flex-wrap gap-2">
  <Badge>{formatProjectAccess(project.currentUserRole)}</Badge>
  <Badge tone={project.canWrite ? "emerald" : "amber"}>{project.canWrite ? "Writable" : "Read-only"}</Badge>
  <Badge>{project.canManageMembers ? "Can manage members" : "Member review"}</Badge>
</div>
<p className="mt-5 text-xs text-slate-500">{formatDebugRuleCount(project.debugAllowedHosts.length)}</p>
```

- [ ] **Step 2: Add the create drawer component**

```tsx
export function ProjectCreateDrawer({ isOpen, draft, onChange, onClose, onSubmit, ...props }: Props) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button aria-label="Close create project drawer" className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} type="button" />
      <aside aria-label="Create project" aria-modal="true" className="relative h-full w-full max-w-[560px] overflow-y-auto border-l border-white/40 bg-[#f7f4ec]/95 p-6 shadow-[-24px_0_80px_rgba(15,23,42,0.28)]" role="dialog">
        <h2 className="text-2xl font-semibold text-slate-950">Create project</h2>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <input aria-label="Project name" value={draft.name} />
          <input aria-label="Project key" value={draft.projectKey} />
          <textarea aria-label="Project description" value={draft.description} />
          <button type="submit">Create workspace</button>
        </form>
      </aside>
    </div>
  );
}
```

- [ ] **Step 3: Re-run the card test**

Run: `apps/web/node_modules/.bin/vitest.cmd run src/features/projects/components/project-card.test.tsx`

Expected: PASS

### Task 4: Implement the project catalog command center page

**Files:**
- Modify: `apps/web/src/app/console/projects/page.tsx`
- Create: `apps/web/src/app/console/projects/page.test.tsx`
- Create: `apps/web/src/features/projects/components/project-catalog-toolbar.tsx`
- Test: `apps/web/src/app/console/projects/page.test.tsx`

- [ ] **Step 1: Add state for search, filter, drawer, and create draft**

```tsx
const [searchQuery, setSearchQuery] = useState("");
const [activeFilter, setActiveFilter] = useState<ProjectCatalogFilter>("all");
const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
const [createDraft, setCreateDraft] = useState({ name: "", projectKey: "", description: "" });
const [hasEditedProjectKey, setHasEditedProjectKey] = useState(false);
```

- [ ] **Step 2: Auto-generate project key from name until manually edited**

```tsx
useEffect(() => {
  if (hasEditedProjectKey) {
    return;
  }
  setCreateDraft((current) => ({ ...current, projectKey: normalizeProjectKey(current.name) }));
}, [hasEditedProjectKey, createDraft.name]);
```

- [ ] **Step 3: Replace the simple hero with a catalog toolbar**

```tsx
<ProjectCatalogToolbar
  activeFilter={activeFilter}
  editableCount={projects.filter((project) => project.canWrite).length}
  manageCount={projects.filter((project) => project.canManageMembers).length}
  onCreate={() => setIsCreateDrawerOpen(true)}
  onFilterChange={setActiveFilter}
  onSearchChange={setSearchQuery}
  projectCount={projects.length}
  searchQuery={searchQuery}
/>
```

- [ ] **Step 4: Implement create submit and route handoff**

```tsx
const response = await createProject({
  name: createDraft.name.trim(),
  projectKey: createDraft.projectKey.trim(),
  description: createDraft.description.trim(),
  debugAllowedHosts: []
});
router.push(`/console/projects/${response.data.id}`);
```

- [ ] **Step 5: Add empty states for no projects and no matches**

```tsx
{!isLoading && projects.length === 0 ? (
  <section className="rounded-[2rem] border border-dashed border-slate-200 bg-white/70 px-6 py-12 text-center shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
    <p className="text-sm font-medium text-slate-900">No workspaces yet</p>
    <p className="mt-2 text-sm text-slate-500">Create the first project to start shaping grouped endpoints and runtime rules.</p>
  </section>
) : null}
{!isLoading && projects.length > 0 && visibleProjects.length === 0 ? (
  <section className="rounded-[2rem] border border-dashed border-slate-200 bg-white/70 px-6 py-10 text-center text-sm text-slate-500 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
    No matching projects. Adjust the search query or access filter.
  </section>
) : null}
```

- [ ] **Step 6: Re-run the projects page test**

Run: `apps/web/node_modules/.bin/vitest.cmd run src/app/console/projects/page.test.tsx`

Expected: PASS

### Task 5: Full verification and commit

**Files:**
- Verify: `apps/web/src/app/console/projects/page.tsx`
- Verify: `apps/web/src/features/projects/components/project-card.tsx`
- Verify: `apps/web/src/features/projects/components/project-create-drawer.tsx`
- Verify: `apps/web/src/features/projects/components/project-catalog-toolbar.tsx`
- Verify: `apps/web/src/features/projects/components/project-catalog-utils.ts`
- Modify: `docs/superpowers/specs/2026-04-11-project-catalog-command-center-design.md`
- Modify: `docs/superpowers/plans/2026-04-11-project-catalog-command-center.md`

- [ ] **Step 1: Run the focused catalog tests**

Run: `apps/web/node_modules/.bin/vitest.cmd run src/app/console/projects/page.test.tsx src/features/projects/components/project-card.test.tsx`

Expected: PASS

- [ ] **Step 2: Run the full web test suite**

Run: `apps/web/node_modules/.bin/vitest.cmd run`

Expected: PASS

- [ ] **Step 3: Run the production build**

Run: `pnpm.cmd build`

Workdir: `apps/web`

Expected: PASS

- [ ] **Step 4: Commit the feature**

```bash
git add packages/api-sdk/src/modules/projects.ts apps/web/src/app/console/projects/page.tsx apps/web/src/app/console/projects/page.test.tsx apps/web/src/features/projects/components/project-card.tsx apps/web/src/features/projects/components/project-card.test.tsx apps/web/src/features/projects/components/project-create-drawer.tsx apps/web/src/features/projects/components/project-catalog-toolbar.tsx apps/web/src/features/projects/components/project-catalog-utils.ts docs/superpowers/specs/2026-04-11-project-catalog-command-center-design.md docs/superpowers/plans/2026-04-11-project-catalog-command-center.md
git commit -m "feat: upgrade project catalog command center"
```
