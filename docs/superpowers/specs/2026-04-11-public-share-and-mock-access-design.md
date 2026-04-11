# External Share And Mock Access Design

## Context

The console now has a polished authenticated browse mode, but external consumers still have two major gaps:

1. There is no managed way to publish read-only project documentation through revocable share links.
2. Mock runtime traffic is still effectively public because `/mock/**` is not governed by project-level access policy.

This design closes both gaps as one coherent "external access and release control" slice. The scope covers share-link management, anonymous documentation delivery, mock access control, and a project-level mock publish center.

## Goals

- Add managed project documentation share links with create, enable or disable, and expiry control.
- Add a public documentation page that reuses the browse-mode information architecture without requiring login.
- Replace unconditional mock public access with project-level access policy.
- Add a project-level mock publish center so teams can see and publish runtime posture across endpoints from one place.
- Keep database changes Flyway-based and do not add MySQL foreign keys.

## Non-Goals

- Fine-grained per-endpoint documentation sharing rules.
- Password-protected share links.
- Signed mock URLs or HMAC request signatures.
- Batch "publish every changed endpoint" automation in this iteration.
- Refactoring unrelated auth, permission, or browse-mode behavior.

## Chosen Design

### 1. Documentation Share Links

Add a new `project_share_link` table with no foreign keys. Each row belongs logically to one project and stores:

- `id`
- `project_id`
- `share_code`
- `name`
- `description`
- `enabled`
- `expires_at`
- `created_by`
- `created_at`
- `updated_at`

`share_code` is the external stable identifier used in public URLs. It is generated server-side and should be hard to guess.

Authenticated management API:

- `GET /api/v1/projects/{projectId}/share-links`
- `POST /api/v1/projects/{projectId}/share-links`
- `PATCH /api/v1/projects/{projectId}/share-links/{shareLinkId}`

Only project writers can manage share links. A disabled or expired share link is never usable from the public side.

### 2. Public Share Read API

Add dedicated public read endpoints under `/api/public/shares/{shareCode}` instead of reusing authenticated project APIs. Public endpoints validate that the share exists, is enabled, and is not expired.

Public API surface:

- `GET /api/public/shares/{shareCode}`
  - returns share metadata, public project summary, and project tree
- `GET /api/public/shares/{shareCode}/endpoints/{endpointId}`
  - returns endpoint detail, parameters, responses, versions, and mock releases for the shared project only

This keeps anonymous access narrow and avoids leaking the broader authenticated project surface.

### 3. Public Share UI

Add a new public route:

- `apps/web/src/app/share/[shareCode]/page.tsx`

Add a dedicated share-management route inside the console:

- `apps/web/src/app/console/projects/[projectId]/share/page.tsx`

The public page reuses the browse-mode visual language: rich hero, searchable navigation rail, contract cards, version posture, and mock release posture. It removes session-specific chrome and adds share-context messaging such as link state and expiration.

The console management page becomes a small release desk for documentation links:

- create share link
- edit name or description
- enable or disable
- set or clear expiry
- copy public URL
- open public page directly

UI direction:

- keep the polished card language already used in browse mode
- use a stronger "publication desk" feel instead of plain tables
- make active, disabled, and expired states visually distinct

### 4. Mock Access Policy

Extend the `project` table with project-level mock access settings:

- `mock_access_mode` with values `private`, `token`, `public`
- `mock_access_token`

Behavior matrix:

- `private`
  - runtime mock access requires a valid bearer token from a user who can read the project
- `token`
  - runtime mock access is allowed either with project read bearer auth or with header `X-ApiHub-Mock-Token`
- `public`
  - runtime mock access is allowed anonymously

The runtime should no longer treat `/mock/**` as universally public. Access is decided per request from project settings.

Implementation approach:

- introduce a dedicated mock access authorization component that can evaluate request path project id, bearer-authenticated user, and optional mock token header
- wire `/mock/**` through that authorization instead of unconditional permit-all
- keep endpoint resolution and release lookup inside existing mock runtime flow

### 5. Project-Level Mock Publish Center

Add a project-level read and write surface for mock runtime posture.

Authenticated API:

- `GET /api/v1/projects/{projectId}/mock-center`
  - returns project mock access settings plus endpoint publish rows
- `PATCH /api/v1/projects/{projectId}/mock-access`
  - updates `mock_access_mode` and token
- `POST /api/v1/projects/{projectId}/mock-center/endpoints/{endpointId}/publish`
  - publishes that endpoint's current mock draft

Each mock center row includes:

- endpoint identity: id, name, method, path
- module and group labels
- whether mock is enabled
- latest release number and time
- whether draft differs from latest published runtime snapshot
- summary counts for current rules and response fields

This API is aggregated server-side so the frontend does not need to fan out across every endpoint.

### 6. Mock Publish Center UI

Add a console route:

- `apps/web/src/app/console/projects/[projectId]/mock-center/page.tsx`

The page is split into two surfaces:

- access policy hero
  - mode cards
  - token preview and rotate/regenerate action
  - runtime URL guidance
- publish center grid
  - searchable endpoint cards
  - latest release badge
  - drift badge
  - publish action per endpoint
  - disabled-state explanation when endpoint mock is off

This page complements, not replaces, the per-endpoint editor. The center is optimized for project-wide release operations and posture scanning.

## Data And Service Boundaries

- Keep share-link concerns in dedicated share DTOs, controller, service, and repository code instead of bloating unrelated auth code.
- Keep mock-center aggregation and mock-access authorization explicit and readable.
- Reuse `EndpointRepository` for endpoint, parameter, response, version, and mock-release reads where practical.
- Reuse existing browse utilities on the frontend where they fit, but avoid forcing anonymous behavior into authenticated-only components.

## Error Handling

- Missing or inaccessible share code returns not found style responses.
- Disabled or expired shares return not found style responses to avoid exposing link lifecycle details.
- Private or token-protected mock requests without valid authorization return unauthorized.
- Publish-center actions respect existing project write rules.
- Invalid mock access mode changes return bad request.

## Testing Strategy

Backend TDD:

- repository tests for share-link persistence and project mock settings
- service tests for share lifecycle, public share reads, mock access decisions, and mock-center aggregation
- controller and security tests for public share endpoints and conditional mock runtime access

Frontend TDD:

- share management route and component behavior
- public share page loading, filtering, and error states
- mock center route and component behavior
- workbench navigation entry points for share and mock center

Verification must include both frontend commands and backend Maven tests after implementation.

## Approval Basis

The user explicitly instructed: write a spec, do not write a plan, use subagents, and implement with TDD immediately. That instruction is treated as design approval for this scope.
