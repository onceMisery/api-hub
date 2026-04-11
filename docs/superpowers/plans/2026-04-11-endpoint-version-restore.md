# Endpoint Version Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-click restore flow that rolls a historical endpoint version snapshot back into the current persisted workspace draft.

**Architecture:** Keep restore orchestration in the web app. Parse snapshots strictly in editor utilities, let the version panel trigger restore actions, and have `ProjectShell` persist the restored endpoint basics, parameters, and responses through the existing APIs before refreshing local state.

**Tech Stack:** `Next.js 15`, `React 19`, `TypeScript`, `Vitest`, `Testing Library`

---

### Task 1: Add failing restore tests for the editor and shell flows

**Files:**
- Modify: `apps/web/src/features/projects/components/endpoint-editor.test.tsx`
- Modify: `apps/web/src/features/projects/components/project-shell.test.tsx`

- [ ] **Step 1: Write a failing editor test for restoring a selected version**

```tsx
it("restores a selected version snapshot through the restore callback", async () => {
  const onRestoreVersion = vi.fn().mockResolvedValue(undefined);

  render(
    <EndpointEditor
      endpoint={{ id: 7, groupId: 3, name: "Get User", method: "GET", path: "/users/{id}", description: "Load", mockEnabled: false }}
      projectId={1}
      onRestoreVersion={onRestoreVersion}
      versions={[
        {
          id: 1,
          endpointId: 7,
          version: "v1",
          changeSummary: "Initial release",
          snapshotJson: JSON.stringify({
            endpoint: { name: "Get User Legacy", method: "POST", path: "/legacy/users", description: "Legacy" },
            parameters: [{ sectionType: "query", name: "expand", dataType: "string", required: false, description: "", exampleValue: "" }],
            responses: [{ httpStatusCode: 202, mediaType: "application/json", name: "jobId", dataType: "string", required: true, description: "", exampleValue: "job_1" }]
          })
        }
      ]}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: "Restore snapshot v1" }));

  await waitFor(() =>
    expect(onRestoreVersion).toHaveBeenCalledWith(
      expect.objectContaining({ version: "v1" }),
      expect.objectContaining({
        endpoint: expect.objectContaining({ name: "Get User Legacy", method: "POST", path: "/legacy/users" })
      })
    )
  );
});
```

- [ ] **Step 2: Write a failing shell test for persisted restore**

```tsx
it("restores a historical version into the current endpoint workspace", async () => {
  fetchEndpointVersions.mockResolvedValueOnce({
    data: [
      {
        id: 2,
        endpointId: 31,
        version: "v2",
        changeSummary: "Latest",
        snapshotJson: "{}"
      },
      {
        id: 1,
        endpointId: 31,
        version: "v1",
        changeSummary: "Rollback target",
        snapshotJson: JSON.stringify({
          endpoint: { name: "Get User Legacy", method: "POST", path: "/legacy/users", description: "Legacy" },
          parameters: [{ sectionType: "query", name: "expand", dataType: "string", required: false, description: "", exampleValue: "team" }],
          responses: [{ httpStatusCode: 202, mediaType: "application/json", name: "jobId", dataType: "string", required: true, description: "", exampleValue: "job_1" }]
        })
      }
    ]
  });

  render(<ProjectShell projectId={1} />);

  fireEvent.click(await screen.findByRole("button", { name: "Restore snapshot v1" }));

  await waitFor(() =>
    expect(updateEndpoint).toHaveBeenCalledWith(31, {
      description: "Legacy",
      method: "POST",
      mockEnabled: false,
      name: "Get User Legacy",
      path: "/legacy/users"
    })
  );
  await waitFor(() =>
    expect(replaceEndpointParameters).toHaveBeenCalledWith(31, [
      { sectionType: "query", name: "expand", dataType: "string", required: false, description: "", exampleValue: "team" }
    ])
  );
  await waitFor(() =>
    expect(replaceEndpointResponses).toHaveBeenCalledWith(31, [
      { httpStatusCode: 202, mediaType: "application/json", name: "jobId", dataType: "string", required: true, description: "", exampleValue: "job_1" }
    ])
  );
});
```

