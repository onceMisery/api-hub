# Project Sidebar Navigation Command Deck Design

> Date: 2026-04-11
> Scope: collapsible tree branches, local sort modes, and a polished navigation control deck inside the project sidebar

## Goal

Upgrade the project sidebar from a static CRUD column into a controllable navigation surface for larger trees.

Users should be able to:

- collapse and reopen module or group branches locally
- switch between useful tree sort modes without changing backend order
- expand or collapse the tree in bulk from one high-signal control area
- keep search results and the active endpoint branch visible while navigating

## Why This Is The Next Priority

The workbench now already supports:

- project access context
- notification feedback
- environment and debug workflows
- quick access for pinned and recent endpoints

The remaining navigation gap is tree control. Once a project grows, the sidebar still becomes visually heavy because every branch stays open and the only ordering is the server-delivered project order.

This round extends the same navigation track as quick access, but solves the next layer of friction: branch density, scan speed, and control of what stays open.

## UX Design

### 1. Navigation command deck

Add a dedicated control card near the top of `ProjectSidebar`, directly after quick access and before create-module actions.

The card contains:

- a compact tree summary for visible modules, groups, and endpoints
- a segmented sort switch:
  - `Project order`
  - `A-Z`
  - `Method`
- bulk actions:
  - `Expand all`
  - `Collapse all`
- contextual search copy when a search query is active

Visual direction:

- treat the deck as a command console, not a plain toolbar
- use grouped controls, count chips, and stronger surface contrast
- keep it compact enough that tree content still owns most of the sidebar

### 2. Collapsible module and group sections

Each module and group header gets a disclosure control and richer summary metadata.

Rules:

- collapsed branches hide nested forms and child nodes
- module headers should show group and endpoint counts
- group headers should show endpoint counts
- the branch containing the currently selected endpoint must stay visible
- if a search query is active, matched branches stay open even if local collapsed state says otherwise

### 3. Local display preferences

Tree display preferences stay local to the current browser and project.

Persist:

- selected sort mode
- collapsed module ids
- collapsed group ids

This feature is personal navigation ergonomics, so it should not require new backend APIs or database fields.

## Data Design

Persist tree preferences in `localStorage`.

Storage key:

- `apihub.project-sidebar.tree-preferences.v1.project-{projectId}`

Stored shape:

```ts
type ProjectSidebarTreePreferences = {
  sortMode: "project" | "name" | "method";
  collapsedModuleIds: number[];
  collapsedGroupIds: number[];
};
```

Rules:

- scope by `projectId`
- deduplicate all stored ids
- sanitize against currently available module and group ids
- `project` preserves the backend-delivered order
- `name` sorts modules, groups, and endpoints alphabetically
- `method` keeps module/group order stable, but sorts endpoints by HTTP method first, then path, then name

## File-Level Design

### `apps/web/src/features/projects/components/project-sidebar-tree-preferences.ts`

New focused helper module for:

- storage key generation
- state read/write/sanitize
- sort-mode application
- collapse toggles
- expand-all / collapse-all helpers

### `apps/web/src/features/projects/components/project-sidebar.tsx`

- render the navigation command deck
- hydrate and persist tree preferences
- apply effective expansion rules for active branch and search state
- add disclosure controls and count summaries to module/group cards

### `apps/web/src/features/projects/components/project-shell.tsx`

- pass `searchQuery` into the sidebar so it can render search-aware control copy

### `apps/web/src/features/projects/components/project-sidebar.test.tsx`

Add coverage for:

- local collapse and reopen behavior
- local sort mode changes
- search mode keeping matched branches visible even when stored as collapsed

## Non-Goals

- drag-and-drop reordering
- new backend reorder endpoints
- changing quick access semantics
- server-side sync of sidebar preferences
- replacing the current tree search contract

## Testing Strategy

Use frontend TDD:

1. add failing sidebar tests for collapse, sort, and search-aware expansion
2. implement tree preference helpers and local persistence
3. wire the command deck and branch disclosure controls
4. rerun focused sidebar tests
5. rerun relevant shell tests and the full web build
