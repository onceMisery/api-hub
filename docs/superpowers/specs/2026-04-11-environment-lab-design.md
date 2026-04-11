# Environment Lab Design

> Date: 2026-04-11
> Scope: environment auth presets, bundle import/export, and clone workflow inside the project workbench

## Goal

Upgrade the environment workflow so teams can move faster between projects and real targets without retyping credentials or hand-copying setup.

This round should close three practical gaps:

- support `basic` and `api_key_query` auth presets end-to-end
- let users export and import environment bundles from the workbench
- let users clone an existing environment into a new draft in one click

## Current State

The environment panel already supports project-level environment CRUD, variable/header/query presets, and a limited auth model.

What is still missing:

- auth presets only cover `none`, `bearer`, and `api_key_header`
- teams cannot move environment setups between projects without manual copy-paste
- duplicating a near-identical environment requires re-entering the whole form

The workbench is functional, but environment operations are still too manual for repeated debugging and setup reuse.

## Approaches Considered

### 1. Extend auth modes only

Pros:

- smallest backend change
- low regression risk

Cons:

- still leaves environment migration and duplication friction untouched
- too small for the current product gap

### 2. Build a focused Environment Lab inside the existing panel

Pros:

- keeps all related actions in one workbench surface
- solves multiple environment workflow gaps together
- fits the current card-based console without introducing a new page

Cons:

- increases `EnvironmentPanel` scope unless helpers are extracted carefully
- needs both frontend and backend coverage

### 3. Build a full global environment center outside the project workbench

Pros:

- reusable longer term

Cons:

- much broader than the current need
- introduces new routing, ownership, and cross-project semantics

## Recommendation

Use approach 2.

Build a local Environment Lab inside the current workbench. Keep the existing environment CRUD model, but add richer auth presets, batch bundle operations, and clone actions in the same panel.

This gives the user a stronger environment workflow without creating a second management surface.

## UX Design

### 1. Environment Lab header card

Add a more intentional command area above the create form:

- compact metrics such as environment count and active target
- two clear actions: export bundle and import bundle
- a visual style that feels like a control deck rather than a plain form strip

This card should visually connect the environment list, create flow, and batch tools.

### 2. Auth preset ergonomics

Keep the existing `authKey` and `authValue` storage contract, but adapt the UI labels and placeholders by mode:

- `none`: no preset copy
- `bearer`: header name + token
- `api_key_header`: header name + API key
- `api_key_query`: query parameter name + API key
- `basic`: username + password

Users should not have to infer how `authKey` maps to each mode.

### 3. Bundle import/export

Bundle export should produce a clean JSON payload directly in the panel so users can copy it immediately.

Bundle import should accept pasted JSON, preview how many environments will be created, and import them as non-default copies for safety. Import should not silently replace the current default environment.

### 4. Clone environment

Each environment card should expose a clone action. The clone should:

- copy variables, default headers, default query, auth preset, and debug rules
- reset `isDefault` to `false`
- append a safe name suffix such as `Copy`

## Architecture

### `apps/web/src/features/projects/components/environment-bundle-utils.ts`

Create a small helper module for:

- export bundle serialization
- import bundle parsing and sanitization
- clone payload generation
- auth mode presentation metadata

This keeps `EnvironmentPanel` from accumulating parsing and formatting logic.

### `apps/web/src/features/projects/components/environment-panel.tsx`

`EnvironmentPanel` remains the visual orchestration layer for environment workflows:

- render the Environment Lab command card
- render auth-mode-aware labels
- call import and clone callbacks
- keep export as a local, read-only JSON surface

### `apps/web/src/features/projects/components/project-shell.tsx`

`ProjectShell` remains the mutation orchestration boundary:

- create imported environments sequentially
- reload environments once after batch completion
- emit summary success/error notifications

### `services/apihub-server/src/main/java/com/apihub/debug/service/DebugService.java`

Extend environment auth injection logic:

- `basic` adds an `Authorization: Basic ...` header
- `api_key_query` injects a query parameter before request-specific query overrides apply

### `services/apihub-server/src/main/java/com/apihub/project/service/ProjectService.java`

Add explicit auth mode validation so unsupported values do not get persisted through the API.

## Data Contracts

### Environment auth modes

Allowed values after this round:

- `none`
- `bearer`
- `api_key_header`
- `api_key_query`
- `basic`

### Bundle format

Use a minimal JSON contract:

```json
{
  "version": 1,
  "exportedAt": "2026-04-11T12:00:00.000Z",
  "environments": [
    {
      "name": "Staging",
      "baseUrl": "https://staging.example.com",
      "variables": [],
      "defaultHeaders": [],
      "defaultQuery": [],
      "authMode": "bearer",
      "authKey": "Authorization",
      "authValue": "{{token}}",
      "debugHostMode": "inherit",
      "debugAllowedHosts": []
    }
  ]
}
```

Imported environments should always be created with `isDefault: false`.

## Error Handling

- invalid bundle JSON should surface a clear import error in the panel
- unsupported auth mode from API payloads should be rejected server-side with `400`
- batch import should stop on the first failure and show a summary notification with the actual backend message

## Testing Strategy

1. add failing backend tests for `basic` and `api_key_query` debug injection plus auth mode validation
2. add failing frontend tests for auth mode UX, clone, and bundle import
3. add a failing `ProjectShell` integration test for bundle import summary feedback
4. implement backend first so new auth modes are real
5. implement panel helpers and Environment Lab UI
6. rerun focused frontend and backend tests, then full frontend tests and build

## Non-Goals

- encrypted secret storage
- environment sync across projects on the server
- file upload/download import flow
- environment folders, tags, or sharing permissions
- replacing the existing environment CRUD structure
