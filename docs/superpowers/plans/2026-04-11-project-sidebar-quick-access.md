# Project Sidebar Quick Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pinned and recent endpoint shortcuts to the project sidebar without changing backend contracts.

**Architecture:** Keep quick access entirely client-side. Introduce a focused sidebar quick-access utility for local storage and list sanitization, then wire a polished shortcut shelf into `ProjectSidebar` while `ProjectShell` passes the current project scope and full tree for lookup.

**Tech Stack:** `Next.js 15`, `React 19`, `TypeScript`, `Vitest`, `Testing Library`, `Tailwind CSS`

---

### Task 1: Lock the desired sidebar behavior with failing tests first

**Files:**
- Modify: `apps/web/src/features/projects/components/project-sidebar.test.tsx`

- [ ] **Step 1: Add a failing test for recent shortcut tracking and reopen flow**

Add a test that:

- renders `ProjectSidebar` with `projectId`
- starts with `selectedEndpointId = 31`
- rerenders with `selectedEndpointId = 32`
- expects both endpoints to appear under quick access in recent-first order
- clicks the earlier endpoint shortcut and expects `onSelectEndpoint(31)`

- [ ] **Step 2: Add a failing test for pin and unpin behavior**

Add a test that:

- renders a sidebar with one endpoint
- clicks `Pin endpoint 31`
- expects a `Pinned` section with that endpoint
- clicks `Unpin endpoint 31`
- expects the pinned shortcut to disappear

- [ ] **Step 3: Add a failing test for stale shortcut cleanup**

Seed `localStorage` with shortcut IDs that include one missing endpoint, then render the sidebar and assert only currently available endpoints remain visible.

- [ ] **Step 4: Run the focused sidebar test and confirm the new expectations fail**

Run:

```powershell
& '.\node_modules\.bin\vitest.cmd' run src/features/projects/components/project-sidebar.test.tsx
```

Workdir: `apps/web`

Expected: FAIL because the sidebar does not yet render quick access or pin controls.

### Task 2: Add local quick-access utilities

**Files:**
- Create: `apps/web/src/features/projects/components/project-sidebar-quick-access.ts`
- Modify: `apps/web/src/features/projects/components/project-sidebar.test.tsx`

- [ ] **Step 1: Add typed storage helpers**

Create helpers for:

- `buildProjectSidebarQuickAccessKey(projectId)`
- `readProjectSidebarQuickAccess(projectId)`
- `writeProjectSidebarQuickAccess(projectId, state)`
- `sanitizeProjectSidebarQuickAccess(state, availableEndpointIds)`

- [ ] **Step 2: Add list mutation helpers**

Create helpers for:

- `recordRecentEndpoint(state, endpointId, maxRecent = 6)`
- `togglePinnedEndpoint(state, endpointId, maxPinned = 8)`

- [ ] **Step 3: Re-run the focused sidebar test and confirm failures narrow to missing UI wiring**

Run:

```powershell
& '.\node_modules\.bin\vitest.cmd' run src/features/projects/components/project-sidebar.test.tsx
```

Workdir: `apps/web`

Expected: still FAIL, but only because the component does not render or wire the new shortcut surface.

### Task 3: Wire the quick-access shelf into the sidebar

**Files:**
- Modify: `apps/web/src/features/projects/components/project-sidebar.tsx`
- Modify: `apps/web/src/features/projects/components/project-shell.tsx`
- Verify: `apps/web/src/features/projects/components/project-sidebar.test.tsx`

- [ ] **Step 1: Extend sidebar props with project scope and full-tree lookup**

Add:

```ts
projectId: number;
allModules?: ModuleTreeItem[];
```

Use `allModules ?? modules` when resolving shortcut metadata so search-filtered trees do not hide quick-access items.

- [ ] **Step 2: Hydrate, sanitize, and track quick-access state**

Inside `ProjectSidebar`:

- read quick-access state on mount / project change
- sanitize it against available endpoint IDs
- record `selectedEndpointId` into recent history
- keep local React state in sync with storage

- [ ] **Step 3: Render the quick-access command deck**

Add a polished card with:

- `Quick access` eyebrow
- `Pinned` shortcut row or empty state
- `Recent` shortcut row or empty state

Each shortcut button should surface method, name, path, and module/group context.

- [ ] **Step 4: Add pin/unpin actions to endpoint nodes**

Add a small local-action button with accessible labels:

- `Pin endpoint {id}`
- `Unpin endpoint {id}`

- [ ] **Step 5: Re-run the focused sidebar tests**

Run:

```powershell
& '.\node_modules\.bin\vitest.cmd' run src/features/projects/components/project-sidebar.test.tsx
```

Workdir: `apps/web`

Expected: PASS

### Task 4: Full verification and commit

**Files:**
- Verify: `apps/web/src/features/projects/components/project-sidebar-quick-access.ts`
- Verify: `apps/web/src/features/projects/components/project-sidebar.tsx`
- Verify: `apps/web/src/features/projects/components/project-shell.tsx`
- Verify: `apps/web/src/features/projects/components/project-sidebar.test.tsx`
- Verify: `apps/web/src/features/projects/components/project-shell.test.tsx`
- Verify: `docs/superpowers/specs/2026-04-11-project-sidebar-quick-access-design.md`
- Verify: `docs/superpowers/plans/2026-04-11-project-sidebar-quick-access.md`

- [ ] **Step 1: Run the focused sidebar and shell verification**

Run:

```powershell
& '.\node_modules\.bin\vitest.cmd' run src/features/projects/components/project-sidebar.test.tsx src/features/projects/components/project-shell.test.tsx
```

Workdir: `apps/web`

Expected: PASS

- [ ] **Step 2: Run the full web test suite**

Run:

```powershell
& '.\node_modules\.bin\vitest.cmd' run
```

Workdir: `apps/web`

Expected: PASS

- [ ] **Step 3: Run the production build**

Run:

```powershell
pnpm.cmd build
```

Workdir: `apps/web`

Expected: PASS

- [ ] **Step 4: Commit the feature**

```bash
git add apps/web/src/features/projects/components/project-sidebar-quick-access.ts apps/web/src/features/projects/components/project-sidebar.tsx apps/web/src/features/projects/components/project-shell.tsx apps/web/src/features/projects/components/project-sidebar.test.tsx docs/superpowers/specs/2026-04-11-project-sidebar-quick-access-design.md docs/superpowers/plans/2026-04-11-project-sidebar-quick-access.md
git commit -m "feat: add sidebar quick access"
```
