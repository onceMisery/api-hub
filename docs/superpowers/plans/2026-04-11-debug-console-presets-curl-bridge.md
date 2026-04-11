# Debug Console Presets And cURL Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the debug console with reusable request presets plus cURL import/export tooling without changing backend contracts.

**Architecture:** Keep all state client-side. Add a focused debug-console utility module for localStorage preset persistence and cURL parsing/generation, then wire a richer operator UI inside `DebugConsole` and cover the flow with component tests.

**Tech Stack:** `Next.js 15`, `React 19`, `TypeScript`, `Vitest`, `Testing Library`, `Tailwind CSS`

---

### Task 1: Add failing tests for presets and cURL flows

**Files:**
- Modify: `apps/web/src/features/projects/components/debug-console.test.tsx`
- Create: `apps/web/src/features/projects/components/debug-console-utils.ts`

- [ ] **Step 1: Write a failing test for saving and applying a request preset**

```tsx
it("saves a named preset locally and re-applies it to the draft", async () => {
  renderDebugConsole();

  fireEvent.change(screen.getByLabelText("Query string"), { target: { value: "mode=strict" } });
  fireEvent.change(screen.getByLabelText("Headers"), { target: { value: "X-Trace: abc" } });
  fireEvent.change(screen.getByLabelText("Body"), { target: { value: "{\"user\":31}" } });
  fireEvent.change(screen.getByLabelText("Preset name"), { target: { value: "Strict user trace" } });
  fireEvent.click(screen.getByRole("button", { name: "Save preset" }));

  expect(await screen.findByText("Strict user trace")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Query string"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Apply preset Strict user trace" }));

  expect(screen.getByLabelText("Query string")).toHaveValue("mode=strict");
  expect(screen.getByLabelText("Headers")).toHaveValue("X-Trace: abc");
  expect(screen.getByLabelText("Body")).toHaveValue("{\"user\":31}");
});
```

- [ ] **Step 2: Write a failing test for cURL export and import**

```tsx
it("exports the current request as cURL and imports a pasted cURL command", async () => {
  renderDebugConsole();

  fireEvent.change(screen.getByLabelText("Query string"), { target: { value: "verbose=true" } });
  fireEvent.change(screen.getByLabelText("Headers"), { target: { value: "Authorization: Bearer token" } });
  fireEvent.change(screen.getByLabelText("Body"), { target: { value: "{\"name\":\"Alice\"}" } });

  expect(screen.getByLabelText("Generated cURL")).toHaveValue(expect.stringContaining("curl"));
  expect(screen.getByLabelText("Generated cURL")).toHaveValue(expect.stringContaining("verbose=true"));

  fireEvent.change(screen.getByLabelText("Import cURL"), {
    target: {
      value: "curl 'https://local.dev/users/{id}?mode=compact' -X GET -H 'X-Trace: imported' --data-raw '{\"from\":\"curl\"}'"
    }
  });
  fireEvent.click(screen.getByRole("button", { name: "Import cURL" }));

  expect(screen.getByLabelText("Query string")).toHaveValue("mode=compact");
  expect(screen.getByLabelText("Headers")).toHaveValue("X-Trace: imported");
  expect(screen.getByLabelText("Body")).toHaveValue("{\"from\":\"curl\"}");
});
```

- [ ] **Step 3: Run the focused test and confirm the new debug-console expectations fail**

Run: `& '.\\node_modules\\.bin\\vitest.cmd' run src/features/projects/components/debug-console.test.tsx`

Expected: FAIL because the preset and cURL controls do not exist yet.

### Task 2: Add debug-console utilities for preset storage and cURL conversion

**Files:**
- Create: `apps/web/src/features/projects/components/debug-console-utils.ts`
- Test: `apps/web/src/features/projects/components/debug-console.test.tsx`

- [ ] **Step 1: Add typed helpers for local presets**

```ts
export type DebugRequestPreset = {
  id: string;
  name: string;
  queryString: string;
  headersText: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export function buildDebugPresetStorageKey(projectId: number, endpointId: number) {
  return `apihub.debug-presets.v1.project-${projectId}.endpoint-${endpointId}`;
}

export function readDebugPresets(projectId: number, endpointId: number): DebugRequestPreset[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(buildDebugPresetStorageKey(projectId, endpointId));
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
```

