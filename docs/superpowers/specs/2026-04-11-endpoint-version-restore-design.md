# Endpoint Version Restore Design

> Date: 2026-04-11
> Scope: endpoint version panel restore flow, restore safety, and workspace refresh behavior

## Goal

Turn endpoint versions from a passive snapshot list into an active rollback surface.

Users should be able to:

- inspect a historical version
- compare it against the current draft
- restore that snapshot back into the current endpoint workspace
- have the server-side endpoint basics, parameters, and responses updated in one flow

This work should reuse the existing endpoint update APIs. No new backend routes, tables, or MySQL foreign keys are needed.

## Current State

The version system already supports:

- creating snapshots
- listing snapshots
- showing structural diff between a selected version and the current draft

But it still stops short of recovery. A user can discover drift, yet cannot apply a known-good snapshot without manually retyping endpoint fields and schema rows.

That makes versions informative, but not operational.

## Approaches Considered

### 1. Local-only restore into editor state

Pros:

- smallest UI change
- no extra integration logic

Cons:

- rollback is incomplete because the restored shape is not persisted
- users still need to save endpoint basics, parameters, and responses separately
- easy to think restore happened when it only changed local inputs

### 2. Frontend-orchestrated persisted restore using existing APIs

Pros:

- no backend contract changes
- restores the real working draft in one action
- aligns with current API boundaries
- strongest value-to-scope ratio

Cons:

- requires a little coordination between `EndpointEditor` and `ProjectShell`

### 3. Dedicated backend restore endpoint

Pros:

- centralizes rollback logic

Cons:

- adds a new API just to orchestrate calls the frontend can already make
- more backend surface area than this iteration needs

## Recommendation

Use approach 2.

The version panel should trigger a frontend-orchestrated restore that sequentially updates:

- endpoint basics
- parameter rows
- response rows

Then the shell should refresh the selected endpoint and sidebar tree so the restored snapshot becomes the new visible draft immediately.

## Restore Semantics

### Included in restore

- endpoint `name`
- endpoint `method`
- endpoint `path`
- endpoint `description`
- request parameters
- response rows

### Not included in restore

- `mockEnabled`
- mock rules
- published mock releases
- debug history
- environments

Reason:

Current version snapshots only exist to track endpoint structure. Mock runtime and debug data already have their own flows and should not be silently rewritten by a version restore.

## UX Design

### 1. Version panel actions

Each version card should expose two explicit actions:

- `Compare snapshot`
- `Restore snapshot`

This makes historical versions actionable without forcing users through the dropdown first.

### 2. Selected-version restore

When a version is selected in the compare area, the diff panel should also expose:

- `Restore selected snapshot`

This keeps the compare flow and the rollback flow connected.

### 3. Feedback

After a successful restore:

- show a clear inline success message in the version panel
- keep the restored version selected for context
- refresh the editor fields and sidebar tree

Suggested message:

- `Restored snapshot from v1. Save a new version if you want to record this rollback.`

### 4. Failure mode

If a snapshot is malformed or incomplete:

- do not issue any update calls
- show an inline restore error in the version panel

This is important because `normalizeSnapshot()` currently tolerates invalid data for diff display, but restore must be stricter than diff.

## Data And Integration Design

### Strict restore parsing

Add a restore-specific parser in `endpoint-editor-utils.ts`.

It should:

- parse JSON
- normalize the snapshot shape
- reject empty or malformed endpoint identity fields
  - `name`
  - `method`
  - `path`

Diff rendering may continue to use the tolerant parser. Restore should use the strict parser.

### Restore payload mapping

Map the parsed snapshot into existing payload shapes:

- `UpdateEndpointPayload`
- `ParameterUpsertItem[]`
- `ResponseUpsertItem[]`

The endpoint restore payload should preserve the current `mockEnabled` flag because it is not part of the version snapshot contract.

### Shell orchestration

`ProjectShell` should own the persisted restore sequence because it already owns API mutations and selected-endpoint refresh logic.

Recommended flow:

1. parse restore snapshot in the editor
2. call `onRestoreVersion(version, snapshot)`
3. in `ProjectShell`:
   - call `updateEndpoint()`
   - call `replaceEndpointParameters()`
   - call `replaceEndpointResponses()`
   - refetch endpoint details
   - refetch parameter/response rows
   - reload the project tree

If any step fails, surface the existing shell error and rethrow so the version panel can display restore failure.

## File-Level Design

### `apps/web/src/features/projects/components/endpoint-editor-utils.ts`

- add strict restore parser
- add payload mappers from snapshot shape to update payloads

### `apps/web/src/features/projects/components/endpoint-version-panel.tsx`

- add explicit compare and restore actions
- add restore message/error surface

### `apps/web/src/features/projects/components/endpoint-editor.tsx`

- wire restore callbacks
- own restore button loading/message state
- parse snapshots before delegating persisted restore

### `apps/web/src/features/projects/components/project-shell.tsx`

- implement persisted restore orchestration using existing API helpers

### Tests

- `endpoint-editor.test.tsx`
  - restore callback wiring
  - malformed snapshot guard
- `project-shell.test.tsx`
  - persisted restore updates endpoint, parameters, responses, and refreshes visible state

## Testing Strategy

Follow TDD:

1. add failing component and shell tests
2. verify red
3. implement strict parsing and payload mapping
4. wire restore UI
5. implement shell orchestration
6. rerun focused tests
7. rerun full web test suite and production build

## Non-Goals

- backend restore endpoint
- automatic creation of a new version after restore
- restoring mock rules or mock releases
- restoring environments or debug state
