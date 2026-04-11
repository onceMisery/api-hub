# Mock Release Inspector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the endpoint editor inspect historical mock releases while keeping runtime messaging pinned to the latest published release.

**Architecture:** Keep the backend APIs unchanged and reuse the existing `fetchEndpointMockReleases` list. Add an inspected-release state in `EndpointEditor`, compute `latestRelease` and `inspectedRelease` separately, and make `PublishedRuntimePanel` render both “runtime source” and “inspected snapshot” explicitly.

**Tech Stack:** `Next.js 15`, `React 19`, `TypeScript`, `Vitest`, `Testing Library`

---

### Task 1: Lock the release-inspection interaction with tests first

**Files:**
- Modify: `apps/web/src/features/projects/components/endpoint-editor.test.tsx`
- Modify: `apps/web/src/features/projects/components/project-shell.test.tsx`

- [ ] **Step 1: Write a failing test for inspecting an older release without changing runtime source**

```tsx
it("inspects an older mock release while keeping runtime pinned to the latest release", () => {
  render(
    <EndpointEditor
      endpoint={{
        id: 7,
        groupId: 3,
        name: "Get User",
        method: "GET",
        path: "/users/{id}",
        description: "Load",
        mockEnabled: true
      }}
      projectId={1}
      mockReleases={[
        {
          id: 31,
          endpointId: 7,
          releaseNo: 4,
          responseSnapshotJson:
            "[{\"httpStatusCode\":200,\"mediaType\":\"application/json\",\"name\":\"userId\",\"dataType\":\"string\",\"required\":true,\"description\":\"\",\"exampleValue\":\"u_1001\"}]",
          rulesSnapshotJson:
            "[{\"ruleName\":\"Latest rule\",\"priority\":120,\"enabled\":true,\"queryConditions\":[],\"headerConditions\":[],\"bodyConditions\":[],\"statusCode\":200,\"mediaType\":\"application/json\",\"body\":\"{\\\"ok\\\":true}\"}]",
          createdAt: "2026-04-11T09:00:00Z"
        },
        {
          id: 21,
          endpointId: 7,
          releaseNo: 3,
          responseSnapshotJson: "[]",
          rulesSnapshotJson:
            "[{\"ruleName\":\"Legacy rule\",\"priority\":80,\"enabled\":true,\"queryConditions\":[],\"headerConditions\":[],\"bodyConditions\":[],\"statusCode\":503,\"mediaType\":\"application/json\",\"body\":\"{\\\"legacy\\\":true}\"}]",
          createdAt: "2026-04-10T09:00:00Z"
        }
      ]}
      versions={[]}
    />
  );

  expect(screen.getByText("Release #4 is the only snapshot served by runtime.")).toBeInTheDocument();
  expect(screen.getByText("Inspecting Release #4")).toBeInTheDocument();
  expect(screen.getByText("Latest rule")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Inspect published release"), { target: { value: "21" } });

  expect(screen.getByText("Inspecting Release #3")).toBeInTheDocument();
  expect(screen.getByText("Legacy rule")).toBeInTheDocument();
  expect(screen.getByText("Runtime source remains Release #4")).toBeInTheDocument();
});
```

- [ ] **Step 2: Write a failing shell test that publishing a new release reselects the latest release**

```tsx
it("keeps the latest release selected after publishing a new mock release", async () => {
  fetchEndpointResponses.mockResolvedValueOnce({ data: [] });
  fetchEndpointMockRules.mockResolvedValueOnce({ data: [] });
  fetchEndpointMockReleases
    .mockResolvedValueOnce({
      data: [
        {
          id: 7,
          endpointId: 31,
          releaseNo: 2,
          responseSnapshotJson: "[]",
          rulesSnapshotJson: "[]",
          createdAt: "2026-04-09T12:10:00Z"
        }
      ]
    })
    .mockResolvedValueOnce({
      data: [
        {
          id: 8,
          endpointId: 31,
          releaseNo: 3,
          responseSnapshotJson: "[]",
          rulesSnapshotJson: "[]",
          createdAt: "2026-04-09T12:12:00Z"
        },
        {
          id: 7,
          endpointId: 31,
          releaseNo: 2,
          responseSnapshotJson: "[]",
          rulesSnapshotJson: "[]",
          createdAt: "2026-04-09T12:10:00Z"
        }
      ]
    });

  render(<ProjectShell projectId={1} />);

  expect(await screen.findByText("Inspecting Release #2")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Publish mock" }));
  expect(await screen.findByText("Inspecting Release #3")).toBeInTheDocument();
});
```

