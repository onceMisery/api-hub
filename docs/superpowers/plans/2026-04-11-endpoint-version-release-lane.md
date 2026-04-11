# Endpoint Version Release Lane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a formal endpoint version release boundary with release selected snapshot, return-to-draft, and visible live-version status in the workbench.

**Architecture:** Persist endpoint release state on `api_endpoint` using a lightweight `released_version_id` pointer plus `released_at`, expose release metadata through `EndpointDetail` and `VersionDetail`, then wire polished release controls into the existing version panel and basics panel.

**Tech Stack:** `Spring Boot 3.2`, `Java 21`, `JdbcTemplate`, `Flyway`, `H2`, `Next.js 15`, `React 19`, `TypeScript`, `Vitest`, `Testing Library`

---

### Task 1: Lock backend release-state behavior with failing tests

**Files:**
- Modify: `services/apihub-server/src/test/resources/project-service-schema.sql`
- Modify: `services/apihub-server/src/test/java/com/apihub/doc/repository/EndpointRepositoryMockReleaseTest.java`
- Modify: `services/apihub-server/src/test/java/com/apihub/project/service/ProjectServiceTest.java`
- Create: `services/apihub-server/src/test/java/com/apihub/doc/web/ApiVersionControllerTest.java`

- [ ] Add failing repository coverage for releasing a version and clearing draft lane state.
- [ ] Add failing service coverage for:
  - releasing a selected endpoint version
  - rejecting versions from other endpoints
  - returning an endpoint to draft lane
- [ ] Add failing controller coverage for:
  - `POST /api/v1/endpoints/{endpointId}/versions/{versionId}/release`
  - `DELETE /api/v1/endpoints/{endpointId}/release`
- [ ] Run focused backend tests and confirm they fail for missing schema / repository / controller behavior.

### Task 2: Implement backend schema, DTO, repository, service, and controller support

**Files:**
- Modify: `services/apihub-server/src/main/resources/db/migration/V1__baseline.sql`
- Modify: `services/apihub-server/src/test/resources/project-service-schema.sql`
- Modify: `services/apihub-server/src/main/java/com/apihub/doc/model/EndpointDetail.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/doc/model/VersionDetail.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/doc/repository/EndpointRepository.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/doc/web/ApiVersionController.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/project/service/ProjectService.java`

- [ ] Add `released_version_id` and `released_at` to the endpoint schema without adding MySQL foreign keys.
- [ ] Extend endpoint and version DTOs with release metadata while keeping compatibility constructors for existing tests.
- [ ] Update repository read queries to surface live version metadata.
- [ ] Add repository mutations to release a version and clear release state.
- [ ] Add service methods and controller endpoints for release / clear-release flows.
- [ ] Re-run focused backend tests and confirm they pass.

### Task 3: Wire SDK and shell mutation flow with tests first

**Files:**
- Modify: `packages/api-sdk/src/modules/projects.ts`
- Modify: `apps/web/src/features/projects/components/project-shell.test.tsx`
- Modify: `apps/web/src/features/projects/components/project-shell.tsx`

- [ ] Add failing shell tests for releasing a selected version and returning an endpoint to draft lane.
- [ ] Extend SDK types and add API helpers for:
  - `releaseEndpointVersion`
  - `clearEndpointRelease`
- [ ] Add `ProjectShell` handlers to refresh endpoint detail plus version list after each release mutation.
- [ ] Re-run focused shell tests and confirm they pass.

### Task 4: Build the release lane UI in the editor

**Files:**
- Modify: `apps/web/src/features/projects/components/endpoint-basics-panel.tsx`
- Modify: `apps/web/src/features/projects/components/endpoint-version-panel.tsx`
- Modify: `apps/web/src/features/projects/components/endpoint-editor.tsx`
- Modify: `apps/web/src/features/projects/components/endpoint-editor.test.tsx`

- [ ] Add failing editor tests for:
  - release chips in basics
  - live version badges on version cards
  - release selected snapshot action
  - return to draft lane action
- [ ] Pass endpoint release metadata and callbacks through `EndpointEditor`.
- [ ] Add a polished release lane block to `EndpointVersionPanel`.
- [ ] Add concise release-state chips to `EndpointBasicsPanel`.
- [ ] Re-run focused editor tests and confirm they pass.

### Task 5: Full verification

**Files:**
- Verify: `services/apihub-server/src/main/java/com/apihub/doc`
- Verify: `services/apihub-server/src/main/java/com/apihub/project/service/ProjectService.java`
- Verify: `packages/api-sdk/src/modules/projects.ts`
- Verify: `apps/web/src/features/projects/components/endpoint-*.tsx`
- Verify: `apps/web/src/features/projects/components/project-shell.tsx`

- [ ] Run focused backend tests for repository, service, and controller release flows.
- [ ] Run focused frontend tests for `endpoint-editor` and `project-shell`.
- [ ] Run full `apps/web` test suite.
- [ ] Run `apps/web` production build.
- [ ] Check `git status --short` and keep user-owned untracked docs untouched.
