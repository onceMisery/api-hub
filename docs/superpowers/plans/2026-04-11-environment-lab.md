# Environment Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add richer environment auth presets plus environment clone and bundle import/export workflows inside the project workbench.

**Architecture:** Extend backend debug execution to understand two more auth modes, then add a focused Environment Lab layer to the existing environment panel for bundle operations and cloning. Keep mutation orchestration in `ProjectShell`, keep parsing and presentation helpers in a dedicated utility module, and preserve current environment CRUD behavior.

**Tech Stack:** `Spring Boot 3.2`, `Java 21`, `Maven`, `Next.js 15`, `React 19`, `TypeScript`, `Vitest`, `Testing Library`, `Tailwind CSS`

---

### Task 1: Add failing backend and frontend coverage for environment auth and bundle workflows

**Files:**
- Modify: `services/apihub-server/src/test/java/com/apihub/debug/service/DebugServiceTest.java`
- Modify: `services/apihub-server/src/test/java/com/apihub/project/service/ProjectServiceTest.java`
- Modify: `apps/web/src/features/projects/components/environment-panel.test.tsx`
- Modify: `apps/web/src/features/projects/components/project-shell.test.tsx`

- [ ] **Step 1: Add a failing backend test for Basic Auth injection**

Add a test to `DebugServiceTest` that creates an environment with `authMode = "basic"`, `authKey = "demo-user"`, and `authValue = "s3cr3t"`, executes a debug request, captures the outgoing request, and expects an `Authorization` header with the Base64-encoded `demo-user:s3cr3t` credential.

- [ ] **Step 2: Add a failing backend test for query API key injection**

Add a test to `DebugServiceTest` that creates an environment with `authMode = "api_key_query"`, `authKey = "api_key"`, and `authValue = "env-token"`, executes a debug request with its own query string, captures the outgoing URI, and expects the final query string to include `api_key=env-token` before user-supplied query overrides.

- [ ] **Step 3: Add a failing backend validation test for unsupported auth mode**

Add a test to `ProjectServiceTest` that calls `projectService.updateEnvironment(...)` with `authMode = "digest"` and expects `ResponseStatusException` with status `400`.

- [ ] **Step 4: Add failing frontend tests for auth-mode-aware fields and bundle import**

Extend `environment-panel.test.tsx` with:

```tsx
it("adapts auth labels for basic auth and submits the new mode", async () => {
  const onCreateEnvironment = vi.fn().mockResolvedValue(undefined);

  render(
    <EnvironmentPanel
      canWrite
      environments={[]}
      projectDebugAllowedHosts={[]}
      onCreateEnvironment={onCreateEnvironment}
      onDeleteEnvironment={vi.fn().mockResolvedValue(undefined)}
      onImportEnvironmentBundle={vi.fn().mockResolvedValue(undefined)}
      onSelectEnvironment={vi.fn()}
      onUpdateEnvironment={vi.fn().mockResolvedValue(undefined)}
      onUpdateProjectDebugPolicy={vi.fn().mockResolvedValue(undefined)}
      selectedEnvironmentId={null}
    />
  );

  fireEvent.change(screen.getByLabelText("New environment name"), { target: { value: "Partner Basic" } });
  fireEvent.change(screen.getByLabelText("New environment base URL"), { target: { value: "https://partner.example.com" } });
  fireEvent.change(screen.getByLabelText("New environment auth mode"), { target: { value: "basic" } });

  expect(screen.getByText("Username")).toBeInTheDocument();
  expect(screen.getByText("Password")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("New environment auth key"), { target: { value: "demo-user" } });
  fireEvent.change(screen.getByLabelText("New environment auth value"), { target: { value: "s3cr3t" } });
  fireEvent.click(screen.getByRole("button", { name: "Add environment" }));

  await waitFor(() =>
    expect(onCreateEnvironment).toHaveBeenCalledWith(
      expect.objectContaining({
        authMode: "basic",
        authKey: "demo-user",
        authValue: "s3cr3t"
      })
    )
  );
});
```

Add a second test that opens the import area, pastes a bundle JSON payload, clicks import, and expects `onImportEnvironmentBundle` to receive sanitized payloads with `isDefault: false`.

- [ ] **Step 5: Add a failing frontend test for cloning and batch import feedback**

Extend `project-shell.test.tsx` with:

```tsx
it("imports environment bundles as non-default copies and shows a summary notification", async () => {
  render(<ProjectShell projectId={1} />);
  expect((await screen.findAllByText("Local")).length).toBeGreaterThan(0);

  fireEvent.click(screen.getByRole("button", { name: "Open environment import" }));
  fireEvent.change(screen.getByLabelText("Environment bundle import"), {
    target: {
      value: JSON.stringify({
        version: 1,
        exportedAt: "2026-04-11T12:00:00.000Z",
        environments: [
          {
            name: "Staging",
            baseUrl: "https://staging.dev",
            variables: [],
            defaultHeaders: [],
            defaultQuery: [],
            authMode: "api_key_query",
            authKey: "api_key",
            authValue: "demo",
            debugHostMode: "inherit",
            debugAllowedHosts: []
          }
        ]
      })
    }
  });
  fireEvent.click(screen.getByRole("button", { name: "Import environment bundle" }));

  await waitFor(() =>
    expect(createEnvironment).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        name: "Staging",
        isDefault: false,
        authMode: "api_key_query"
      })
    )
  );

  const toast = await screen.findByRole("status");
  expect(within(toast).getByText("Environment bundle imported")).toBeInTheDocument();
});
```

