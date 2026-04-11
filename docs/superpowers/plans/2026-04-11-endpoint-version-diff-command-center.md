# Endpoint Version Diff Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn endpoint version compare into a structured, filterable, visually summarized command center without changing backend APIs.

**Architecture:** Keep snapshot parsing and diff computation in `endpoint-editor-utils.ts`, return a structured diff result to `EndpointEditor`, and let `EndpointVersionPanel` render the summary cards, snapshot overview, and grouped change sections. This keeps compare logic local while substantially upgrading the UI.

**Tech Stack:** `Next.js 15`, `React 19`, `TypeScript`, `Vitest`, `Testing Library`

---

### Task 1: Add failing tests for structured diff summaries and filterable sections

**Files:**
- Create: `apps/web/src/features/projects/components/endpoint-version-panel.test.tsx`
- Modify: `apps/web/src/features/projects/components/endpoint-editor.test.tsx`

- [ ] **Step 1: Write a failing panel test for summary cards and snapshot overview**

```tsx
it("renders structured version diff summary cards and snapshot overview", () => {
  render(
    <EndpointVersionPanel
      compareVersion={{
        id: 1,
        endpointId: 7,
        version: "v1",
        changeSummary: "Legacy",
        snapshotJson: "{}"
      }}
      compareVersionId="1"
      diffResult={{
        summary: {
          totalChanges: 5,
          endpointChanges: 2,
          parameterChanges: 1,
          responseChanges: 2,
          addedChanges: 1,
          removedChanges: 1,
          changedChanges: 3
        },
        sections: [
          {
            id: "endpoint",
            label: "Endpoint basics",
            totalChanges: 2,
            addedChanges: 0,
            removedChanges: 0,
            changedChanges: 2,
            items: [
              { id: "endpoint.name", sectionId: "endpoint", kind: "changed", title: "Changed endpoint name", detail: "Get User -> Get User Detail" }
            ]
          }
        ],
        snapshotOverview: [
          { label: "Method", previousValue: "GET", currentValue: "POST" },
          { label: "Request params", previousValue: "1 field", currentValue: "3 fields" }
        ]
      }}
      isRestoring={false}
      latestSnapshot="{}"
      onCompareVersionChange={vi.fn()}
      onVersionFieldChange={vi.fn()}
      restoreError={null}
      restoreMessage={null}
      versionForm={{ version: "", changeSummary: "" }}
      versionMessage={null}
      versions={[]}
    />
  );

  expect(screen.getByText("5 total changes")).toBeInTheDocument();
  expect(screen.getByText("Endpoint basics")).toBeInTheDocument();
  expect(screen.getByText("Selected snapshot vs current draft")).toBeInTheDocument();
  expect(screen.getByText("GET")).toBeInTheDocument();
  expect(screen.getByText("POST")).toBeInTheDocument();
});
```

- [ ] **Step 2: Write a failing panel test for section filtering**

```tsx
it("filters diff sections by selected contract area", async () => {
  render(/* same panel with endpoint + parameters + responses sections */);

  fireEvent.click(screen.getByRole("button", { name: "Responses" }));

  expect(screen.queryByText("Changed endpoint name")).not.toBeInTheDocument();
  expect(screen.queryByText("Added request parameter")).not.toBeInTheDocument();
  expect(screen.getByText("Changed response field type")).toBeInTheDocument();
});
```

- [ ] **Step 3: Write a failing editor integration test for grouped compare sections**

```tsx
it("shows grouped version diff sections in the editor compare panel", async () => {
  render(
    <EndpointEditor
      endpoint={{ id: 7, groupId: 3, name: "Get User Detail", method: "POST", path: "/users/{id}", description: "Profile", mockEnabled: false }}
      projectId={1}
      parameters={[
        { id: 1, sectionType: "query", name: "expand", dataType: "string", required: false, description: "", exampleValue: "team", sortOrder: 0 }
      ]}
      responses={[
        { id: 1, httpStatusCode: 200, mediaType: "application/json", name: "userId", dataType: "uuid", required: true, description: "", exampleValue: "u_1001", sortOrder: 0 }
      ]}
      versions={[
        {
          id: 1,
          endpointId: 7,
          version: "v1",
          changeSummary: "Initial",
          snapshotJson: JSON.stringify({
            endpoint: { name: "Get User", method: "GET", path: "/users", description: "Load" },
            parameters: [],
            responses: []
          })
        }
      ]}
    />
  );

  fireEvent.change(screen.getByLabelText("Compare against version"), { target: { value: "1" } });

  expect(await screen.findByText("5 total changes")).toBeInTheDocument();
  expect(screen.getByText("Endpoint basics")).toBeInTheDocument();
  expect(screen.getByText("Request parameters")).toBeInTheDocument();
  expect(screen.getByText("Responses")).toBeInTheDocument();
});
```

- [ ] **Step 4: Run the focused compare UI tests and confirm they fail**

Run: `& '.\\node_modules\\.bin\\vitest.cmd' run src/features/projects/components/endpoint-version-panel.test.tsx src/features/projects/components/endpoint-editor.test.tsx`

Expected: FAIL because the version panel only supports a flat diff list today.

### Task 2: Add structured version diff models in editor utilities

**Files:**
- Modify: `apps/web/src/features/projects/components/endpoint-editor-utils.ts`
- Test: `apps/web/src/features/projects/components/endpoint-version-panel.test.tsx`

- [ ] **Step 1: Add typed structured diff models**

```ts
export type VersionDiffSectionId = "endpoint" | "parameters" | "responses";
export type VersionDiffKind = "added" | "removed" | "changed";

export type VersionDiffItem = {
  id: string;
  sectionId: VersionDiffSectionId;
  kind: VersionDiffKind;
  title: string;
  detail: string;
};
```

