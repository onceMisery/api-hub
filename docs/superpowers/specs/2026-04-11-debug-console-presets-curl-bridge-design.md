# Debug Console Presets And cURL Bridge Design

> Date: 2026-04-11
> Scope: debug console request presets, cURL export, and cURL import workflow

## Goal

Upgrade the existing debug console from a one-off request form into a repeatable operator surface.

Users should be able to:

- save useful request drafts as named presets
- re-apply or delete presets without rebuilding query, headers, and body by hand
- export the current debug request as a cURL command
- import a cURL command back into the console and hydrate the current draft

This work stays frontend-first. It does not require new backend tables or API changes.

## Why This Is The Next Priority

The current project already has:

- live debug execution
- history replay and rerun
- environment switching
- debug target policy visibility

What is still missing is operator efficiency. Every repeated debug session still depends on manual re-entry or browsing history. That makes the debug chain usable, but not yet fast enough for sustained iteration.

Request presets and a cURL bridge solve that gap directly while building on the existing debug surface instead of expanding sideways into unrelated CRUD.

## Approaches Considered

### 1. Backend-saved presets

Pros:

- syncable across devices
- auditable later

Cons:

- needs new API and database work
- too heavy for the current iteration
- slows delivery on a problem that can be solved locally first

### 2. Local preset shelf plus lightweight cURL tools

Pros:

- no backend changes
- fast to ship
- strongest value-to-scope ratio
- keeps the current debug console mental model intact

Cons:

- presets stay browser-local for now

### 3. History-only workflow

Pros:

- no new storage concept

Cons:

- history entries are noisy and chronological
- bad fit for reusable canonical request setups
- does not help with external tool handoff

## Recommendation

Use approach 2.

Add a polished preset shelf and a cURL import/export card directly inside `DebugConsole`.

## UX Design

### 1. Preset shelf

Add a new top-level panel inside the debug console before the raw request fields.

The panel includes:

- a short framing line explaining presets are local to the browser
- a compact name input for saving the current draft
- a primary save action
- a responsive grid of saved preset cards

Each preset card shows:

- preset name
- a small metadata line
  - query status
  - header count
  - body presence
- quick actions
  - apply
  - overwrite current draft by re-saving with the same name
  - delete

Visual direction:

- keep the warm glass + dark accent language already used by project catalog and access surfaces
- make presets feel like operator shortcuts, not admin tables

### 2. cURL bridge

Add a second control card alongside or below presets.

The card includes:

- read-only textarea containing the generated cURL command for the current draft
- copy button
- import textarea for a pasted cURL command
- import button

Import behavior:

- parse query string, headers, request body, and explicit method
- hydrate the current draft fields in the console
- if the imported method conflicts with the selected endpoint method, keep the imported request data but show a warning
- if parsing fails, show an inline error

Export behavior:

- generate cURL from:
  - active environment base URL
  - selected endpoint path
  - current query string
  - current headers
  - current body
  - selected endpoint method

### 3. Message strategy

Avoid toast infrastructure for now.

Use local inline success and error messages:

- preset save success
- preset delete success
- cURL copied
- cURL import success
- cURL import failure
- method mismatch warning

Messages should clear naturally when the user changes inputs or runs another action.

## Data Design

### Preset storage

Persist presets in `localStorage`.

Storage key shape:

- `apihub.debug-presets.v1.project-{projectId}.endpoint-{endpointId}`

The scope can be derived from the existing debug context:

- `projectId` from `environment.projectId`
- `endpointId` from `endpoint.id`

Preset shape:

```ts
type DebugRequestPreset = {
  id: string;
  name: string;
  queryString: string;
  headersText: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};
```

Rules:

- scope presets per project and endpoint
- keep the list sorted by `updatedAt desc`
- cap the local list to a reasonable small number such as 12
- saving with an existing name overwrites that preset instead of duplicating it

### cURL parsing scope

Support the common subset that matters for operator handoff:

- `curl <url>`
- `-X` / `--request`
- `-H` / `--header`
- `-d` / `--data` / `--data-raw` / `--data-binary`

Do not attempt shell-complete parsing.

If the command uses patterns outside that subset, parsing should fail clearly instead of guessing.

## File-Level Design

### `apps/web/src/features/projects/components/debug-console.tsx`

- add preset shelf UI
- add cURL bridge UI
- wire local messages and actions

### `apps/web/src/features/projects/components/debug-console-utils.ts`

New focused utility file for:

- preset storage helpers
- cURL generation
- cURL parsing
- small formatting helpers for preset metadata

### `apps/web/src/features/projects/components/debug-console.test.tsx`

Extend component tests to cover:

- saving and applying presets
- deleting presets
- exporting current request as cURL
- importing cURL into request fields
- method mismatch warning

## Error Handling

- invalid `localStorage` data should be ignored and reset to an empty preset list
- copy failures should show a readable fallback error
- unsupported cURL syntax should not partially mutate form state
- import success should clear previous import errors

## Testing Strategy

Frontend-only TDD:

1. add failing utility and component tests
2. verify red
3. implement minimal utilities
4. wire UI
5. rerun focused tests
6. rerun full web tests and build

## Non-Goals

- server-side preset persistence
- team-shared request templates
- full Postman import
- shell-accurate parsing for every quoting edge case
- changing endpoint method or path from imported cURL