Add a second test that clicks `Clone environment 41` and expects `createEnvironment` to be called with the source environment data, `isDefault: false`, and a copied name.

- [ ] **Step 6: Run the focused failing suites**

Run:

```powershell
& '.\node_modules\.bin\vitest.cmd' run src/features/projects/components/environment-panel.test.tsx src/features/projects/components/project-shell.test.tsx
```

Workdir: `apps/web`

Run:

```powershell
$env:JAVA_HOME='D:\dev-tool\java\openjdk-21\jdk-21.0.2'
mvn.cmd -f services/apihub-server/pom.xml -Dtest=DebugServiceTest,ProjectServiceTest test
```

Workdir: repository root

Expected: FAIL because the new auth modes, bundle parsing, and batch import orchestration do not exist yet.

### Task 2: Implement backend support for new environment auth modes

**Files:**
- Modify: `services/apihub-server/src/main/java/com/apihub/debug/service/DebugService.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/project/service/ProjectService.java`
- Verify: `services/apihub-server/src/test/java/com/apihub/debug/service/DebugServiceTest.java`
- Verify: `services/apihub-server/src/test/java/com/apihub/project/service/ProjectServiceTest.java`

- [ ] **Step 1: Add environment auth mode validation in `ProjectService`**

Implement a private validator in `ProjectService` that accepts only:

```java
private void validateEnvironmentAuthMode(String authMode) {
    String normalized = authMode == null ? "none" : authMode.trim().toLowerCase();
    if (!List.of("none", "bearer", "api_key_header", "api_key_query", "basic").contains(normalized)) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported environment auth mode");
    }
}
```

Call it from both `createEnvironment(...)` and `updateEnvironment(...)` before repository persistence.

- [ ] **Step 2: Extend query merging to inject query-based API keys**

Refactor `mergeQueryString(...)` in `DebugService` so it can insert auth query parameters for `api_key_query` environments before request query overrides are applied.

Expected behavior:

- default query is merged first
- query auth preset is merged second
- request query overrides are merged last

- [ ] **Step 3: Extend auth injection for Basic Auth**

Update `DebugService` so `basic` mode writes:

```java
String credentials = substituteVariables(environment.authKey(), variables) + ":" + authValue;
String encoded = Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
mergedHeaders.put("authorization", new DebugHeader("Authorization", "Basic " + encoded));
```

Keep request headers authoritative, as the current flow already does.

- [ ] **Step 4: Re-run focused backend tests**

Run:

```powershell
$env:JAVA_HOME='D:\dev-tool\java\openjdk-21\jdk-21.0.2'
mvn.cmd -f services/apihub-server/pom.xml -Dtest=DebugServiceTest,ProjectServiceTest test
```

Expected: PASS

### Task 3: Implement environment bundle helpers and Environment Lab UI

**Files:**
- Create: `apps/web/src/features/projects/components/environment-bundle-utils.ts`
- Modify: `apps/web/src/features/projects/components/environment-panel.tsx`
- Verify: `apps/web/src/features/projects/components/environment-panel.test.tsx`

- [ ] **Step 1: Add helper types and bundle parsing utilities**

Create `environment-bundle-utils.ts` with:

```ts
import type { CreateEnvironmentPayload, EnvironmentDetail } from "@api-hub/api-sdk";

export type EnvironmentBundle = {
  version: 1;
  exportedAt: string;
  environments: Array<Omit<CreateEnvironmentPayload, "isDefault">>;
};

export function buildEnvironmentBundle(environments: EnvironmentDetail[]): EnvironmentBundle { ... }
export function parseEnvironmentBundle(raw: string): CreateEnvironmentPayload[] { ... }
export function buildClonedEnvironmentPayload(environment: EnvironmentDetail): CreateEnvironmentPayload { ... }
export function describeAuthMode(mode: CreateEnvironmentPayload["authMode"]): { keyLabel: string; valueLabel: string; keyPlaceholder: string; valuePlaceholder: string; helper: string } { ... }
```

`parseEnvironmentBundle(...)` must:

- parse JSON
- validate `version === 1`
- validate `environments` array
- sanitize missing arrays to `[]`
- force `isDefault: false`
- reject invalid `authMode`

- [ ] **Step 2: Add Environment Lab command card and export/import surfaces**

Update `EnvironmentPanel` to render a new polished card above the create form with:

- environment count and active environment summary
- `Open export bundle` button
- `Open environment import` button
- a readonly textarea labeled `Environment bundle export`
- a writable textarea labeled `Environment bundle import`
- import summary copy such as `1 environment ready to import`

Keep the UI aligned with the workbench design language:

