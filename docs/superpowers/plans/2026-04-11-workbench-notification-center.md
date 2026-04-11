# Workbench Notification Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a polished workbench-level notification center for important async actions in the project console.

**Architecture:** Create a local toast queue and floating renderer in a dedicated component, then let `ProjectShell` push success and error notifications from its existing async handlers. Keep current inline panel messages when they are still useful context.

**Tech Stack:** `Next.js 15`, `React 19`, `TypeScript`, `Vitest`, `Testing Library`, `Tailwind CSS`

---

### Task 1: Add failing coverage for toast rendering and shell integration

**Files:**
- Create: `apps/web/src/features/projects/components/workbench-notification-center.test.tsx`
- Modify: `apps/web/src/features/projects/components/project-shell.test.tsx`

- [ ] **Step 1: Write a failing toast-center test for manual dismiss and auto-dismiss**

```tsx
it("renders notifications, supports manual dismiss, and auto-clears expired items", () => {
  vi.useFakeTimers();

  function Harness() {
    const { notifications, notify, dismissNotification } = useWorkbenchNotifications({ durationMs: 1200 });

    return (
      <>
        <button
          onClick={() =>
            notify({
              tone: "success",
              title: "Environment created",
              detail: "Staging is ready."
            })
          }
          type="button"
        >
          Push notification
        </button>
        <WorkbenchNotificationCenter notifications={notifications} onDismiss={dismissNotification} />
      </>
    );
  }

  render(<Harness />);

  fireEvent.click(screen.getByRole("button", { name: "Push notification" }));
  expect(screen.getByText("Environment created")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Dismiss notification Environment created" }));
  expect(screen.queryByText("Environment created")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Push notification" }));
  vi.advanceTimersByTime(1200);
  expect(screen.queryByText("Environment created")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Write a failing `ProjectShell` test for success toasts**

```tsx
it("shows a global success notification after creating an environment", async () => {
  render(<ProjectShell projectId={1} />);

  fireEvent.change(screen.getByLabelText("New environment name"), { target: { value: "Staging" } });
  fireEvent.change(screen.getByLabelText("New environment base URL"), { target: { value: "https://staging.dev" } });
  fireEvent.click(screen.getByRole("button", { name: "Add environment" }));

  expect(await screen.findByText("Environment created")).toBeInTheDocument();
  expect(screen.getByText("Staging is now available in the workbench.")).toBeInTheDocument();
});
```

- [ ] **Step 3: Write a failing `ProjectShell` test for error toasts**

```tsx
it("shows a global error notification when project debug policy save fails", async () => {
  updateProject.mockRejectedValueOnce(new Error("Policy save failed"));

  render(<ProjectShell projectId={1} />);

  fireEvent.change(screen.getByLabelText("Project debug rule 1 pattern"), { target: { value: "10.10.1.8" } });
  fireEvent.click(screen.getByRole("button", { name: "Save project debug policy" }));

  expect(await screen.findByText("Policy update failed")).toBeInTheDocument();
  expect(screen.getByText("Policy save failed")).toBeInTheDocument();
});
```

- [ ] **Step 4: Run the focused notification tests and confirm they fail**

Run: `& '.\\node_modules\\.bin\\vitest.cmd' run src/features/projects/components/workbench-notification-center.test.tsx src/features/projects/components/project-shell.test.tsx`

Expected: FAIL because no toast component or global notification wiring exists yet.

### Task 2: Implement the floating notification center and queue

**Files:**
- Create: `apps/web/src/features/projects/components/workbench-notification-center.tsx`
- Test: `apps/web/src/features/projects/components/workbench-notification-center.test.tsx`

- [ ] **Step 1: Add the queue hook and notification types**

```tsx
export type WorkbenchNotificationTone = "success" | "error" | "neutral";

export type WorkbenchNotification = {
  id: string;
  tone: WorkbenchNotificationTone;
  title: string;
  detail?: string;
};

export function useWorkbenchNotifications(options?: { durationMs?: number; maxVisible?: number }) {
  // queue state + auto-dismiss timers + dismiss API
}
```

- [ ] **Step 2: Render a polished floating stack**

```tsx
export function WorkbenchNotificationCenter({
  notifications,
  onDismiss
}: {
  notifications: WorkbenchNotification[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-4 top-4 z-50 flex justify-end">
      <div className="pointer-events-auto flex w-full max-w-md flex-col gap-3">
        {notifications.map((notification) => (
          <article key={notification.id}>
            ...
          </article>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Re-run the toast-center test**

Run: `& '.\\node_modules\\.bin\\vitest.cmd' run src/features/projects/components/workbench-notification-center.test.tsx`

Expected: PASS

### Task 3: Wire workbench notifications into `ProjectShell`

**Files:**
- Modify: `apps/web/src/features/projects/components/project-shell.tsx`
- Test: `apps/web/src/features/projects/components/project-shell.test.tsx`

- [ ] **Step 1: Mount the notification center inside `ProjectShell`**

```tsx
const { notifications, notify, dismissNotification } = useWorkbenchNotifications();

<WorkbenchNotificationCenter notifications={notifications} onDismiss={dismissNotification} />
```

- [ ] **Step 2: Add shell helpers for success and error notifications**

```tsx
function pushSuccess(title: string, detail: string) {
  notify({ tone: "success", title, detail });
}

function pushError(title: string, detail: string) {
  notify({ tone: "error", title, detail });
}
```

- [ ] **Step 3: Emit success toasts from representative mutation handlers**

```tsx
await createEnvironment(projectId, payload);
pushSuccess("Environment created", `${payload.name} is now available in the workbench.`);
```

```tsx
await updateProject(projectId, payload);
pushSuccess("Project policy saved", "Debug target guardrails were updated.");
```

```tsx
await clearDebugHistory(projectId, filters);
pushSuccess("Debug history cleared", "The selected request records were removed.");
```

- [ ] **Step 4: Emit error toasts from mutation failure paths**

```tsx
const message = updateError instanceof Error ? updateError.message : "Failed to update project debug policy";
setError(message);
pushError("Policy update failed", message);
```

- [ ] **Step 5: Re-run focused notification tests**

Run: `& '.\\node_modules\\.bin\\vitest.cmd' run src/features/projects/components/workbench-notification-center.test.tsx src/features/projects/components/project-shell.test.tsx`

Expected: PASS

### Task 4: Full verification and commit

**Files:**
- Verify: `apps/web/src/features/projects/components/workbench-notification-center.tsx`
- Verify: `apps/web/src/features/projects/components/project-shell.tsx`
- Verify: `apps/web/src/features/projects/components/workbench-notification-center.test.tsx`
- Verify: `apps/web/src/features/projects/components/project-shell.test.tsx`
- Modify: `docs/superpowers/specs/2026-04-11-workbench-notification-center-design.md`
- Modify: `docs/superpowers/plans/2026-04-11-workbench-notification-center.md`

- [ ] **Step 1: Run the focused notification verification set**

Run: `& '.\\node_modules\\.bin\\vitest.cmd' run src/features/projects/components/workbench-notification-center.test.tsx src/features/projects/components/project-shell.test.tsx`

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
git add apps/web/src/features/projects/components/workbench-notification-center.tsx apps/web/src/features/projects/components/workbench-notification-center.test.tsx apps/web/src/features/projects/components/project-shell.tsx apps/web/src/features/projects/components/project-shell.test.tsx docs/superpowers/specs/2026-04-11-workbench-notification-center-design.md docs/superpowers/plans/2026-04-11-workbench-notification-center.md
git commit -m "feat: add workbench notification center"
```
