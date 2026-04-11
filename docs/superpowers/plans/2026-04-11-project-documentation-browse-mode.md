# Project Documentation Browse Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a polished in-console read-only documentation browsing page for projects, including search, endpoint navigation, contract detail cards, version posture, and mock release history.

**Architecture:** Build a dedicated `ProjectDocsBrowser` client component that reuses the existing authenticated project APIs. Keep the work isolated to frontend route, read-only documentation UI, helper utilities, and entry links from catalog/workbench surfaces.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Vitest, Testing Library

---

### Task 1: Add failing tests for the new browse route and navigation entries

**Files:**
- Create: `apps/web/src/app/console/projects/[projectId]/browse/page.test.tsx`
- Modify: `apps/web/src/features/projects/components/project-card.test.tsx`
- Modify: `apps/web/src/features/projects/components/project-shell.test.tsx`

- [ ] Add a route test that verifies invalid `projectId` renders the error state.
- [ ] Add a route test that verifies a valid `projectId` mounts the browse component.
- [ ] Add a project card test that verifies a `Browse docs` entry points to `/console/projects/<id>/browse`.
- [ ] Add a workbench test that verifies a `Browse docs` entry is available from the workbench hero.
- [ ] Run only the new tests and confirm they fail for missing behavior.

### Task 2: Add failing tests for the documentation browser behavior

**Files:**
- Create: `apps/web/src/features/projects/components/project-docs-browser.test.tsx`

- [ ] Add a test that loads project/tree data and renders the hero plus first endpoint details.
- [ ] Add a test that filters the tree by search input and focuses the first visible endpoint.
- [ ] Add a test that renders grouped parameters, grouped responses, live version state, and latest mock release state.
- [ ] Add a test that redirects to `/login` on unauthorized API responses.
- [ ] Run the new browser test file and confirm it fails for missing implementation.

### Task 3: Implement the read-only route and browser component

**Files:**
- Create: `apps/web/src/app/console/projects/[projectId]/browse/page.tsx`
- Create: `apps/web/src/features/projects/components/project-docs-browser.tsx`
- Create: `apps/web/src/features/projects/components/project-docs-browser-utils.ts`

- [ ] Implement the route page with `projectId` parsing and invalid-id fallback.
- [ ] Implement browser data loading for project/tree and endpoint details using the existing SDK.
- [ ] Implement tree filtering, endpoint selection persistence, and auto-focus for filtered results.
- [ ] Implement the polished browse-mode UI cards for hero, navigation rail, endpoint overview, parameter sections, response sections, version posture, and mock release history.
- [ ] Run the browse route and browser tests and make them pass.

### Task 4: Add browse entry points from existing surfaces

**Files:**
- Modify: `apps/web/src/features/projects/components/project-card.tsx`
- Modify: `apps/web/src/features/projects/components/project-shell.tsx`

- [ ] Update the project catalog card so both workspace and browse-docs actions are clearly available without invalid nested links.
- [ ] Add a browse-docs action to the workbench hero while preserving existing workbench layout and behavior.
- [ ] Run the targeted entry-point tests and make them pass.

### Task 5: Final verification

**Files:**
- Verify only

- [ ] Run `pnpm.cmd --filter web test -- --runInBand` is not applicable; use `pnpm.cmd --filter web test` and confirm success.
- [ ] Run `pnpm.cmd --filter web build` and confirm success.
- [ ] Review diff to ensure no unrelated files were modified, especially `services/apihub-server/src/main/resources/application.yml`.
