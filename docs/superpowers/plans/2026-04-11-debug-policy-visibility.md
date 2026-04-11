# Debug Policy Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface effective debug policy context and blocked-request details in `DebugConsole` without changing the backend contract.

**Architecture:** Keep all policy logic on the backend as-is. Pass project-level rules from `ProjectShell` into `DebugConsole`, derive a frontend-only policy summary from project and selected environment state, and render richer block details from the existing `ApiRequestError.data` payload.

**Tech Stack:** `Next.js 15`, `React 19`, `TypeScript`, `Vitest`, `Testing Library`

---

### Task 1: Add failing tests for policy visibility and blocked-request details

**Files:**
- Modify: `apps/web/src/features/projects/components/debug-console.test.tsx`

- [ ] **Step 1: Write a failing test for policy summary rendering**

```tsx
it("shows the selected environment policy summary", () => {
  render(
    <DebugConsole
      endpoint={endpoint}
      environment={{
        ...environment,
        debugHostMode: "append",
        debugAllowedHosts: [{ pattern: "10.10.1.8", allowPrivate: true }]
      }}
      environmentOptions={[environment]}
      history={[]}
      historyFilters={{
        environmentId: null,
        statusCode: null,
        createdFrom: "",
        createdTo: ""
      }}
      isLoadingHistory={false}
      onChangeHistoryFilters={vi.fn()}
      onClearHistory={vi.fn().mockResolvedValue(undefined)}
      onExecute={vi.fn().mockResolvedValue({
        method: "GET",
        finalUrl: "https://local.dev/users/31",
        statusCode: 200,
        responseHeaders: [],
        responseBody: "{\"ok\":true}",
        durationMs: 20
      })}
      onReplayHistory={vi.fn()}
      onRunHistory={vi.fn()}
      projectDebugAllowedHosts={[
        { pattern: "*.corp.example.com", allowPrivate: false },
        { pattern: "api.partner.dev", allowPrivate: false }
      ]}
      replayDraft={null}
    />
  );

  expect(screen.getByText("Debug target policy")).toBeInTheDocument();
  expect(screen.getByText("Project rules")).toBeInTheDocument();
  expect(screen.getByText("2")).toBeInTheDocument();
  expect(screen.getByText("Environment mode")).toBeInTheDocument();
  expect(screen.getByText("append")).toBeInTheDocument();
  expect(screen.getByText("Effective policy uses global + project rules, then appends environment rules.")).toBeInTheDocument();
});
```

- [ ] **Step 2: Write a failing test for blocked host and matched-pattern details**

```tsx
it("shows blocked host and matched patterns when a debug request is denied", async () => {
  const blockedError = Object.assign(new Error("Target host 10.10.1.8 hit private network restrictions"), {
    status: 403,
    errorCode: "DEBUG_PRIVATE_TARGET_NOT_ALLOWED",
    data: {
      errorCode: "DEBUG_PRIVATE_TARGET_NOT_ALLOWED",
      host: "10.10.1.8",
      matchedPatterns: ["10.10.1.8"]
    }
  });

  render(
    <DebugConsole
      endpoint={endpoint}
      environment={environment}
      environmentOptions={[environment]}
      history={[]}
      historyFilters={{
        environmentId: null,
        statusCode: null,
        createdFrom: "",
        createdTo: ""
      }}
      isLoadingHistory={false}
      onChangeHistoryFilters={vi.fn()}
      onClearHistory={vi.fn().mockResolvedValue(undefined)}
      onExecute={vi.fn().mockRejectedValue(blockedError)}
      onReplayHistory={vi.fn()}
      onRunHistory={vi.fn()}
      projectDebugAllowedHosts={[]}
      replayDraft={null}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: "Send request" }));

  expect(await screen.findByText("DEBUG_PRIVATE_TARGET_NOT_ALLOWED")).toBeInTheDocument();
  expect(screen.getByText("Blocked host")).toBeInTheDocument();
  expect(screen.getByText("10.10.1.8")).toBeInTheDocument();
  expect(screen.getByText("Matched rules")).toBeInTheDocument();
  expect(screen.getByText("10.10.1.8")).toBeInTheDocument();
});
```

- [ ] **Step 3: Run the focused debug console tests and confirm they fail**

Run: `pnpm --filter web test -- src/features/projects/components/debug-console.test.tsx`

Expected: FAIL because the console does not yet render the policy summary or the richer block details.

- [ ] **Step 4: Commit the failing-test stage only if your workflow requires it**

```bash
# Optional in this repo; skip if you prefer red-green within one local commit chain
```

### Task 2: Implement policy summary and blocked-request detail rendering

