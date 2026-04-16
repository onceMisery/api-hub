# Swagger / SmartDoc Integration Design

## Goal

API Hub should be able to ingest external API descriptions and convert them into the native hierarchy:

- `space` -> isolation boundary / namespace
- `project` -> imported API system
- `module` -> top-level domain or service slice
- `group` -> tag / controller / business grouping
- `endpoint` -> concrete route + method

This keeps imported APIs aligned with the new console flow:

- login
- select namespace
- select project
- manage APIs, environments, mock, versions, share

## Supported Sources

### 1. OpenAPI / Swagger

Primary inputs:

- OpenAPI 3.0 / 3.1 JSON
- Swagger 2.0 JSON
- URL-based fetch
- uploaded file content

Recommended first-stage scope:

- `info`
- `tags`
- `paths`
- `parameters`
- request body schema
- response schemas / examples

### 2. SmartDoc

Primary inputs:

- generated OpenAPI JSON from smart-doc
- smart-doc native export JSON if already available in customer pipelines

Recommendation:

- first implement smart-doc through its OpenAPI-compatible output
- keep a second parser slot for native smart-doc structures later

This avoids building two full parsers in the first phase.

## Import Mapping

### Namespace / Space

- import must always target one explicit `spaceId`
- no cross-space import
- no implicit fallback on interactive import APIs

### Project

Import modes:

- create new project in selected space
- import into existing project in selected space

Suggested metadata:

- source type: `openapi`, `swagger`, `smartdoc`
- source name
- source version
- source hash
- last imported at

## Structure Mapping Rules

### Module

Preferred order:

1. vendor extension like `x-apihub-module`
2. first path segment grouping
3. fallback module: `Imported APIs`

### Group

Preferred order:

1. tag name
2. controller name from smart-doc native metadata
3. fallback group per module: `Default Group`

### Endpoint

Route identity:

- unique key = `METHOD:path`

Imported fields:

- `name`: summary or operationId
- `description`: description or summary fallback
- `method`
- `path`
- `mockEnabled`: default `true` for imported projects is recommended

### Parameters

Map to existing endpoint parameter model:

- path
- query
- header
- cookie
- request body fields when flattening is possible

### Responses

Map from:

- status code
- media type
- schema leaf names
- example values

If schema flattening is too lossy:

- keep raw snapshot JSON inside version snapshot
- render structured fields only for top-level properties in phase 1

## Conflict Strategy

### Import Into Existing Project

For each `METHOD:path`:

- if endpoint does not exist: create
- if endpoint exists: update draft endpoint metadata

Recommended import options:

- `merge`
- `overwrite-draft`
- `create-new-module-copy`

Default:

- `merge`

### Safety Rules

- never auto-delete existing endpoints during normal merge import
- deletions should require explicit prune mode
- imported changes should land in draft state first

## Version and Snapshot Strategy

After every successful import:

- generate or refresh endpoint draft content
- create an import snapshot for changed endpoints
- optionally create a version record with source metadata

Recommended version label format:

- `import-2026-04-12-1`

Recommended change summary:

- `Imported from OpenAPI: Pet Store v1.4.0`

This makes imported states traceable and reversible.

## Mock Integration

Imported endpoints should optionally bootstrap mock assets:

- response examples -> initial response definitions
- example payloads -> default mock body candidates
- response status codes -> draft mock response pool

Future enhancement:

- generate a starter rule named `default-imported-response`

## Environment Integration

Possible source values to ingest:

- `servers` in OpenAPI
- environment URLs from smart-doc export metadata

Mapping:

- first server -> default environment
- remaining servers -> additional environments

Suggested fields:

- `name`
- `baseUrl`
- default variables derived from server variables

## API Proposal

### Interactive Imports

- `POST /api/v1/projects/{projectId}/imports/openapi`
- `POST /api/v1/projects/{projectId}/imports/smartdoc`
- `GET /api/v1/projects/{projectId}/imports`
- `GET /api/v1/import-jobs/{jobId}`

### Create-And-Import In One Step

- `POST /api/v1/spaces/{spaceId}/imports/openapi-project`

Useful when user is still at namespace selection stage and wants to bootstrap a project directly from an external spec.

## Async Job Model

Imports should run as jobs when payloads are large.

Suggested states:

- `pending`
- `running`
- `succeeded`
- `failed`
- `partial_success`

Suggested result payload:

- created modules count
- created groups count
- created endpoints count
- updated endpoints count
- skipped endpoints count
- warnings

## UI Entry Design

Recommended placements:

- namespace project hub: `Create Project` / `Import Spec`
- project API page: `Import OpenAPI`
- versions page: latest import snapshot visibility

Recommended user flow:

1. login
2. select space
3. choose existing project or create project from import
4. preview import diff
5. confirm import
6. land in API workbench with imported draft data

## Phase Plan

### Phase 1

- OpenAPI / Swagger JSON import
- target existing project
- merge endpoints
- create version snapshots

### Phase 2

- create project during import inside chosen space
- bootstrap environments from servers
- bootstrap mock responses from examples

### Phase 3

- smart-doc native parser
- scheduled sync
- source hash diffing
- prune / archive removed endpoints

## Recommended First Implementation

Start with:

- selected `space`
- selected or newly created `project`
- uploaded OpenAPI JSON
- dry-run preview
- merge into draft endpoints
- create version snapshot

This gives the shortest path to real ecosystem interoperability while fitting the current console and domain model.
