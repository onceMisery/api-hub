# Project Sidebar Quick Access Design

> Date: 2026-04-11
> Scope: pinned endpoints, recent endpoints, and a polished quick-access shelf inside the project sidebar

## Goal

Upgrade the project tree from a pure CRUD navigator into a faster operator surface.

Users should be able to:

- pin important endpoints for one-click access
- automatically revisit recently opened endpoints
- keep those shortcuts local to the current project and browser
- use quick access without changing backend contracts or database state

## Why This Is The Next Priority

The workbench already supports:

- tree search
- module/group/endpoint CRUD
- rich endpoint editing, debug, and mock flows

What it still lacks is a stable “return path” for the endpoints people touch repeatedly during a session. Once the tree grows, repeated navigation becomes slower than the rest of the workbench.

Pinned and recent shortcuts solve that gap directly and fit the handoff guidance for improving the project tree before adding wider platform surface area.

## UX Design

### 1. Quick access shelf

Add a dedicated card near the top of `ProjectSidebar`, above the create-module form.

The shelf contains two zones:

- `Pinned`: intentional shortcuts the user curates
- `Recent`: automatically tracked endpoint visits, excluding anything already pinned

Each shortcut tile shows:

- endpoint name
- method badge
- compact path line
- module/group breadcrumb

Visual direction:

- make quick access feel like a command deck, not another table
- use layered cards and stronger method chips
- keep it compact enough that the actual tree remains the main body

### 2. Pin affordance on endpoint nodes

Each endpoint node gets a small pin/unpin action.

Rules:

- pinning is personal and local, so it stays available even for read-only members
- pin state should be visible directly on the node
- unpin should remove the shortcut immediately

### 3. Empty and cleanup behavior

- if there are no shortcuts yet, show a short explanatory empty state
- if a pinned/recent endpoint no longer exists in the current project tree, remove it from local state automatically

## Data Design

Persist quick access in `localStorage`.

Storage key:

- `apihub.project-sidebar.quick-access.v1.project-{projectId}`

Stored shape:

```ts
type ProjectSidebarQuickAccessState = {
  pinnedEndpointIds: number[];
  recentEndpointIds: number[];
};
```

Rules:

- scope by `projectId`
- keep pin order stable by insertion order
- move the latest visited endpoint to the front of `recentEndpointIds`
- deduplicate both lists
- cap pinned endpoints at 8
- cap recent endpoints at 6

## File-Level Design

### `apps/web/src/features/projects/components/project-sidebar-quick-access.ts`

New focused helper module for:

- storage key generation
- state reading/writing
- pin toggling
- recent tracking
- state sanitization against available endpoint IDs

### `apps/web/src/features/projects/components/project-sidebar.tsx`

- render the quick-access shelf
- record recent selections
- toggle local pins
- keep endpoint-node UI compact but discoverable

### `apps/web/src/features/projects/components/project-shell.tsx`

- pass `projectId`
- pass the full unfiltered tree so quick access can resolve shortcuts even while search is active

### `apps/web/src/features/projects/components/project-sidebar.test.tsx`

Add component coverage for:

- recent tracking
- pin/unpin behavior
- stale shortcut cleanup

## Non-Goals

- server-side shortcut sync
- cross-project favorites
- drag-and-drop tree ordering
- changing tree search behavior
- new backend APIs or database schema

## Testing Strategy

Use frontend TDD:

1. add failing sidebar tests
2. verify they fail for the expected missing quick-access behavior
3. implement minimal storage helpers
4. wire the UI and selection flows
5. rerun focused tests
6. rerun full web tests and build
