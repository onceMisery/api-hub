# Endpoint Version Diff Command Center Design

> Date: 2026-04-11
> Scope: endpoint version compare UX, structured diff modeling, and visual comparison surfaces

## Goal

Upgrade endpoint version compare from a flat list of change rows into a compact command center that helps users answer three questions quickly:

- what changed overall
- which part of the contract changed
- how the selected snapshot differs from the current draft at a glance

This work stays frontend-only. It keeps the existing snapshot format and reuses the current compare entry points.

## Current State

The editor already supports:

- selecting a historical snapshot
- computing local diffs between the selected snapshot and the current draft
- restoring a snapshot back into the workspace

But the compare experience is still weak:

- all changes are flattened into one list
- there is no summary of change volume or section impact
- users cannot focus on only endpoint basics, request parameters, or responses
- the panel does not provide a quick side-by-side overview of the two snapshot shapes

That makes the feature technically useful, but visually expensive to parse.

## Approaches Considered

### 1. Keep the current flat diff and only polish styling

Pros:

- lowest implementation cost
- minimal code churn

Cons:

- does not solve the core readability problem
- still forces users to scan a long undifferentiated list

### 2. Add a structured frontend diff model and redesign the compare panel around it

Pros:

- strongest UX improvement without backend changes
- keeps all logic local to existing version compare flow
- enables summary cards, filters, and section grouping from one data model

Cons:

- requires changing the data contract between `EndpointEditor` and `EndpointVersionPanel`

### 3. Move diff computation to the backend

Pros:

- centralized diff logic

Cons:

- unnecessary API expansion for a compare surface that is already local
- does not materially improve current scope/value ratio

## Recommendation

Use approach 2.

Build a richer local diff result in `endpoint-editor-utils.ts`, then let the version panel render:

- top-level change summary cards
- section filter chips
- grouped change cards
- side-by-side snapshot overview stats

This gives users a much better compare surface while preserving current architecture.

## UX Design

### 1. Summary row

Show compact summary cards above the detail list:

- total changes
- endpoint basics changes
- request contract changes
- response contract changes

The cards should read like operational signals, not decorative badges.

### 2. Section filters

Add filter chips for:

- `All`
- `Endpoint`
- `Parameters`
- `Responses`

When a filter is active, only the relevant grouped change blocks should remain visible.

### 3. Grouped diff blocks

Diff details should render under clearly separated sections:

- endpoint basics
- request parameters
- responses

Each section should show:

- total count
- change mix
  - added
  - removed
  - changed
- detailed items below

### 4. Snapshot overview strip

When a compare version is selected, show a compact two-column overview for:

- method
- path
- description presence
- parameter count
- response field count

This is not a full raw snapshot viewer. It is a fast visual checksum.

### 5. Empty state

If no changes exist, keep the current “no visible changes” message, but still render the snapshot overview so users can confirm parity.

## Data Model Design

Replace the current flat `diffItems` array with a structured result:

- `summary`
  - total changes
  - endpoint change count
  - parameter change count
  - response change count
  - added / removed / changed totals
- `sections`
  - id
  - label
  - counts
  - items
- `snapshotOverview`
  - selected snapshot stats
  - current draft stats

Each diff item should explicitly carry:

- section id
- change kind
- title
- detail

This lets the UI filter and summarize without recomputing.

## File-Level Design

### `apps/web/src/features/projects/components/endpoint-editor-utils.ts`

- add typed structured diff result models
- upgrade snapshot diff builder to return grouped sections and summary counts
- add snapshot overview builder

### `apps/web/src/features/projects/components/endpoint-editor.tsx`

- switch from flat diff list to structured diff result
- keep compare version selection logic unchanged

### `apps/web/src/features/projects/components/endpoint-version-panel.tsx`

- render summary cards
- render filter chips
- render grouped diff sections
- render selected-vs-current snapshot overview cards

### Tests

- `endpoint-editor.test.tsx`
  - verify grouped diff output is visible from the integrated editor flow
- `endpoint-version-panel.test.tsx`
  - verify summary cards
  - verify filter chips
  - verify snapshot overview rendering

## Testing Strategy

Follow TDD:

1. add failing UI tests for structured diff presentation
2. verify red
3. add minimal structured diff models and panel rendering
4. rerun focused tests
5. rerun full web test suite and production build

## Non-Goals

- backend diff API
- nested schema tree editor
- raw JSON side-by-side viewer
- version publish workflow
