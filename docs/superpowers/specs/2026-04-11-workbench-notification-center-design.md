# Workbench Notification Center Design

> Date: 2026-04-11
> Scope: project workbench global notifications, async action feedback, and polished floating toast UI

## Goal

Add a workbench-level notification center so users get consistent, visible feedback for important actions across the project console without hunting through individual panels.

This should make saves, publishes, restores, environment edits, member operations, and cleanup actions feel deliberate and trustworthy.

## Current State

The console currently has fragmented feedback:

- some panels show inline success copy
- some shell actions only update the top error banner
- some mutations complete with no obvious global signal
- feedback is visually inconsistent across the workbench

The result is functional, but not cohesive. Users need to scan multiple regions to confirm whether an action worked.

## Approaches Considered

### 1. Keep all feedback inline and just restyle existing messages

Pros:

- lowest implementation cost
- no new state model

Cons:

- feedback remains fragmented by panel
- users still need to look in different places depending on the action

### 2. Add a lightweight custom toast center owned by `ProjectShell`

Pros:

- keeps the scope local to the current workbench
- no third-party dependency
- easy to wire into existing async handlers that already live in `ProjectShell`
- preserves current panel-specific messages where local context still helps

Cons:

- requires a new queue/timer model
- introduces another feedback layer that must stay visually disciplined

### 3. Introduce a full app-wide notification provider

Pros:

- reusable across pages

Cons:

- broader scope than the current need
- would force routing/layout decisions that are not yet necessary

## Recommendation

Use approach 2.

Build a custom floating notification center for the project workbench, owned by `ProjectShell`, and wire it into the existing async mutation handlers. This gives the product a strong UX improvement without expanding the scope to the whole application shell.

## UX Design

### 1. Floating command-deck layout

Render notifications as a fixed stack near the top-right of the workbench on desktop and as a full-width top stack on smaller screens.

The cards should feel premium rather than generic:

- soft glass surfaces
- tonal accents
- compact title + supporting detail
- clear close affordance

### 2. Notification tones

Use three tones only:

- success
- error
- neutral

No warning/info taxonomy expansion yet. Keep the system small and legible.

### 3. Queue behavior

Notifications should:

- auto-dismiss after a short interval
- allow manual dismiss
- cap the visible stack to a small number
- prioritize newest notifications first

### 4. Feedback policy

Use global notifications for cross-panel actions that affect workspace state:

- create / rename / delete tree nodes
- create / update / delete environments
- save project debug policy
- member add / update / delete
- endpoint save / parameter save / response save
- mock rule save / publish mock release / save version / restore version
- clear debug history

Keep local, contextual banners where they are already valuable:

- debug console preset/cURL messages
- version panel restore inline copy

The global system complements those messages rather than forcing every local state into one channel.

## Architecture

### `apps/web/src/features/projects/components/workbench-notification-center.tsx`

Create a focused component + hook pair:

- `useWorkbenchNotifications()`
- `WorkbenchNotificationCenter`

The hook owns:

- queue state
- id generation
- auto-dismiss timers
- max-stack enforcement

The component only renders.

### `apps/web/src/features/projects/components/project-shell.tsx`

`ProjectShell` becomes the orchestration boundary:

- create the notification queue
- render the notification center once
- emit success/error notifications inside existing async handlers

This keeps toast logic aligned with where the mutations already happen.

## Data Model

Each notification should carry:

- `id`
- `tone`
- `title`
- `detail`

No action buttons, persistence, categories, or cross-tab syncing in this iteration.

## Testing Strategy

1. add failing toast-center tests for render, manual dismiss, and auto-dismiss
2. add failing `ProjectShell` integration coverage for representative success and error flows
3. implement the smallest queue + UI
4. wire shell handlers
5. rerun focused tests, then full web tests, then build

## Non-Goals

- third-party toast library adoption
- app-wide provider outside the project workbench
- persisted notification history
- undo actions
- replacing every inline message in the application
