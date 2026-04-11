# Mock Matchboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a structured rule-evaluation trace to draft mock simulation and render it as a visual Matchboard in the endpoint editor.

**Architecture:** Extend `MockRuntimeResolver` so the existing simulation API returns both the final resolved result and a per-rule trace list. Mirror the new DTO in `packages/api-sdk`, then add a dedicated frontend matchboard component that visualizes rule states, condition evidence, and fallback behavior without changing published runtime flows.

**Tech Stack:** `Spring Boot 3.2`, `Java 21`, `Maven`, `Next.js 15`, `React 19`, `TypeScript`, `Vitest`, `Testing Library`, `Tailwind CSS`

---

### Task 1: Lock the backend simulation trace with failing tests first

**Files:**
- Modify: `services/apihub-server/src/test/java/com/apihub/mock/service/MockRuntimeResolverTest.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/mock/model/MockDtos.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/mock/service/MockRuntimeResolver.java`

- [ ] **Step 1: Add a failing backend test for mixed rule outcomes**

Add a test to `MockRuntimeResolverTest` that simulates:

- one disabled rule
- one higher-priority enabled rule that is skipped because a query/header/body check fails
- one enabled rule that matches
- one lower-priority enabled rule that should become `not_evaluated`

Expected assertions:

- `result.source()` is `"rule"`
- `result.matchedRuleName()` is the matching rule
- `result.ruleTraces()` contains four items
- statuses appear as `disabled`, `skipped`, `matched`, `not_evaluated`
- the skipped rule summary references the first missing condition

- [ ] **Step 2: Add a failing backend test for no-match fallback traces**

Add a second test where no enabled rule matches and assert:

- `result.source()` is `"default-response"`
- every enabled rule trace is `skipped`
- the final explanation still includes the fallback line

- [ ] **Step 3: Run the focused backend resolver tests and confirm they fail for the expected contract gap**

Run:

```powershell
$env:JAVA_HOME='D:\dev-tool\java\openjdk-21\jdk-21.0.2'
mvn.cmd -f services/apihub-server/pom.xml "-Dtest=MockRuntimeResolverTest" test
```

Expected: FAIL because `MockSimulationResult` does not expose `ruleTraces` and the resolver does not build per-rule statuses yet.

- [ ] **Step 4: Extend the backend simulation DTO with rule traces**

Update `MockDtos.java` to add:

```java
public record MockRuleTraceItem(
        String ruleName,
        int priority,
        String status,
        List<String> checks,
        String summary
) {
}
```

and extend `MockSimulationResult` with:

```java
List<MockRuleTraceItem> ruleTraces
```

- [ ] **Step 5: Implement rule-trace generation in `MockRuntimeResolver`**

Refactor the resolver so it:

- walks draft rules in the existing runtime order
- emits `disabled` traces for disabled rules
- emits `skipped` traces with the first failing reason
- emits one `matched` trace for the winning rule
- emits `not_evaluated` traces for lower-priority rules after a match

Keep the final simulation result semantics unchanged.

- [ ] **Step 6: Re-run the focused backend resolver tests and confirm they pass**

Run:

```powershell
$env:JAVA_HOME='D:\dev-tool\java\openjdk-21\jdk-21.0.2'
mvn.cmd -f services/apihub-server/pom.xml "-Dtest=MockRuntimeResolverTest" test
```

Expected: PASS

### Task 2: Extend the frontend contract and add failing editor coverage

**Files:**
- Modify: `packages/api-sdk/src/modules/projects.ts`
- Modify: `apps/web/src/features/projects/components/endpoint-editor.test.tsx`
- Modify: `apps/web/src/features/projects/components/project-shell.test.tsx`

- [ ] **Step 1: Extend the SDK type for simulation traces**

Add:

```ts
export type MockRuleTrace = {
  ruleName: string;
  priority: number;
  status: "matched" | "skipped" | "not_evaluated" | "disabled";
  checks: string[];
  summary: string;
};
```

and add:

```ts
ruleTraces: MockRuleTrace[];
```

to `MockSimulationResult`.

- [ ] **Step 2: Add a failing editor test for the new Matchboard**

Extend `endpoint-editor.test.tsx` with a test that renders `EndpointEditor`, runs a mocked simulation response, and asserts:

- `Rule Matchboard` is visible
- `Matched`, `Skipped`, `Disabled`, and `Not evaluated` badges render
- the winning rule and skipped reason are visible
- the lower-priority unevaluated rule is visible

- [ ] **Step 3: Update shell-level simulation mocks to include `ruleTraces`**

