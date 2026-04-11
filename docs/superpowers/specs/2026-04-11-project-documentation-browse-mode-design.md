# Project Documentation Browse Mode Design

## Context

The console currently has a project catalog page and an editable project workbench, but it does not have a focused read-only documentation browsing experience. Users who only need to inspect endpoint contracts, release posture, and mock publication state are forced into the editing surface.

This design adds a dedicated in-console browse mode that reuses the authenticated project APIs and keeps the scope entirely inside the existing frontend and API contract.

## Goals

- Add a dedicated read-only documentation page for a single project.
- Make endpoint discovery fast through search and tree navigation.
- Surface contract details, release posture, and latest mock publication state without exposing editing actions.
- Add clear navigation entry points from both the project catalog and the editable workbench.
- Preserve the current permission model and avoid new backend or database work.

## Non-Goals

- Public share links or anonymous documentation pages.
- New backend endpoints or schema changes.
- Editing, debugging, environment management, or member management from browse mode.
- Any MySQL foreign key work.

## Approaches Considered

### 1. Reuse the existing workbench and hide editor controls

This would be the fastest implementation but it keeps too much unrelated UI on screen, including debug and management concepts that dilute the documentation experience. It also makes the read-only mode feel like a downgraded editor instead of a first-class browse surface.

### 2. Build a dedicated browse page inside the console

This is the recommended approach. It reuses the existing protected APIs, gives the UI room to present documentation cleanly, and avoids backend churn. It also creates a natural base for future share-page work.

### 3. Build a public share page now

This would create more external value later, but it requires auth and backend decisions that are not currently settled. It is a larger scope than the immediate high-priority gap.

## Chosen Design

Implement a new route at `apps/web/src/app/console/projects/[projectId]/browse/page.tsx` backed by a dedicated `ProjectDocsBrowser` client component. The page loads project metadata and the project tree, lets the user search and select endpoints, and then renders a rich read-only documentation surface for the selected endpoint.

The selected endpoint view shows:

- endpoint identity: method, path, description, status
- contract structure: grouped request parameters and response fields
- version posture: live version, draft lane, version list
- mock publication posture: latest published mock release and recent release history

## UX Structure

### Hero

The top section acts as a documentation command center. It shows project name, project key, description, access posture, browse-mode badge, and aggregate counts for modules, groups, and endpoints. It also includes a prominent link back to the editable workbench.

### Navigation Rail

The left rail is optimized for discovery:

- search input for modules, groups, endpoint names, methods, and paths
- aggregate counts that respond to filtering
- read-only nested module/group/endpoint navigation
- compact endpoint cards with strong active state and method coloring

When filtering removes the current selection, the browser automatically focuses the first visible endpoint.

### Endpoint Detail Surface

The main content area is read-only and split into purpose-specific cards:

- endpoint overview card
- request parameter sections grouped by parameter location
- response sections grouped by HTTP status code
- version lane summary and snapshot history
- mock release summary and release history

Empty states are deliberate and descriptive so the browse page still feels complete when an endpoint has sparse data.

## Data Flow

The page reuses existing SDK calls:

- `fetchProject`
- `fetchProjectTree`
- `fetchEndpoint`
- `fetchEndpointParameters`
- `fetchEndpointResponses`
- `fetchEndpointVersions`
- `fetchEndpointMockReleases`

The page performs two loading phases:

1. project shell data: project metadata plus tree
2. endpoint detail data: endpoint detail plus its read-only documentation resources

Unauthorized responses continue to redirect to `/login`, matching the rest of the console.

## Component Boundaries

- `ProjectDocsBrowser`
  - owns loading, selection, filtering, and high-level page layout
- `project-docs-browser-utils`
  - pure helpers for tree filtering, counts, grouping, and formatting
- route page
  - validates `projectId` and mounts the browser

Existing components remain unchanged unless they need navigation entry points.

## Error Handling

- invalid route param shows an inline invalid id message
- failed tree/project loads show a top-level error banner
- failed endpoint-detail loads show an inline error in the detail column
- zero matching search results show a filtered empty state in the navigation rail
- no endpoints in a project show a project-level empty documentation state

## Testing Strategy

Frontend TDD covers:

- browse page route behavior for valid and invalid ids
- project catalog browse entry rendering
- workbench browse entry rendering
- tree filtering and endpoint auto-selection behavior
- endpoint detail rendering for parameters, responses, version lane, and latest mock release
- unauthorized redirect behavior

## Approval Basis

The user already directed the implementation to continue with the strongest recommended path without further confirmation. That instruction is treated as approval for this design so execution can proceed immediately.
