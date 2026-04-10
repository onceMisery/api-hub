# Mock Runtime Release Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 endpoint 编辑器里明确展示 Mock 草稿态与已发布运行态的边界，并让最新发布快照的内容摘要可见。

**Architecture:** 保持现有后端发布/运行语义不变，只增强 `EndpointEditor` 的只读展示层。前端直接解析 `mockReleases[0]` 的 `responseSnapshotJson` 与 `rulesSnapshotJson`，生成“当前草稿摘要”“当前运行态摘要”“未发布差异提示”三组只读信息。

**Tech Stack:** `Next.js 15`, `React 19`, `TypeScript`, `Vitest`, `Testing Library`

---

### Task 1: 用失败测试固定发布摘要和边界文案

**Files:**
- Modify: `apps/web/src/features/projects/components/endpoint-editor.test.tsx`
- Test: `apps/web/src/features/projects/components/endpoint-editor.test.tsx`

- [ ] **Step 1: 先写失败测试，覆盖已发布快照摘要与未发布差异**

```tsx
it("shows published runtime snapshot summary and draft drift details", () => {
  render(
    <EndpointEditor
      endpoint={{
        id: 7,
        groupId: 3,
        name: "Get User",
        method: "GET",
        path: "/users/{id}",
        description: "Load a single user",
        mockEnabled: true
      }}
      projectId={1}
      responses={[
        {
          id: 1,
          httpStatusCode: 200,
          mediaType: "application/json",
          name: "userId",
          dataType: "string",
          required: true,
          description: "User identifier",
          exampleValue: "u_1001",
          sortOrder: 0
        },
        {
          id: 2,
          httpStatusCode: 200,
          mediaType: "application/json",
          name: "role",
          dataType: "string",
          required: true,
          description: "Role",
          exampleValue: "admin",
          sortOrder: 1
        }
      ]}
      mockRules={[
        {
          id: 11,
          endpointId: 7,
          ruleName: "Unauthorized",
          priority: 100,
          enabled: true,
          queryConditions: [{ name: "mode", value: "strict" }],
          headerConditions: [],
          statusCode: 401,
          mediaType: "application/json",
          body: "{\"error\":\"token expired\"}"
        }
      ]}
      mockReleases={[
        {
          id: 21,
          endpointId: 7,
          releaseNo: 3,
          responseSnapshotJson: "[{\"httpStatusCode\":200,\"mediaType\":\"application/json\",\"name\":\"userId\",\"dataType\":\"string\",\"required\":true,\"description\":\"\",\"exampleValue\":\"u_1001\"}]",
          rulesSnapshotJson: "[]",
          createdAt: "2026-04-09T12:20:00Z"
        }
      ]}
      versions={[]}
    />
  );

  expect(screen.getByText("Draft has unpublished mock changes.")).toBeInTheDocument();
  expect(screen.getByText("Published response fields")).toBeInTheDocument();
  expect(screen.getByText("1 field across 1 status group")).toBeInTheDocument();
  expect(screen.getByText("Draft response fields")).toBeInTheDocument();
  expect(screen.getByText("2 fields across 1 status group")).toBeInTheDocument();
  expect(screen.getByText("Published rules")).toBeInTheDocument();
  expect(screen.getByText("0 enabled of 0 total")).toBeInTheDocument();
  expect(screen.getByText("Draft rules")).toBeInTheDocument();
  expect(screen.getByText("1 enabled of 1 total")).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试确认当前实现还没有这些摘要**

Run: `pnpm --filter web test -- src/features/projects/components/endpoint-editor.test.tsx`
Expected: FAIL，提示找不到新摘要文案。

- [ ] **Step 3: 提交这一轮测试改动**

```bash
git add apps/web/src/features/projects/components/endpoint-editor.test.tsx
git commit -m "test: cover mock runtime release summary visibility"
```

### Task 2: 在 EndpointEditor 增加发布快照摘要与差异卡片

**Files:**
- Modify: `apps/web/src/features/projects/components/endpoint-editor.tsx`
- Modify: `apps/web/src/features/projects/components/endpoint-editor.test.tsx`

- [ ] **Step 1: 增加发布快照解析与摘要 helper**

```tsx
type MockRuntimeSnapshotSummary = {
  responseFieldCount: number;
  responseGroupCount: number;
  totalRuleCount: number;
  enabledRuleCount: number;
};

