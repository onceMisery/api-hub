# Mock Matchboard Design

> Date: 2026-04-11
> Scope: draft mock simulation trace and visual rule matchboard inside the endpoint editor

## Goal

Upgrade the draft mock simulator from a single resolved result into a real inspection surface that explains:

- which rule won
- which rules were skipped and why
- which rules were never evaluated because a higher-priority rule already matched
- which rules are disabled and therefore outside the runtime path

This round should make mock-rule debugging materially faster without changing published runtime behavior.

## Current State

The workbench already supports:

- draft mock-rule editing
- query/header/body sample input
- backend simulation against the current draft
- a final resolved response with a short explanation list

What is still missing:

- no rule-by-rule inspection ledger
- no explicit difference between `matched`, `skipped`, `disabled`, and `not evaluated`
- users still have to infer why a lower-priority rule did not run
- the simulator is useful for the winner, but weak for diagnosis

This is the last practical gap between “we have a mock simulator” and “we can reliably debug mock-rule behavior”.

## Approaches Considered

### 1. Beautify the existing explanation list only

Pros:

- cheapest change
- almost no backend impact

Cons:

- still hides the non-winning rule path
- does not solve the main diagnosis problem

### 2. Reimplement matching logic in the frontend and render a local trace

Pros:

- fast UI iteration
- no API contract change

Cons:

- guaranteed drift from backend matching semantics
- future rule upgrades would require duplicating logic twice

### 3. Return a structured rule trace from the backend and render a Matchboard in the editor

Pros:

- backend and UI stay behaviorally aligned
- directly explains why each rule matched, skipped, or stopped
- fits the current simulator workflow instead of creating a new page

Cons:

- requires DTO and test updates across backend, SDK, and web

## Recommendation

Use approach 3.

The backend mock resolver already owns the real matching logic. It should emit a structured trace for every draft rule in evaluation order, and the web editor should turn that into a high-signal visual Matchboard.

This keeps the explanation source authoritative and gives the user a much better debugging surface without inventing a second simulation engine.

## Product Design

### 1. Matchboard layout

Keep the current sample-input and final-result flow, but add a new `Rule Matchboard` section under the simulation summary.

The matchboard should feel like a control deck:

- compact metric chips for winner, evaluated rules, and skipped rules
- high-contrast status badges
- one card per rule with strong priority and outcome hierarchy
- clear scan order from highest priority to lowest priority

### 2. Rule states

Each rule card should show exactly one of:

- `Matched`
- `Skipped`
- `Not evaluated`
- `Disabled`

These states must be explicit, not inferred from prose.

### 3. Condition evidence

Each rule card should expose structured condition evidence:

- matched query/header/body checks
- first failed check when skipped
- short reason when disabled
- short reason when not evaluated because an earlier rule already won

The user should not need to read raw backend logs to understand the decision path.

### 4. Fallback visibility

When no rule matches, the matchboard should still be useful:

- all evaluated rules should show `Skipped`
- the summary should make the default response fallback explicit
- the fallback body should remain visible in the existing result surface

## Architecture

### Backend: `MockRuntimeResolver`

Extend the simulation result contract with structured per-rule traces.

Recommended shape:

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

`status` should be one of:

- `matched`
- `skipped`
- `not_evaluated`
- `disabled`

`checks` holds condition-level evidence in render order. `summary` is a short one-line statement for badge-level reading.

### Backend DTO boundary

Extend `MockSimulationResult` rather than creating a second response model. The simulation API already represents draft-only analysis, so the trace belongs inside the same contract.

Recommended addition:

```java
List<MockRuleTraceItem> ruleTraces
```

### SDK: `packages/api-sdk`

Mirror the new trace type and attach it to `MockSimulationResult`. No new endpoints are needed.

### Web: simulator presentation

Keep `EndpointEditor` as the orchestration boundary, but avoid bloating `endpoint-mock-simulator-panel.tsx`.

Create a focused presentational component for the new ledger:

- `apps/web/src/features/projects/components/mock-rule-matchboard.tsx`

Responsibilities:

- render summary chips from `ruleTraces`
- render one visual card per rule
- keep all status-color and label mapping local to the matchboard

### Existing components

`endpoint-mock-simulator-panel.tsx` should remain responsible for:

- sample input
- run button
- final response summary/body

It should delegate the new visual ledger to `mock-rule-matchboard.tsx`.

## Data Flow

1. user edits draft rules and sample request input
2. frontend calls the existing mock simulation API
3. backend resolver evaluates rules in real runtime order
4. resolver returns:
   - final result
   - winner metadata
   - per-rule trace list
5. frontend renders:
   - final simulation result
   - rule matchboard

Published mock runtime remains unchanged.

## Error Handling

- if the simulation request contains no rules, return an empty trace list and keep the fallback summary explicit
- invalid JSON request bodies should continue degrading to “no body match”, not a hard server error
- frontend should tolerate missing or empty `ruleTraces` by hiding the matchboard instead of crashing

## Testing Strategy

1. add failing backend tests for mixed rule outcomes: matched, skipped, disabled, and not evaluated
2. rerun focused backend simulation tests and confirm the new trace fails before implementation
3. add failing frontend editor tests that assert the new matchboard states and summaries render
4. implement backend trace generation first
5. extend SDK types
6. implement the new frontend matchboard and wire it into the simulator panel
7. rerun focused tests, then full frontend tests and build

## Non-Goals

- changing published mock runtime behavior
- adding a new mock simulation endpoint
- adding regex or fuzzy condition operators
- changing mock release storage format
- adding team-level mock analytics or audit logs
