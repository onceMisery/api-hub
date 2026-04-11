# Project Access Drawer Design

> Date: 2026-04-11
> Scope: `ProjectShell` access summary entry, right-side access drawer, and member-management UX refinement

## Goal

Upgrade the existing project-member management flow from an inline utility section into a product-level access surface that:

- keeps the main workbench focused on API editing
- makes membership and role state visible at a glance
- preserves the current backend/API contract
- gives non-admin members a clear read-only review path instead of hiding access information

This design does not add new backend endpoints, new RBAC rules, or new persistence fields.

## Current State

The current stack already supports:

- project-member listing
- add/update/delete member actions
- project-level access flags on `ProjectDetail`
  - `currentUserRole`
  - `canWrite`
  - `canManageMembers`

The current frontend renders all member management inline inside `ProjectShell` via `ProjectMembersPanel`.

That works functionally, but it has three product issues:

1. the workbench main column is overloaded with another full management section
2. access state is only visible after scrolling into the members panel
3. non-admins see disabled controls without enough explanation or framing

## Recommended Approach

Move access management behind a dedicated right-side drawer, opened from a summary card in the workbench header.

### Why this approach

- keeps access information near the global project summary instead of buried in the editing stack
- reduces visual weight in the main workbench column
- allows a richer, more editorial UI without competing with endpoint/editor panels
- reuses the existing data and mutation handlers already wired in `ProjectShell`

### Rejected alternatives

#### 1. Keep the inline panel and only restyle it

This improves cosmetics but keeps the information architecture crowded. The workbench would still mix project governance and endpoint editing in the same vertical flow.

#### 2. Add a dedicated project settings page

This is heavier than the current need. It adds route, navigation, and page-level fragmentation for a workflow that should remain one click away from the workbench.

## Information Architecture

### 1. Header access summary card

Add a new `Access & Roles` card in the `ProjectShell` hero/stat area. The card shows:

- current user role
- writable vs read-only state
- total member count
- admin count
- a concise one-line description
- CTA: `Manage access`

The card should read like an operational summary, not a generic settings button.

### 2. Right-side access drawer

Opening the summary card reveals a wide right-side drawer over a dimmed backdrop.

The drawer has four layers:

1. header row
   - title
   - project access summary
   - close action
2. visual summary band
   - role badge
   - writable/read-only badge
   - members count
   - admins count
3. permission explainer
   - editable message for project admins
   - read-only message for viewers/editors/testers
4. member management body
   - add-member composer
   - member roster cards

### 3. Member roster behavior

Each member row becomes a compact card with:

- display name
- username
- email
- role badge
- owner/admin protection hint when relevant
- inline role editor and actions

The owner row should be visually distinct and protected in the UI:

- owner delete is disabled
- if the roster only has one admin-equivalent member left, demoting that protected member away from `project_admin` is disabled

This mirrors current backend protection instead of letting the user discover it only through server errors.

## Interaction Flow

### Open and close

- open from the `Manage access` CTA in the summary card
- close from the top-right close button
- close from backdrop click
- close from `Escape`

### Editable vs read-only

- `canManageMembers = true`
  - add-member form enabled
  - editable roster actions enabled unless protected by owner/last-admin rules
- `canManageMembers = false`
  - drawer still opens
  - form and actions disabled
  - a clear explanation is shown: the user can review access but cannot change it

### Mutation flow

All add/update/delete actions continue to call the existing `ProjectShell` handlers:

- `handleSaveProjectMember`
- `handleDeleteProjectMember`

On success:

- the roster refreshes from the backend
- the project detail refreshes so role/access badges stay current

On failure:

- existing shell-level error handling remains the single source of truth
- drawer controls stay in place; no optimistic local mutation is introduced

## Visual Direction

Preserve the existing glass-card + slate visual language, but make the access flow feel more intentional:

- summary card uses a darker, layered surface so it reads as a control center card
- role badges use distinct neutral/emerald/amber/slate treatments instead of generic pills everywhere
- drawer is wide and editorial, not a cramped modal
- add-member composer sits in a softer inset surface
- owner/protected states use clear affordances and short explanatory copy

Motion should stay restrained:

- backdrop fade
- drawer slide-in from the right
- no heavy animation inside the roster

## File-Level Design

### `apps/web/src/features/projects/components/project-shell.tsx`

- remove the inline `ProjectMembersPanel` from the main workbench column
- add drawer open/close state
- add `ProjectAccessSummaryCard` into the hero/stats region
- render `ProjectAccessDrawer` with existing member handlers and access state

### `apps/web/src/features/projects/components/project-access-summary-card.tsx`

New component responsible only for the clickable summary card in the hero area.

### `apps/web/src/features/projects/components/project-access-drawer.tsx`

New component responsible for:

- overlay
- drawer shell
- header summary
- permission explainer
- embedding the member-management panel

### `apps/web/src/features/projects/components/project-members-panel.tsx`

Refine into a drawer-first management body with:

- improved add-member composer
- richer member cards
- protected owner/last-admin affordances
- read-only explanation copy

## Testing Strategy

Use TDD with focused frontend coverage.

### Component coverage

`project-members-panel.test.tsx`

- admin can add/update/delete members
- owner delete is disabled
- protected last-admin save is disabled when attempting demotion
- non-admins see read-only messaging and disabled controls

### Integration coverage

`project-shell.test.tsx`

- header summary card renders access state
- clicking `Manage access` opens the drawer
- the inline member panel is no longer visible by default in the workbench column
- viewer members can open the drawer but only see disabled management controls

Run focused tests first, then the full affected frontend verification set.

## Scope Boundaries

In scope:

- summary-card entry point
- right-side access drawer
- refined membership UI inside the drawer
- owner/last-admin frontend protections based on current roster state

Out of scope:

- new backend RBAC rules
- route-level settings pages
- invitation workflow
- audit history
- notification flows

## Acceptance Criteria

- `ProjectShell` shows a prominent `Access & Roles` summary card near the workbench header.
- Member management is opened through a right-side drawer instead of inline in the main column.
- Non-admin users can inspect access state in the drawer but clearly understand why they cannot edit it.
- Existing add/update/delete member actions still work through the drawer UI.
- The owner/protected-admin states are communicated in the UI and risky actions are disabled when the current roster makes them invalid.
- Existing environment, debug, sidebar, and endpoint-editor flows remain unchanged.
