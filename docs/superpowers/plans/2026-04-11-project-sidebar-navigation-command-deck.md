# Project Sidebar Navigation Command Deck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add collapsible project-tree branches, local sort modes, and a polished navigation command deck to the project sidebar without changing backend contracts.

**Architecture:** Keep navigation preferences fully client-side. Introduce a focused tree-preferences helper for local storage, sanitization, and sort application, then wire the new command deck into `ProjectSidebar` while `ProjectShell` passes the active search query for search-aware expansion behavior.

**Tech Stack:** `Next.js 15`, `React 19`, `TypeScript`, `Vitest`, `Testing Library`, `Tailwind CSS`

---

### Task 1: Lock the new navigation behavior with failing sidebar tests first

**Files:**
- Modify: `apps/web/src/features/projects/components/project-sidebar.test.tsx`

- [ ] **Step 1: Add a failing test for collapse and reopen behavior**

Add a test that:

- renders `ProjectSidebar` with one module, one group, and two endpoints
- clicks `Collapse module 11`
- expects the endpoint action button like `Get User GET /users/{id}` to disappear
- clicks `Expand module 11`
- expects the endpoint button to return

- [ ] **Step 2: Add a failing test for tree sort mode changes**

Add a test that:

- renders a group with endpoints intentionally out of alphabetical order
- switches sort mode from `Project order` to `A-Z`
- asserts the visible endpoint buttons now appear in alphabetical order
- switches sort mode to `Method`
- asserts `GET` renders before `POST` and `DELETE`

- [ ] **Step 3: Add a failing test for search-aware expansion**

Add a test that:

- seeds `localStorage` with collapsed module and group ids for the current project
- rerenders the sidebar with `searchQuery="billing"`
- passes `modules` as the filtered result and `allModules` as the full tree
- expects the matching endpoint button to remain visible despite the stored collapsed state
- expects search copy like `Search keeps matched branches open.` to appear

- [ ] **Step 4: Run the focused sidebar test and confirm the new expectations fail**

Run:

```powershell
& '.\node_modules\.bin\vitest.cmd' run src/features/projects/components/project-sidebar.test.tsx
```

Workdir: `apps/web`

Expected: FAIL because the sidebar does not yet render tree controls, collapse buttons, or sort modes.

### Task 2: Add local tree-preference helpers

**Files:**
- Create: `apps/web/src/features/projects/components/project-sidebar-tree-preferences.ts`
- Verify: `apps/web/src/features/projects/components/project-sidebar.test.tsx`

- [ ] **Step 1: Add typed storage helpers**

Create helpers for:

- `buildProjectSidebarTreePreferencesKey(projectId)`
- `readProjectSidebarTreePreferences(projectId)`
- `writeProjectSidebarTreePreferences(projectId, state)`
- `sanitizeProjectSidebarTreePreferences(state, availableModuleIds, availableGroupIds)`

- [ ] **Step 2: Add tree-state mutation and sorting helpers**

Create helpers for:

- `toggleCollapsedModule(state, moduleId)`
- `toggleCollapsedGroup(state, groupId)`
- `collapseAllBranches(state, moduleIds, groupIds)`
- `expandAllBranches(state)`
- `sortProjectSidebarModules(modules, sortMode)`

- [ ] **Step 3: Re-run the focused sidebar test and confirm failures narrow to missing UI wiring**

Run:

```powershell
& '.\node_modules\.bin\vitest.cmd' run src/features/projects/components/project-sidebar.test.tsx
```

Workdir: `apps/web`

Expected: still FAIL, but only because `ProjectSidebar` does not yet render or connect the new navigation controls.

### Task 3: Wire the navigation command deck into the sidebar

**Files:**
- Modify: `apps/web/src/features/projects/components/project-sidebar.tsx`
- Modify: `apps/web/src/features/projects/components/project-shell.tsx`
- Verify: `apps/web/src/features/projects/components/project-sidebar.test.tsx`

- [ ] **Step 1: Extend sidebar props with search context**

Add:

```ts
searchQuery?: string;
```

Pass the live `searchQuery` from `ProjectShell` into `ProjectSidebar`.

- [ ] **Step 2: Hydrate, sanitize, and persist tree preferences**

Inside `ProjectSidebar`:

- read tree preferences on mount and project change
- sanitize them against currently available module and group ids
- keep React state and local storage synchronized
- compute `isSearchActive` from `searchQuery`

- [ ] **Step 3: Render the navigation command deck**

Add a polished card that shows:

- `Navigation` eyebrow
- visible tree counts
- a three-mode sort switch
- `Expand all` and `Collapse all` controls
- search-state copy when `searchQuery` is active

- [ ] **Step 4: Add collapsible module and group sections**

Update module and group cards to:

- show disclosure buttons with accessible labels:
  - `Collapse module {id}` / `Expand module {id}`
  - `Collapse group {id}` / `Expand group {id}`
- show summary counts in the header
- hide nested content when collapsed
- keep active or search-matched branches open

- [ ] **Step 5: Re-run the focused sidebar tests**

Run:

```powershell
& '.\node_modules\.bin\vitest.cmd' run src/features/projects/components/project-sidebar.test.tsx
```

Workdir: `apps/web`

Expected: PASS

### Task 4: Full verification and commit

**Files:**
- Verify: `apps/web/src/features/projects/components/project-sidebar-tree-preferences.ts`
- Verify: `apps/web/src/features/projects/components/project-sidebar.tsx`
- Verify: `apps/web/src/features/projects/components/project-shell.tsx`
- Verify: `apps/web/src/features/projects/components/project-sidebar.test.tsx`
- Verify: `docs/superpowers/specs/2026-04-11-project-sidebar-navigation-command-deck-design.md`
- Verify: `docs/superpowers/plans/2026-04-11-project-sidebar-navigation-command-deck.md`

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
git add apps/web/src/features/projects/components/project-sidebar-tree-preferences.ts apps/web/src/features/projects/components/project-sidebar.tsx apps/web/src/features/projects/components/project-shell.tsx apps/web/src/features/projects/components/project-sidebar.test.tsx docs/superpowers/specs/2026-04-11-project-sidebar-navigation-command-deck-design.md docs/superpowers/plans/2026-04-11-project-sidebar-navigation-command-deck.md
git commit -m "feat: add sidebar navigation command deck"
```
