# Debug Policy Visibility Design

> Date: 2026-04-11
> Scope: `DebugConsole` policy visibility, blocked-request feedback, and project-shell wiring

## Goal

Make the existing debug execution security boundary visible in the UI so users can understand:

- which policy layer is active for the selected environment
- whether environment rules inherit, append, or override project rules
- why a debug request was blocked, including the blocked host and any matched patterns

This design does not add new backend policy rules or storage. It only surfaces data that already exists in the current API model and debug error payload.

## Current State

The backend already enforces:

- target host allowlist rules
- explicit private-network allowance
- structured `DebugSecurityException` payloads with:
  - `errorCode`
  - `host`
  - `matchedPatterns`

The frontend already lets users edit:

- project-level debug rules
- environment-level debug mode
- environment-level debug rules

But the `DebugConsole` currently shows only:

- a generic request preview URL
- a generic policy blocked banner with message and `errorCode`

This leaves two usability gaps:

1. users cannot see which policy mode is in effect before sending
2. blocked results do not clearly expose the blocked host or the matched allowlist patterns

## Recommended Approach

Use the existing frontend data model and backend error payload as-is.

### Why this approach

- no backend contract change is required
- no schema change is required
- project and environment policy state is already loaded into `ProjectShell`
- the blocked-request payload already contains the details we need

### Rejected alternative

Add a dedicated “effective debug policy” backend API that resolves global + project + environment rules and returns a merged result.

This would be more precise, especially for showing global rules, but it is not justified for the current gap. The current UI can already provide useful, accurate visibility with the data it has.

## UX Design

### 1. Policy summary block in `DebugConsole`

Add a compact block above the request form that shows:

- `Project rules`: number of project-level rules
- `Environment mode`: one of `inherit`, `append`, `override`
- `Environment rules`: number of environment-level rules

And one explanatory sentence:

- `inherit`: “Effective policy uses global + project rules.”
- `append`: “Effective policy uses global + project rules, then appends environment rules.”
- `override`: “Effective policy uses global rules plus environment rules, overriding project rules.”

This does not attempt to render global allowlist entries because they are not exposed to the frontend today.

### 2. Richer blocked-request banner

Keep the current banner shape, but expand the content to show:

- message
- `errorCode`
- blocked `host` when present
- matched patterns list when present

This gives the user a concrete reason for the block without requiring them to inspect network responses manually.

### 3. No change to request execution flow

The send flow, history flow, and replay flow stay unchanged.

The only behavior change is improved rendering of policy state and policy errors.

## Data Flow

### Inputs already available

From `ProjectShell`:

- `project.debugAllowedHosts`
- selected `environment.debugHostMode`
- selected `environment.debugAllowedHosts`

From blocked `ApiRequestError.data`:

- `errorCode`
- `host`
- `matchedPatterns`

### New frontend-only shaping

Introduce a small derived object in `DebugConsole`:

- `policySummary`
  - `projectRuleCount`
  - `environmentMode`
  - `environmentRuleCount`
  - `effectiveSummary`

And extend the extracted policy error shape:

- `errorCode`
- `message`
- `host`
- `matchedPatterns`

## File-Level Design

### `apps/web/src/features/projects/components/project-shell.tsx`

Pass `project?.debugAllowedHosts ?? []` into `DebugConsole`.

### `apps/web/src/features/projects/components/debug-console.tsx`

Add:

- a new prop for `projectDebugAllowedHosts`
- a derived policy summary section
- richer blocked-request rendering
- a small helper to map mode to user-facing copy
- a richer `extractPolicyError()` shape

### `apps/web/src/features/projects/components/debug-console.test.tsx`

Add tests for:

- policy summary rendering across project/environment inputs
- blocked policy rendering with host and matched patterns

### `apps/web/src/features/projects/components/project-shell.test.tsx`

Only add integration assertions if needed to prove wiring. Prefer to keep most coverage in `debug-console.test.tsx`.

## Error Handling

If the environment is missing, no policy summary is shown because the form is already disabled.

If the blocked error has:

- no host: omit the host line
- no matched patterns: omit the matched-patterns section

No new error types are introduced.

## Testing Strategy

Use TDD with focused frontend tests:

1. `debug-console.test.tsx`
   - failing test for policy summary copy
   - failing test for blocked host and matched patterns
2. optional `project-shell.test.tsx`
   - verify project rules are wired into `DebugConsole` only if prop wiring cannot be trusted from component coverage

Then run:

- focused debug console tests
- `project-shell` test if touched
- `pnpm --filter web build`

## Scope Boundaries

In scope:

- surface current project/environment policy inputs
- surface blocked host and matched patterns
- improve explanatory copy in debug console

Out of scope:

- showing global allowlist entries
- adding a backend “effective policy” API
- changing backend policy matching rules
- adding new policy editing screens
- changing persistence or schema

## Acceptance Criteria

- The selected environment’s debug mode and local rule counts are visible in `DebugConsole`.
- Users can distinguish `inherit`, `append`, and `override` behavior from the UI copy.
- When a debug request is blocked, the UI shows `errorCode`, blocked `host`, and matched patterns when provided.
- Existing debug request execution, replay, and history behavior remains unchanged.