- [ ] **Step 3: Run the focused frontend tests and confirm they fail for the expected reason**

Run: `pnpm --filter web test -- src/features/projects/components/endpoint-editor.test.tsx src/features/projects/components/project-shell.test.tsx`

Expected: FAIL because `Inspect published release` and the new runtime-source copy do not exist yet.

- [ ] **Step 4: Implement the smallest release-selection state in the editor**

```tsx
const [inspectedReleaseId, setInspectedReleaseId] = useState("");

useEffect(() => {
  setInspectedReleaseId(mockReleases[0] ? String(mockReleases[0].id) : "");
}, [endpoint?.id, mockReleases]);

const latestRelease = mockReleases[0] ?? null;
const inspectedRelease =
  mockReleases.find((release) => String(release.id) === inspectedReleaseId) ??
  latestRelease;
```

```tsx
<PublishedRuntimePanel
  inspectedRelease={inspectedRelease}
  inspectedReleaseId={inspectedRelease ? String(inspectedRelease.id) : ""}
  latestRelease={latestRelease}
  mockReleases={mockReleases}
  onInspectedReleaseChange={setInspectedReleaseId}
  // existing props
/>
```

- [ ] **Step 5: Add the selector and basic runtime-vs-inspection copy in the panel**

```tsx
<Field label="Inspect published release">
  <select
    aria-label="Inspect published release"
    onChange={(event) => onInspectedReleaseChange(event.target.value)}
    value={inspectedReleaseId}
  >
    {mockReleases.map((release) => (
      <option key={release.id} value={String(release.id)}>
        {`Release #${release.releaseNo}`}
      </option>
    ))}
  </select>