- [ ] **Step 2: Replace the flat diff builder with grouped sections and summary counts**

```ts
export function buildSnapshotDiff(previous: SnapshotShape, current: SnapshotShape): VersionDiffResult {
  const endpointItems = buildEndpointDiffItems(previous.endpoint, current.endpoint);
  const parameterItems = buildParameterDiffItems(previous.parameters, current.parameters);
  const responseItems = buildResponseDiffItems(previous.responses, current.responses);

  return buildVersionDiffResult(previous, current, endpointItems, parameterItems, responseItems);
}
```

- [ ] **Step 3: Add a compact snapshot overview builder**

```ts
function buildSnapshotOverview(previous: SnapshotShape, current: SnapshotShape): VersionDiffOverviewRow[] {
  return [
    { label: "Method", previousValue: previous.endpoint.method, currentValue: current.endpoint.method },
    { label: "Path", previousValue: previous.endpoint.path, currentValue: current.endpoint.path },
    { label: "Request params", previousValue: formatCount(previous.parameters.length, "field"), currentValue: formatCount(current.parameters.length, "field") },
    { label: "Responses", previousValue: formatCount(previous.responses.length, "field"), currentValue: formatCount(current.responses.length, "field") }
  ];
}
```

- [ ] **Step 4: Re-run the focused compare UI tests**

Run: `& '.\\node_modules\\.bin\\vitest.cmd' run src/features/projects/components/endpoint-version-panel.test.tsx src/features/projects/components/endpoint-editor.test.tsx`

Expected: still FAIL, but now on missing panel rendering/filter controls instead of missing data shape.

### Task 3: Build the version compare command center UI

**Files:**
- Modify: `apps/web/src/features/projects/components/endpoint-version-panel.tsx`
- Modify: `apps/web/src/features/projects/components/endpoint-editor.tsx`
- Modify: `apps/web/src/features/projects/components/endpoint-editor.test.tsx`
- Modify: `apps/web/src/features/projects/components/endpoint-version-panel.test.tsx`

- [ ] **Step 1: Pass the structured diff result from `EndpointEditor`**

```tsx
const diffResult = useMemo(() => {
  if (!compareVersion) {
    return null;
  }

  return buildSnapshotDiff(normalizeSnapshot(compareVersion.snapshotJson), currentSnapshot);
}, [compareVersion, currentSnapshot]);
```

- [ ] **Step 2: Add summary cards and snapshot overview strip in `EndpointVersionPanel`**

```tsx
{diffResult ? (
  <div className="grid gap-3 sm:grid-cols-4">
    <SummaryCard label="Total changes" value={`${diffResult.summary.totalChanges} total changes`} />
    <SummaryCard label="Endpoint" value={`${diffResult.summary.endpointChanges} updates`} />
    <SummaryCard label="Parameters" value={`${diffResult.summary.parameterChanges} updates`} />
    <SummaryCard label="Responses" value={`${diffResult.summary.responseChanges} updates`} />
  </div>
) : null}
```

- [ ] **Step 3: Add section filter chips and grouped section rendering**

```tsx
const [activeSectionFilter, setActiveSectionFilter] = useState<VersionDiffSectionFilter>("all");

const visibleSections =
  activeSectionFilter === "all"
    ? diffResult.sections
    : diffResult.sections.filter((section) => section.id === activeSectionFilter);
```

- [ ] **Step 4: Re-run the focused compare UI tests**

Run: `& '.\\node_modules\\.bin\\vitest.cmd' run src/features/projects/components/endpoint-version-panel.test.tsx src/features/projects/components/endpoint-editor.test.tsx`

Expected: PASS

### Task 4: Full verification and commit

**Files:**
- Verify: `apps/web/src/features/projects/components/endpoint-editor-utils.ts`
- Verify: `apps/web/src/features/projects/components/endpoint-editor.tsx`
- Verify: `apps/web/src/features/projects/components/endpoint-version-panel.tsx`
- Verify: `apps/web/src/features/projects/components/endpoint-editor.test.tsx`
- Verify: `apps/web/src/features/projects/components/endpoint-version-panel.test.tsx`
- Modify: `docs/superpowers/specs/2026-04-11-endpoint-version-diff-command-center-design.md`
- Modify: `docs/superpowers/plans/2026-04-11-endpoint-version-diff-command-center.md`

- [ ] **Step 1: Run the focused version compare verification set**

Run: `& '.\\node_modules\\.bin\\vitest.cmd' run src/features/projects/components/endpoint-version-panel.test.tsx src/features/projects/components/endpoint-editor.test.tsx`

Expected: PASS

- [ ] **Step 2: Run the full web test suite**

Run: `& '.\\node_modules\\.bin\\vitest.cmd' run`

Expected: PASS

- [ ] **Step 3: Run the production build**

Run: `pnpm.cmd build`

Workdir: `apps/web`

Expected: PASS

- [ ] **Step 4: Commit the feature**

```bash
git add apps/web/src/features/projects/components/endpoint-editor-utils.ts apps/web/src/features/projects/components/endpoint-editor.tsx apps/web/src/features/projects/components/endpoint-version-panel.tsx apps/web/src/features/projects/components/endpoint-editor.test.tsx apps/web/src/features/projects/components/endpoint-version-panel.test.tsx docs/superpowers/specs/2026-04-11-endpoint-version-diff-command-center-design.md docs/superpowers/plans/2026-04-11-endpoint-version-diff-command-center.md
git commit -m "feat: upgrade endpoint version diff command center"
```