Adjust the existing mock simulation fixtures in `project-shell.test.tsx` so the SDK type remains valid after the new contract lands.

- [ ] **Step 4: Run the focused frontend tests and confirm the new UI test fails for the expected missing component**

Run:

```powershell
& '.\node_modules\.bin\vitest.cmd' run src/features/projects/components/endpoint-editor.test.tsx src/features/projects/components/project-shell.test.tsx
```

Workdir: `apps/web`

Expected: FAIL because the matchboard UI does not exist yet.

### Task 3: Build the Matchboard UI and wire it into the simulator panel

**Files:**
- Create: `apps/web/src/features/projects/components/mock-rule-matchboard.tsx`
- Modify: `apps/web/src/features/projects/components/endpoint-mock-simulator-panel.tsx`
- Modify: `apps/web/src/features/projects/components/endpoint-editor.tsx`

- [ ] **Step 1: Add a dedicated presentational component for rule traces**

Create `mock-rule-matchboard.tsx` that:

- receives `ruleTraces`
- computes summary counts
- renders a polished grid/list of trace cards
- maps statuses to distinct badges and surfaces

- [ ] **Step 2: Keep the simulator panel focused and embed the Matchboard below the final simulation result**

Update `endpoint-mock-simulator-panel.tsx` so it:

- keeps current input fields and final result preview
- shows a summary row for winner/source/status
- renders `<MockRuleMatchboard ruleTraces={simulationResult.ruleTraces} />` when traces are present

- [ ] **Step 3: Make the UI intentionally high-signal rather than generic**

Use the existing workbench visual language, but strengthen it for diagnostics:

- state-colored badges
- priority chips
- clear typography for summaries
- compact evidence lists under each rule

- [ ] **Step 4: Re-run the focused frontend tests and confirm they pass**

Run:

```powershell
& '.\node_modules\.bin\vitest.cmd' run src/features/projects/components/endpoint-editor.test.tsx src/features/projects/components/project-shell.test.tsx
```

Workdir: `apps/web`

Expected: PASS

### Task 4: Full verification and commit

**Files:**
- Verify: `services/apihub-server/src/main/java/com/apihub/mock/model/MockDtos.java`
- Verify: `services/apihub-server/src/main/java/com/apihub/mock/service/MockRuntimeResolver.java`
- Verify: `services/apihub-server/src/test/java/com/apihub/mock/service/MockRuntimeResolverTest.java`
- Verify: `packages/api-sdk/src/modules/projects.ts`
- Verify: `apps/web/src/features/projects/components/mock-rule-matchboard.tsx`
- Verify: `apps/web/src/features/projects/components/endpoint-mock-simulator-panel.tsx`
- Verify: `apps/web/src/features/projects/components/endpoint-editor.test.tsx`
- Verify: `apps/web/src/features/projects/components/project-shell.test.tsx`

- [ ] **Step 1: Run the focused backend verification**

Run:

```powershell
$env:JAVA_HOME='D:\dev-tool\java\openjdk-21\jdk-21.0.2'
mvn.cmd -f services/apihub-server/pom.xml "-Dtest=MockRuntimeResolverTest,MockServiceTest" test
```

Expected: PASS

- [ ] **Step 2: Run the focused frontend verification**

Run:

```powershell
& '.\node_modules\.bin\vitest.cmd' run src/features/projects/components/endpoint-editor.test.tsx src/features/projects/components/project-shell.test.tsx
```

Workdir: `apps/web`

Expected: PASS

- [ ] **Step 3: Run full frontend tests and build**

Run:

```powershell
& '.\node_modules\.bin\vitest.cmd' run
```

Workdir: `apps/web`

Expected: PASS

Run:

```powershell
pnpm.cmd build
```

Workdir: `apps/web`

Expected: PASS

- [ ] **Step 4: Commit the feature**

```powershell
git add apps/web/src/features/projects/components/mock-rule-matchboard.tsx apps/web/src/features/projects/components/endpoint-mock-simulator-panel.tsx apps/web/src/features/projects/components/endpoint-editor.test.tsx apps/web/src/features/projects/components/project-shell.test.tsx packages/api-sdk/src/modules/projects.ts services/apihub-server/src/main/java/com/apihub/mock/model/MockDtos.java services/apihub-server/src/main/java/com/apihub/mock/service/MockRuntimeResolver.java services/apihub-server/src/test/java/com/apihub/mock/service/MockRuntimeResolverTest.java docs/superpowers/specs/2026-04-11-mock-matchboard-design.md docs/superpowers/plans/2026-04-11-mock-matchboard.md
git commit -m "feat: add mock rule matchboard"
```