**Files:**
- Modify: `apps/web/src/features/projects/components/debug-console.tsx`
- Modify: `apps/web/src/features/projects/components/project-shell.tsx`
- Test: `apps/web/src/features/projects/components/debug-console.test.tsx`

- [ ] **Step 1: Extend `DebugConsole` props to accept project-level debug rules**

```tsx
type DebugConsoleProps = {
  endpoint: EndpointDetail | null;
  environment: EnvironmentDetail | null;
  environmentOptions: EnvironmentDetail[];
  projectDebugAllowedHosts: DebugTargetRule[];
  // existing props
};
```

```tsx
<DebugConsole
  endpoint={endpoint}
  environment={selectedEnvironment}
  environmentOptions={environments}
  projectDebugAllowedHosts={project?.debugAllowedHosts ?? []}
  // existing props
/>
```

- [ ] **Step 2: Add a small derived summary block for the selected environment policy**

```tsx
const policySummary = useMemo(() => {
  if (!environment) {
    return null;
  }

  return {
    projectRuleCount: projectDebugAllowedHosts.length,
    environmentMode: environment.debugHostMode,
    environmentRuleCount: environment.debugAllowedHosts.length,
    effectiveSummary: describeDebugPolicyMode(environment.debugHostMode)
  };
}, [environment, projectDebugAllowedHosts]);
```

```tsx
{policySummary ? (
  <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-4">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Debug target policy</p>
    <div className="mt-3 grid gap-3 md:grid-cols-3">
      <PolicyMetric label="Project rules" value={String(policySummary.projectRuleCount)} />
      <PolicyMetric label="Environment mode" value={policySummary.environmentMode} />
      <PolicyMetric label="Environment rules" value={String(policySummary.environmentRuleCount)} />
    </div>
    <p className="mt-3 text-sm text-slate-600">{policySummary.effectiveSummary}</p>
  </div>
) : null}
```

- [ ] **Step 3: Expand the blocked banner to show host and matched patterns**

```tsx
{policyError ? (
  <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
    <p className="font-semibold">Request blocked by debug policy</p>
    <p className="mt-1">{policyError.message}</p>
    {policyError.host ? <p className="mt-2"><span className="font-semibold">Blocked host</span>: {policyError.host}</p> : null}
    {policyError.matchedPatterns.length > 0 ? (
      <div className="mt-2 space-y-1">
        <p className="font-semibold">Matched rules</p>
        {policyError.matchedPatterns.map((pattern) => (
          <p className="font-mono text-xs" key={pattern}>{pattern}</p>
        ))}
      </div>
    ) : null}
    <p className="mt-2 font-mono text-xs">{policyError.errorCode}</p>
  </div>
) : null}
```

- [ ] **Step 4: Extend `extractPolicyError()` to keep `host` and `matchedPatterns`**

```tsx
function extractPolicyError(error: unknown) {
  // read errorCode from top-level or data
  // read host and matchedPatterns from data when present
}
```

- [ ] **Step 5: Re-run focused tests and confirm the console behavior passes**

Run: `pnpm --filter web test -- src/features/projects/components/debug-console.test.tsx`

Expected: PASS

- [ ] **Step 6: Commit Task 2**

```bash
git add apps/web/src/features/projects/components/debug-console.tsx apps/web/src/features/projects/components/debug-console.test.tsx apps/web/src/features/projects/components/project-shell.tsx
git commit -m "feat: show debug policy visibility in console"
```

### Task 3: Final verification and integration

**Files:**
- Modify: `apps/web/src/features/projects/components/project-shell.test.tsx` (only if wiring coverage is needed)
- Modify: `docs/superpowers/specs/2026-04-11-debug-policy-visibility-design.md`
- Modify: `docs/superpowers/plans/2026-04-11-debug-policy-visibility.md`

- [ ] **Step 1: Add or adjust integration coverage only if prop wiring needs proof**

```tsx
// Prefer to keep this unnecessary; only add if local verification shows a wiring gap.
```

- [ ] **Step 2: Run the relevant frontend verification set**

Run: `pnpm --filter web test -- src/features/projects/components/debug-console.test.tsx src/features/projects/components/project-shell.test.tsx`

Expected: PASS

Run: `pnpm --filter web build`

Expected: PASS

- [ ] **Step 3: Check git status**

Run: `git status --short`

Expected: only the debug-policy-visibility code and the spec/plan docs remain.

- [ ] **Step 4: Commit the final integration result**

```bash
git add apps/web/src/features/projects/components docs/superpowers/specs/2026-04-11-debug-policy-visibility-design.md docs/superpowers/plans/2026-04-11-debug-policy-visibility.md
git commit -m "feat: clarify debug policy visibility"
```