- layered card surfaces
- compact stat chips
- stronger typography than the existing plain section blocks

- [ ] **Step 3: Add auth-mode-aware labels to create and edit forms**

Use `describeAuthMode(...)` so the same `authKey` and `authValue` fields display the correct labels and placeholders for every mode. Keep the underlying payload shape unchanged.

- [ ] **Step 4: Add clone buttons to environment cards**

Add `Clone environment {id}` buttons on each environment card and wire them to `onCreateEnvironment(buildClonedEnvironmentPayload(environment))`.

- [ ] **Step 5: Re-run focused frontend panel tests**

Run:

```powershell
& '.\node_modules\.bin\vitest.cmd' run src/features/projects/components/environment-panel.test.tsx
```

Workdir: `apps/web`

Expected: PASS

### Task 4: Wire bundle import orchestration and notifications in `ProjectShell`

**Files:**
- Modify: `apps/web/src/features/projects/components/project-shell.tsx`
- Modify: `apps/web/src/features/projects/components/project-shell.test.tsx`
- Verify: `apps/web/src/features/projects/components/workbench-notification-center.tsx`

- [ ] **Step 1: Add batch environment import handler in `ProjectShell`**

Implement:

```tsx
async function handleImportEnvironmentBundle(payloads: CreateEnvironmentPayload[]) {
  setError(null);

  try {
    let lastEnvironmentId: number | null = null;
    for (const payload of payloads) {
      const response = await createEnvironment(projectId, payload);
      lastEnvironmentId = response.data.id;
    }
    await reloadEnvironments(lastEnvironmentId);
    pushSuccess(
      "Environment bundle imported",
      payloads.length === 1 ? "1 environment was added to the workbench." : `${payloads.length} environments were added to the workbench.`
    );
  } catch (importError) {
    if (handleUnauthorized(importError)) {
      return;
    }
    const message = getErrorMessage(importError, "Failed to import environment bundle");
    setError(message);
    pushError("Environment import failed", message);
  }
}
```

- [ ] **Step 2: Pass the import callback into `EnvironmentPanel`**

Update `EnvironmentPanel` props in `ProjectShell` to include `onImportEnvironmentBundle={handleImportEnvironmentBundle}`.

- [ ] **Step 3: Re-run focused integration tests**

Run:

```powershell
& '.\node_modules\.bin\vitest.cmd' run src/features/projects/components/environment-panel.test.tsx src/features/projects/components/project-shell.test.tsx
```

Workdir: `apps/web`

Expected: PASS

### Task 5: Full verification and commit

**Files:**
- Verify: `services/apihub-server/src/main/java/com/apihub/debug/service/DebugService.java`
- Verify: `services/apihub-server/src/main/java/com/apihub/project/service/ProjectService.java`
- Verify: `apps/web/src/features/projects/components/environment-bundle-utils.ts`
- Verify: `apps/web/src/features/projects/components/environment-panel.tsx`
- Verify: `apps/web/src/features/projects/components/project-shell.tsx`
- Modify: `docs/superpowers/specs/2026-04-11-environment-lab-design.md`
- Modify: `docs/superpowers/plans/2026-04-11-environment-lab.md`

- [ ] **Step 1: Run focused frontend tests**

Run:

```powershell
& '.\node_modules\.bin\vitest.cmd' run src/features/projects/components/environment-panel.test.tsx src/features/projects/components/project-shell.test.tsx
```

Workdir: `apps/web`

Expected: PASS

- [ ] **Step 2: Run full frontend tests**

Run:

```powershell
& '.\node_modules\.bin\vitest.cmd' run
```

Workdir: `apps/web`

Expected: PASS

- [ ] **Step 3: Run frontend production build**

Run:

```powershell
pnpm.cmd build
```

Workdir: `apps/web`

Expected: PASS

- [ ] **Step 4: Run focused backend tests one more time**

Run:

```powershell
$env:JAVA_HOME='D:\dev-tool\java\openjdk-21\jdk-21.0.2'
mvn.cmd -f services/apihub-server/pom.xml -Dtest=DebugServiceTest,ProjectServiceTest test
```

Expected: PASS

- [ ] **Step 5: Commit the feature**

```powershell
git add apps/web/src/features/projects/components/environment-bundle-utils.ts apps/web/src/features/projects/components/environment-panel.tsx apps/web/src/features/projects/components/environment-panel.test.tsx apps/web/src/features/projects/components/project-shell.tsx apps/web/src/features/projects/components/project-shell.test.tsx services/apihub-server/src/main/java/com/apihub/debug/service/DebugService.java services/apihub-server/src/main/java/com/apihub/project/service/ProjectService.java services/apihub-server/src/test/java/com/apihub/debug/service/DebugServiceTest.java services/apihub-server/src/test/java/com/apihub/project/service/ProjectServiceTest.java packages/api-sdk/src/modules/projects.ts docs/superpowers/specs/2026-04-11-environment-lab-design.md docs/superpowers/plans/2026-04-11-environment-lab.md
git commit -m "feat: upgrade environment lab workflows"
```
