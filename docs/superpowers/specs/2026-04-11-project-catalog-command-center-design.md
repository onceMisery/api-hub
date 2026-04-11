# Project Catalog Command Center Design

> Date: 2026-04-11
> Scope: project list page UX, project creation flow, richer project cards, and access-aware filtering

## Goal

Turn `/console/projects` from a basic list into a real entry command center that lets users:

- understand project access state before opening a workspace
- search and filter a growing catalog quickly
- create a new project from the frontend without leaving the console
- keep the visual quality aligned with the upgraded workbench UI

This design reuses the existing project list and create APIs. It does not add new backend tables, new project fields, or new routes.

## Current State

The backend already supports:

- `GET /api/v1/projects`
- `POST /api/v1/projects`

The project list response already includes access-aware fields through `ProjectDetail` semantics:

- `currentUserRole`
- `canWrite`
- `canManageMembers`
- `debugAllowedHosts`

But the current frontend only uses a narrow `ProjectSummary` shape and renders:

- one hero block
- a project count
- a simple project card grid

That leaves three product gaps:

1. users cannot create a project from the frontend
2. users cannot search or filter the catalog
3. cards do not expose access posture, so users have to open the project to understand whether they can edit it

## Approaches Considered

### 1. Minimal inline create form above the card grid

Pros:

- smallest code change
- uses the current page structure

Cons:

- weak visual hierarchy
- creation competes with search/listing content
- does not improve catalog information density enough

### 2. Command-center upgrade on the existing page

Pros:

- keeps the current route and mental model
- allows search, filtering, and creation to live in one coherent surface
- best balance of delivery speed and product quality

Cons:

- requires a few new focused components

### 3. Separate `/console/projects/new` route

Pros:

- isolates creation logic

Cons:

- adds navigation friction
- too heavy for the current console stage
- weakens the quick-create-then-enter-workspace loop

## Recommendation

Use approach 2: upgrade the existing page into a command center with a polished create drawer, access-aware search/filter controls, and richer cards.

## UX Design

### 1. Hero becomes a command surface

Keep the hero card, but make it do more:

- headline and product framing
- aggregate stats:
  - total projects
  - editable projects
  - admin-controlled projects
- search field
- access filters:
  - all
  - editable
  - review only
  - can manage
- primary CTA: `Create project`

### 2. Create project drawer

Creating a project should open a right-side drawer instead of an inline form.

The drawer contains:

- title and short description
- name field
- project key field
- description textarea
- live preview badges for:
  - generated project key
  - default access
  - empty policy baseline
- inline validation errors

Behavior:

- project key auto-generates from the name until the user edits the key manually
- key is normalized to lowercase kebab-case
- submit success routes directly into the new project workspace

### 3. Richer project cards

Each card should expose operational context, not just title and description:

- project key
- name
- description
- current role badge
- writable / read-only badge
- member-management capability badge
- debug policy count
- stronger CTA styling

Cards should feel like console surfaces, not plain tiles.

### 4. Empty and filtered-empty states

Two separate states are needed:

- no projects at all:
  - onboarding-style empty state with creation CTA
- filters/search remove all matches:
  - compact no-matching-projects state with clear reset action

## Data and Validation Design

### SDK changes

Update frontend SDK typing to reflect the actual list payload:

- `ProjectSummary` gains:
  - `debugAllowedHosts`
  - `currentUserRole`
  - `canWrite`
  - `canManageMembers`

Add frontend create API:

- `createProject(payload)`

### Frontend-only validation

Before submit:

- `name` required
- `projectKey` required
- `projectKey` format restricted to lowercase letters, digits, and hyphens
- maximum length does not need a new hard-coded business rule beyond a reasonable UI guard

The frontend does not attempt uniqueness checks. Backend remains the source of truth for conflicts.

## File-Level Design

### `packages/api-sdk/src/modules/projects.ts`

- extend `ProjectSummary`
- add `CreateProjectPayload`
- add `createProject()`

### `apps/web/src/app/console/projects/page.tsx`

- manage project loading
- manage search/filter/create drawer state
- compute catalog stats
- handle create flow and route into the new project

### `apps/web/src/features/projects/components/project-card.tsx`

- upgrade card density and access badges

### `apps/web/src/features/projects/components/project-create-drawer.tsx`

New component for the create flow.

### `apps/web/src/features/projects/components/project-catalog-toolbar.tsx`

New component for:

- search
- filter chips
- summary stats
- create CTA

### `apps/web/src/features/projects/components/project-catalog-utils.ts`

New frontend helpers for:

- project-key normalization
- project filtering
- access-label formatting

## Testing Strategy

Use TDD with frontend-focused coverage.

### `apps/web/src/app/console/projects/page.test.tsx`

Cover:

- project list loads with richer access context
- search/filter changes the visible catalog
- create drawer opens
- name auto-generates key
- successful create calls API and routes to the new project

### `apps/web/src/features/projects/components/project-card.test.tsx`

Cover:

- access badges and debug-policy count render correctly

### Verification

Run:

- focused projects page and project card tests
- full `apps/web` Vitest suite
- `next build`

## Scope Boundaries

In scope:

- richer project directory page
- frontend create project flow
- access-aware filtering and cards
- polished empty states

Out of scope:

- project templates
- duplicate-key preflight API
- archive/delete project flows
- member counts on cards
- backend schema changes

## Acceptance Criteria

- users can create a project from `/console/projects`
- the catalog supports search and access-based filtering
- project cards show role and editability without opening the workspace
- successful project creation routes directly into the new workspace
- empty states remain polished and actionable