- [ ] **Step 2: Add cURL generation and import parsing helpers**

```ts
export function generateDebugCurlCommand(input: {
  method: string;
  url: string | null;
  headersText: string;
  body: string;
}) {
  if (!input.url) {
    return "";
  }

  const segments = [`curl '${escapeSingleQuotes(input.url)}'`, `-X ${input.method.toUpperCase()}`];
  for (const header of splitHeaderLines(input.headersText)) {
    segments.push(`-H '${escapeSingleQuotes(header)}'`);
  }
  if (input.body.trim()) {
    segments.push(`--data-raw '${escapeSingleQuotes(input.body)}'`);
  }
  return segments.join(" ");
}
```

```ts
export function parseDebugCurlCommand(command: string) {
  // Return { method, url, headersText, body } or throw on unsupported syntax.
}
```

- [ ] **Step 3: Re-run the focused debug-console test and confirm the failures narrow to missing UI wiring**

Run: `& '.\\node_modules\\.bin\\vitest.cmd' run src/features/projects/components/debug-console.test.tsx`

Expected: still FAIL, but for missing rendered controls or event wiring rather than missing utility symbols.

### Task 3: Wire the preset shelf and cURL bridge into the debug console

**Files:**
- Modify: `apps/web/src/features/projects/components/debug-console.tsx`
- Modify: `apps/web/src/features/projects/components/debug-console.test.tsx`

- [ ] **Step 1: Scope presets from the existing debug context**

```tsx
const presetScope = {
  projectId: environment?.projectId ?? null,
  endpointId: endpoint?.id ?? null
};
```

- [ ] **Step 2: Add preset state, save/apply/delete actions, and local messages**

```tsx
const [presetName, setPresetName] = useState("");
const [presets, setPresets] = useState<DebugRequestPreset[]>([]);
const [presetMessage, setPresetMessage] = useState<string | null>(null);
const [curlImportText, setCurlImportText] = useState("");
const [curlMessage, setCurlMessage] = useState<string | null>(null);
const [curlWarning, setCurlWarning] = useState<string | null>(null);
```

```tsx
useEffect(() => {
  if (!endpoint) {
    setPresets([]);
    return;
  }

  setPresets(readDebugPresets(projectId, endpoint.id));
}, [endpoint?.id, projectId]);
```

- [ ] **Step 3: Render a polished presets panel**

```tsx
<div className="rounded-[1.8rem] border border-white/60 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.92),_rgba(241,245,249,0.88)_55%,_rgba(226,232,240,0.82)_100%)] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
  <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
    <Field label="Preset name">
      <input aria-label="Preset name" value={presetName} />
    </Field>
    <button type="button">Save preset</button>
  </div>
</div>
```

- [ ] **Step 4: Render a cURL bridge card and hydrate the form on import**

```tsx
<Field label="Generated cURL">
  <textarea aria-label="Generated cURL" readOnly value={generatedCurl} />
</Field>

<Field label="Import cURL">
  <textarea aria-label="Import cURL" value={curlImportText} />
</Field>
```

- [ ] **Step 5: Re-run the focused debug-console test**

Run: `& '.\\node_modules\\.bin\\vitest.cmd' run src/features/projects/components/debug-console.test.tsx`

Expected: PASS

### Task 4: Full verification and commit

**Files:**
- Verify: `apps/web/src/features/projects/components/debug-console.tsx`
- Verify: `apps/web/src/features/projects/components/debug-console-utils.ts`
- Verify: `apps/web/src/features/projects/components/debug-console.test.tsx`
- Modify: `docs/superpowers/specs/2026-04-11-debug-console-presets-curl-bridge-design.md`
- Modify: `docs/superpowers/plans/2026-04-11-debug-console-presets-curl-bridge.md`

- [ ] **Step 1: Run the focused debug-console test**

Run: `& '.\\node_modules\\.bin\\vitest.cmd' run src/features/projects/components/debug-console.test.tsx`

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
git add apps/web/src/features/projects/components/debug-console.tsx apps/web/src/features/projects/components/debug-console-utils.ts apps/web/src/features/projects/components/debug-console.test.tsx docs/superpowers/specs/2026-04-11-debug-console-presets-curl-bridge-design.md docs/superpowers/plans/2026-04-11-debug-console-presets-curl-bridge.md
git commit -m "feat: add debug presets and curl bridge"
```
