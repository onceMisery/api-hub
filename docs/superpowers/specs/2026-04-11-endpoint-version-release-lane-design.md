# Endpoint Version Release Lane Design

> Date: 2026-04-11
> Scope: endpoint version publish boundary, release rollback-to-draft action, and version workbench visibility

## Goal

Turn endpoint versions from "saved snapshots" into a real release lane with an explicit draft/released boundary.

Users should be able to:

- release a selected historical snapshot as the live endpoint version
- see which version is currently live without inferring it from timestamps
- return the endpoint back to a draft lane when they want to keep iterating without a live release marker

This round should make the version system operational, not just archival.

## Current State

The project already supports:

- creating endpoint snapshots
- comparing a selected snapshot against the current draft
- restoring a snapshot back into the draft workspace

But it still lacks the key product boundary called out in the handoff:

- there is no formal "released version" for endpoints
- the workbench cannot tell which snapshot is live
- snapshot save and snapshot release are still the same mental bucket

That leaves the version flow technically rich, but product-wise incomplete.

## Approaches Considered

### 1. Frontend-only release marker in local state

Pros:

- cheapest UI change
- no backend work

Cons:

- not shared across sessions or users
- not authoritative
- directly violates the need for a real release boundary

### 2. Endpoint-level release pointer with lightweight release APIs

Pros:

- explicit and durable release boundary
- minimal schema change
- cleanly reuses existing `api_version`
- easy to surface in both backend and UI

Cons:

- requires touching schema, DTOs, repository, service, controller, SDK, and web

### 3. Separate endpoint-release table

Pros:

- more extensible for future release audit/history

Cons:

- too heavy for the current gap
- adds another persistence concept before the simpler endpoint-owned pointer is exhausted

## Recommendation

Use approach 2.

Add a release pointer to `api_endpoint`, keep `api_version` as the canonical snapshot store, and expose small release actions around the existing version flow.

This gives the workbench a durable source of truth for:

- whether the endpoint is currently released
- which version is live
- when that live version was released

## Product Design

### 1. Release lane in the version panel

Add a new top-level release block inside `EndpointVersionPanel`.

It should show:

- current endpoint lane: `Draft lane` or `Released`
- current live version label when released
- live release timestamp when present
- one clear primary action for the selected snapshot

If a compare version is selected:

- show `Release selected snapshot` when that snapshot is not live
- show a passive `Live version` badge when it is already the released snapshot

If the endpoint is currently released:

- show `Return to draft lane`

### 2. Basics panel status visibility

Add polished release-state chips to `EndpointBasicsPanel` so users can see the live lane without scrolling into the version panel.

Recommended copy:

- `Draft lane`
- `Released`
- `Live: v1`

This is a visibility improvement only. Editing endpoint basics continues to update the draft workspace.

### 3. Version list live markers

Each version card in the version panel should clearly indicate when it is the live released snapshot.

The released card should feel visually anchored:

- high-signal badge
- release timestamp if available
- release action disabled or replaced by `Live version`

## Data Model Design

### Schema

Extend `api_endpoint` with:

- `released_version_id BIGINT NULL`
- `released_at DATETIME(3) NULL`

Important constraint:

- do not add a MySQL foreign key

The endpoint already owns release state through its existing `status` column. Release actions should update:

- `status = 'released'`
- `released_version_id`
- `released_at`

Returning to draft should update:

- `status = 'draft'`
- `released_version_id = null`
- `released_at = null`

### Backend DTOs

Extend `EndpointDetail` with:

- `status`
- `releasedVersionId`
- `releasedVersionLabel`
- `releasedAt`

Extend `VersionDetail` with:

- `released`
- `releasedAt`

This keeps the frontend from making extra lookups or inventing joins locally.

## Backend Architecture

### Repository

`EndpointRepository` should:

- join `api_endpoint` to `api_version` when reading endpoint detail
- join `api_version` to `api_endpoint` when listing versions so each row knows whether it is the released snapshot
- add methods to release a specific version for an endpoint
- add a method to clear the release pointer and return to draft

Release operations must verify that the target version belongs to the same endpoint before updating release state.

### Service

`ProjectService` should own:

- `releaseVersion(userId, endpointId, versionId)`
- `clearEndpointRelease(userId, endpointId)`

Behavior:

1. require endpoint write access
2. require the version to exist under that endpoint
3. persist the release-state update
4. return the refreshed `EndpointDetail`

### Controller

Add:

- `POST /api/v1/endpoints/{endpointId}/versions/{versionId}/release`
- `DELETE /api/v1/endpoints/{endpointId}/release`

No new page routes are needed.

## Frontend Architecture

### `ProjectShell`

Keep release mutations in `ProjectShell` because it already owns:

- selected endpoint refresh
- version reload
- workbench notifications

Recommended flow:

1. invoke release or clear-release API
2. refetch endpoint detail
3. refetch version list
4. show success notification

### `EndpointEditor`

Pass endpoint release metadata plus two optional actions down to `EndpointVersionPanel` and `EndpointBasicsPanel`.

New props:

- `onReleaseVersion`
- `onClearReleasedVersion`

### `EndpointVersionPanel`

Responsibilities:

- release lane summary
- selected-version release action
- draft-lane rollback action
- live version badge rendering

### `EndpointBasicsPanel`

Responsibilities:

- show concise release-state chips only
- no mutation logic

## Error Handling

- releasing a version from another endpoint should fail with `404`
- clearing release on a draft endpoint should be a no-op success or a stable draft response, not a frontend crash
- frontend should keep current compare selection when possible after release actions
- if the released version no longer exists, backend should surface draft state rather than returning inconsistent metadata

## Testing Strategy

Use TDD across backend and frontend.

1. add failing repository/service/controller tests for release and clear-release behavior
2. add failing SDK and `ProjectShell` integration tests for mutation wiring
3. add failing `EndpointEditor` tests for:
   - release lane summary
   - release selected snapshot
   - return to draft lane
   - live version badges
4. implement backend first
5. wire SDK and shell handlers
6. implement UI
7. rerun focused tests, then full web tests and build

## Non-Goals

- module-level release tags
- making runtime consumers read released endpoint snapshots
- auto-saving draft changes before release
- release approvals or audit trails
- MySQL foreign keys