const publishedRuntimeSummary = useMemo(
  () => summarizeMockRelease(latestRelease),
  [latestRelease]
);
const draftRuntimeSummary = useMemo(
  () => summarizeDraftRuntime(responseRows, mockRuleRows),
  [responseRows, mockRuleRows]
);
const runtimeDiffItems = useMemo(
  () => buildRuntimeDiffItems(publishedRuntimeSummary, draftRuntimeSummary),
  [publishedRuntimeSummary, draftRuntimeSummary]
);
```

- [ ] **Step 2: 在 `Published Runtime` 区块渲染三层信息**

```tsx
<div className="grid gap-4 md:grid-cols-3">
  <PreviewMetric label="Published response fields" value={formatFieldSummary(publishedRuntimeSummary)} />
  <PreviewMetric label="Published rules" value={formatRuleSummary(publishedRuntimeSummary)} />
  <PreviewMetric label="Draft response fields" value={formatFieldSummary(draftRuntimeSummary)} />
</div>

<div className="grid gap-4 md:grid-cols-2">
  <PreviewMetric label="Draft rules" value={formatRuleSummary(draftRuntimeSummary)} />
  <PreviewMetric label="Runtime boundary" value={latestRelease ? "Runtime reads only the published snapshot." : "Runtime has no published snapshot yet."} />
</div>

{runtimeDiffItems.length > 0 ? (
  <div>
    <p>Draft has unpublished mock changes.</p>
    {runtimeDiffItems.map((item) => (
      <p key={item}>{item}</p>
    ))}
  </div>
) : null}
```

- [ ] **Step 3: 运行测试确认新 UI 通过**

Run: `pnpm --filter web test -- src/features/projects/components/endpoint-editor.test.tsx`
Expected: PASS

- [ ] **Step 4: 提交实现**

```bash
git add apps/web/src/features/projects/components/endpoint-editor.tsx apps/web/src/features/projects/components/endpoint-editor.test.tsx
git commit -m "feat: clarify published mock runtime visibility"
```

### Task 3: 做最小范围回归验证

**Files:**
- Modify: `apps/web/src/features/projects/components/endpoint-editor.tsx`
- Modify: `apps/web/src/features/projects/components/endpoint-editor.test.tsx`

- [ ] **Step 1: 跑编辑器与工作台相关测试**

Run: `pnpm --filter web test -- src/features/projects/components/endpoint-editor.test.tsx src/features/projects/components/project-shell.test.tsx`
Expected: PASS

- [ ] **Step 2: 跑前端构建**

Run: `pnpm --filter web build`
Expected: PASS

- [ ] **Step 3: 检查变更范围**

Run: `git status --short`
Expected: 仅包含计划文件、`endpoint-editor` 及对应测试，外加既有构建产物未跟踪目录。

- [ ] **Step 4: 提交最终集成**

```bash
git add docs/superpowers/plans/2026-04-10-mock-runtime-release-visibility.md apps/web/src/features/projects/components/endpoint-editor.tsx apps/web/src/features/projects/components/endpoint-editor.test.tsx
git commit -m "feat: surface published mock runtime summaries"
```

## Self-Review

### Spec coverage
- 发布态摘要可见：Task 1, Task 2
- 草稿态与发布态边界说明：Task 2
- 不改后端协议和运行逻辑：Task 2 仅限前端展示层

### Placeholder scan
- 所有任务都包含精确文件路径、命令和预期结果
- 没有 `TODO`、`TBD` 或“后续补齐”描述

### Type consistency
- 已发布态统一使用 `MockReleaseDetail`
- 草稿态摘要只来源于 `responseRows` 与 `mockRuleRows`
- 差异提示基于摘要值对比，不引入新的服务端类型