</Field>
```

```tsx
<p>{`Inspecting Release #${inspectedRelease.releaseNo}`}</p>
{latestRelease && inspectedRelease.id !== latestRelease.id ? (
  <p>{`Runtime source remains Release #${latestRelease.releaseNo}`}</p>
) : null}
```

- [ ] **Step 6: Re-run the focused frontend tests and confirm they pass**

Run: `pnpm --filter web test -- src/features/projects/components/endpoint-editor.test.tsx src/features/projects/components/project-shell.test.tsx`

Expected: PASS

- [ ] **Step 7: Commit Task 1**

```bash
git add apps/web/src/features/projects/components/endpoint-editor.tsx apps/web/src/features/projects/components/published-runtime-panel.tsx apps/web/src/features/projects/components/endpoint-editor.test.tsx apps/web/src/features/projects/components/project-shell.test.tsx
git commit -m "feat: inspect published mock releases"
```

### Task 2: Make snapshot summaries and lists follow the inspected release

**Files:**
- Modify: `apps/web/src/features/projects/components/endpoint-editor-utils.ts`
- Modify: `apps/web/src/features/projects/components/endpoint-editor.tsx`
- Modify: `apps/web/src/features/projects/components/published-runtime-panel.tsx`
- Modify: `apps/web/src/features/projects/components/endpoint-editor.test.tsx`

- [ ] **Step 1: Write a failing test that draft diffs follow the inspected release instead of always using the latest release**

```tsx
it("compares the draft against the inspected release without changing runtime source messaging", () => {
  render(
    <EndpointEditor
      endpoint={{
        id: 7,
        groupId: 3,
        name: "Get User",
        method: "GET",
        path: "/users/{id}",
        description: "Load",
        mockEnabled: true
      }}
      projectId={1}
      responses={[
        {
          id: 1,
          endpointId: 7,
          httpStatusCode: 200,
          mediaType: "application/json",
          name: "userId",
          dataType: "string",
          required: true,
          description: "",
          exampleValue: "u_1001",
          sortOrder: 0
        }
      ]}
      mockRules={[
        {
          id: 11,
          endpointId: 7,
          ruleName: "Draft rule",
          priority: 100,
          enabled: true,
          queryConditions: [],
          headerConditions: [],
          bodyConditions: [],
          statusCode: 200,
          mediaType: "application/json",
          body: "{\"draft\":true}"
        }
      ]}
      mockReleases={[
        {
          id: 31,
          endpointId: 7,
          releaseNo: 4,
          responseSnapshotJson: "[]",
          rulesSnapshotJson: "[]",
          createdAt: "2026-04-11T09:00:00Z"
        },
        {
          id: 21,
          endpointId: 7,
          releaseNo: 3,
          responseSnapshotJson:
            "[{\"httpStatusCode\":200,\"mediaType\":\"application/json\",\"name\":\"legacyId\",\"dataType\":\"string\",\"required\":true,\"description\":\"\",\"exampleValue\":\"old\"}]",
          rulesSnapshotJson: "[]",
          createdAt: "2026-04-10T09:00:00Z"
        }
      ]}
      versions={[]}
    />
  );

  fireEvent.change(screen.getByLabelText("Inspect published release"), { target: { value: "21" } });

  expect(screen.getByText("Draft enabled rules changed from 0 to 1.")).toBeInTheDocument();
  expect(screen.getByText("Runtime source remains Release #4")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the editor test and confirm the diff logic still tracks `latestRelease`**

Run: `pnpm --filter web test -- src/features/projects/components/endpoint-editor.test.tsx`

Expected: FAIL because summary and list helpers still consume `latestRelease`.

- [ ] **Step 3: Switch summaries and published lists to `inspectedRelease` while runtime copy keeps using `latestRelease`**

```tsx
const inspectedRuntimeSummary = useMemo(() => summarizeMockRelease(inspectedRelease), [inspectedRelease]);
const releaseDiffItems = useMemo(
  () => buildRuntimeDiffItems(inspectedRuntimeSummary, draftRuntimeSummary, inspectedRelease !== null),
  [draftRuntimeSummary, inspectedRuntimeSummary, inspectedRelease]
);
const publishedResponseGroups = useMemo(() => buildPublishedResponseGroups(inspectedRelease), [inspectedRelease]);
const publishedRuleItems = useMemo(() => buildPublishedRuleItems(inspectedRelease), [inspectedRelease]);
```

- [ ] **Step 4: Keep the utility boundary simple and avoid new backend or SDK changes**

```ts
export function summarizeMockRelease(release: MockReleaseDetail | null): MockRuntimeSummary {
  if (!release) {
    return emptyMockRuntimeSummary();
  }

  return summarizeMockRuntime(
    readReleaseResponses(release.responseSnapshotJson),
    readReleaseRules(release.rulesSnapshotJson)
  );
}
```

- [ ] **Step 5: Re-run focused tests and the web build**

Run: `pnpm --filter web test -- src/features/projects/components/endpoint-editor.test.tsx src/features/projects/components/project-shell.test.tsx`

Expected: PASS

Run: `pnpm --filter web build`

Expected: PASS

- [ ] **Step 6: Commit Task 2**

```bash
git add apps/web/src/features/projects/components/endpoint-editor-utils.ts apps/web/src/features/projects/components/endpoint-editor.tsx apps/web/src/features/projects/components/published-runtime-panel.tsx apps/web/src/features/projects/components/endpoint-editor.test.tsx apps/web/src/features/projects/components/project-shell.test.tsx
git commit -m "feat: clarify published mock release inspection"
```

### Task 3: Final verification and handoff

**Files:**
- Modify: `docs/superpowers/plans/2026-04-11-mock-release-inspector.md`

- [ ] **Step 1: Run the final frontend verification set**

Run: `pnpm --filter web test -- src/features/projects/components/endpoint-editor.test.tsx src/features/projects/components/project-shell.test.tsx`

Expected: PASS

Run: `pnpm --filter web build`

Expected: PASS

- [ ] **Step 2: Check git status and keep only release-inspector changes**

Run: `git status --short`

Expected: only the release-inspector code and this plan file remain in the worktree.

- [ ] **Step 3: Commit the final integration result**

```bash
git add apps/web/src/features/projects/components docs/superpowers/plans/2026-04-11-mock-release-inspector.md
git commit -m "feat: inspect historical mock releases"
```