- [ ] **Step 3: Run the focused restore tests and confirm they fail**

Run: `& '.\\node_modules\\.bin\\vitest.cmd' run src/features/projects/components/endpoint-editor.test.tsx src/features/projects/components/project-shell.test.tsx`

Expected: FAIL because no restore action exists yet.

### Task 2: Add strict snapshot restore helpers

**Files:**
- Modify: `apps/web/src/features/projects/components/endpoint-editor-utils.ts`
- Test: `apps/web/src/features/projects/components/endpoint-editor.test.tsx`

- [ ] **Step 1: Add a strict restorable snapshot parser**

```ts
export function parseRestorableSnapshot(snapshotJson: string | null): SnapshotShape {
  if (!snapshotJson) {
    throw new Error("Version snapshot is empty.");
  }

  const normalized = normalizeSnapshot(snapshotJson);
  if (!normalized.endpoint.name.trim() || !normalized.endpoint.method.trim() || !normalized.endpoint.path.trim()) {
    throw new Error("Version snapshot cannot be restored.");
  }

  return normalized;
}
```

- [ ] **Step 2: Add payload mappers for restore**

```ts
export function buildEndpointRestorePayload(snapshot: SnapshotShape, currentMockEnabled: boolean): UpdateEndpointPayload {
  return {
    description: snapshot.endpoint.description,
    method: snapshot.endpoint.method,
    mockEnabled: currentMockEnabled,
    name: snapshot.endpoint.name,
    path: snapshot.endpoint.path
  };
}

export function buildParameterRestorePayload(snapshot: SnapshotShape): ParameterUpsertItem[] {
  return snapshot.parameters.map((parameter) => ({ ...parameter }));
}

export function buildResponseRestorePayload(snapshot: SnapshotShape): ResponseUpsertItem[] {
  return snapshot.responses.map((response) => ({ ...response }));
}
```

- [ ] **Step 3: Re-run the focused restore tests and confirm failures narrow to missing UI and shell wiring**

Run: `& '.\\node_modules\\.bin\\vitest.cmd' run src/features/projects/components/endpoint-editor.test.tsx src/features/projects/components/project-shell.test.tsx`

Expected: still FAIL, but for missing buttons or callbacks rather than missing helper behavior.

### Task 3: Wire restore actions into the version panel and editor

**Files:**
- Modify: `apps/web/src/features/projects/components/endpoint-version-panel.tsx`
- Modify: `apps/web/src/features/projects/components/endpoint-editor.tsx`
- Modify: `apps/web/src/features/projects/components/endpoint-editor.test.tsx`

- [ ] **Step 1: Extend the version panel props with restore capability**

```tsx
type EndpointVersionPanelProps = {
  ...
  isRestoring: boolean;
  restoreMessage: string | null;
  onRestoreVersion?: (version: VersionDetail) => void;
};
```

- [ ] **Step 2: Add restore buttons in the compare area and version cards**

```tsx
{compareVersion && onRestoreVersion ? (
  <button type="button" onClick={() => onRestoreVersion(compareVersion)}>
    Restore selected snapshot
  </button>
) : null}
```

```tsx
<button
  aria-label={`Restore snapshot ${version.version}`}
  onClick={() => onRestoreVersion?.(version)}
  type="button"
>
  Restore snapshot
</button>
```

- [ ] **Step 3: Parse and delegate restore in `EndpointEditor`**

```tsx
async function handleRestoreVersion(version: VersionDetail) {
  if (!onRestoreVersion) {
    return;
  }

  setIsRestoring(true);
  setRestoreMessage(null);

  try {
    const snapshot = parseRestorableSnapshot(version.snapshotJson);
    await onRestoreVersion(version, snapshot);
    setCompareVersionId(String(version.id));
    setRestoreMessage(`Restored snapshot from ${version.version}. Save a new version if you want to record this rollback.`);
  } finally {
    setIsRestoring(false);
  }
}
```

- [ ] **Step 4: Re-run the focused editor restore test**

Run: `& '.\\node_modules\\.bin\\vitest.cmd' run src/features/projects/components/endpoint-editor.test.tsx`

Expected: PASS for the restore UI/callback behavior

### Task 4: Persist restore in `ProjectShell`

**Files:**
- Modify: `apps/web/src/features/projects/components/project-shell.tsx`
- Modify: `apps/web/src/features/projects/components/project-shell.test.tsx`

- [ ] **Step 1: Add a persisted restore handler**

```tsx
async function handleRestoreVersion(version: VersionDetail, snapshot: SnapshotShape) {
  if (!selectedEndpointId || !endpoint) {
    return;
  }

  setError(null);

  try {
    await updateEndpoint(selectedEndpointId, buildEndpointRestorePayload(snapshot, endpoint.mockEnabled));
    await replaceEndpointParameters(selectedEndpointId, buildParameterRestorePayload(snapshot));
    await replaceEndpointResponses(selectedEndpointId, buildResponseRestorePayload(snapshot));

    const [endpointResponse, parameterResponse, responseResponse] = await Promise.all([
      fetchEndpoint(selectedEndpointId),
      fetchEndpointParameters(selectedEndpointId),
      fetchEndpointResponses(selectedEndpointId)
    ]);

    setEndpoint(endpointResponse.data);
    setParameters(parameterResponse.data);
    setResponses(responseResponse.data);
    await reloadTree(selectedEndpointId);
  } catch (restoreError) {
    if (handleUnauthorized(restoreError)) {
      return;
    }

    setError(restoreError instanceof Error ? restoreError.message : "Failed to restore version snapshot");
    throw restoreError;
  }
}
```

- [ ] **Step 2: Pass the restore callback into `EndpointEditor`**

```tsx
<EndpointEditor
  ...
  onRestoreVersion={handleRestoreVersion}
  ...
/>
```

- [ ] **Step 3: Re-run the focused shell restore test**

Run: `& '.\\node_modules\\.bin\\vitest.cmd' run src/features/projects/components/project-shell.test.tsx`

Expected: PASS

### Task 5: Full verification and commit

**Files:**
- Verify: `apps/web/src/features/projects/components/endpoint-editor-utils.ts`
- Verify: `apps/web/src/features/projects/components/endpoint-version-panel.tsx`
- Verify: `apps/web/src/features/projects/components/endpoint-editor.tsx`
- Verify: `apps/web/src/features/projects/components/project-shell.tsx`
- Verify: `apps/web/src/features/projects/components/endpoint-editor.test.tsx`
- Verify: `apps/web/src/features/projects/components/project-shell.test.tsx`
- Modify: `docs/superpowers/specs/2026-04-11-endpoint-version-restore-design.md`
- Modify: `docs/superpowers/plans/2026-04-11-endpoint-version-restore.md`

- [ ] **Step 1: Run the focused restore verification set**

Run: `& '.\\node_modules\\.bin\\vitest.cmd' run src/features/projects/components/endpoint-editor.test.tsx src/features/projects/components/project-shell.test.tsx`

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
git add apps/web/src/features/projects/components/endpoint-editor-utils.ts apps/web/src/features/projects/components/endpoint-version-panel.tsx apps/web/src/features/projects/components/endpoint-editor.tsx apps/web/src/features/projects/components/project-shell.tsx apps/web/src/features/projects/components/endpoint-editor.test.tsx apps/web/src/features/projects/components/project-shell.test.tsx docs/superpowers/specs/2026-04-11-endpoint-version-restore-design.md docs/superpowers/plans/2026-04-11-endpoint-version-restore.md
git commit -m "feat: add endpoint version restore flow"
```
