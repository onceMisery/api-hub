# Published Mock Release Breakdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `Published Runtime` 区块里直接展示最新发布快照包含的响应组和规则摘要，避免用户只能看到计数。

**Architecture:** 复用现有发布快照解析逻辑，不新增后端字段。前端从 `responseSnapshotJson` 与 `rulesSnapshotJson` 中整理出只读明细列表，展示已发布状态码组、字段数、规则名、优先级和命中条件摘要。

**Tech Stack:** `Next.js 15`, `React 19`, `TypeScript`, `Vitest`, `Testing Library`

---

### Task 1: 用失败测试固定发布快照明细展示

**Files:**
- Modify: `apps/web/src/features/projects/components/endpoint-editor.test.tsx`
- Test: `apps/web/src/features/projects/components/endpoint-editor.test.tsx`

- [ ] **Step 1: 补失败测试，要求展示发布响应组和规则摘要**

```tsx
it("shows published runtime response groups and rule breakdown", () => {
  render(
    <EndpointEditor
      endpoint={{ id: 7, groupId: 3, name: "Get User", method: "GET", path: "/users/{id}", description: "Load", mockEnabled: true }}
      projectId={1}
      mockReleases={[{
        id: 21,
        endpointId: 7,
        releaseNo: 3,
        responseSnapshotJson: "[{\"httpStatusCode\":200,\"mediaType\":\"application/json\",\"name\":\"userId\",\"dataType\":\"string\",\"required\":true,\"description\":\"\",\"exampleValue\":\"u_1001\"},{\"httpStatusCode\":200,\"mediaType\":\"application/json\",\"name\":\"role\",\"dataType\":\"string\",\"required\":true,\"description\":\"\",\"exampleValue\":\"admin\"}]",
        rulesSnapshotJson: "[{\"ruleName\":\"Unauthorized\",\"priority\":100,\"enabled\":true,\"queryConditions\":[{\"name\":\"mode\",\"value\":\"strict\"}],\"headerConditions\":[{\"name\":\"x-scenario\",\"value\":\"unauthorized\"}],\"statusCode\":401,\"mediaType\":\"application/json\",\"body\":\"{\\\"error\\\":\\\"token expired\\\"}\"}]",
        createdAt: "2026-04-09T12:20:00Z"
      }]}
      versions={[]}
    />
  );

  expect(screen.getByText("Published response groups")).toBeInTheDocument();
  expect(screen.getByText("200 application/json")).toBeInTheDocument();
  expect(screen.getByText("2 fields")).toBeInTheDocument();
  expect(screen.getByText("Published rules")).toBeInTheDocument();
  expect(screen.getByText("Unauthorized")).toBeInTheDocument();
  expect(screen.getByText("Priority 100")).toBeInTheDocument();
  expect(screen.getByText("query mode=strict")).toBeInTheDocument();
  expect(screen.getByText("header x-scenario=unauthorized")).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试确认当前 UI 还没有这些明细**

Run: `pnpm --filter web test -- src/features/projects/components/endpoint-editor.test.tsx`
Expected: FAIL，提示找不到发布响应组和规则摘要文案。

### Task 2: 实现发布快照明细列表

**Files:**
- Modify: `apps/web/src/features/projects/components/endpoint-editor.tsx`
- Modify: `apps/web/src/features/projects/components/endpoint-editor.test.tsx`

- [ ] **Step 1: 为发布快照提取响应组与规则列表**

```tsx
const publishedResponseGroups = useMemo(
  () => buildPublishedResponseGroups(latestRelease),
  [latestRelease]
);
const publishedRuleItems = useMemo(
  () => buildPublishedRuleItems(latestRelease),
  [latestRelease]
);
```

- [ ] **Step 2: 在 `Published Runtime` 区块渲染只读明细**

```tsx
{publishedResponseGroups.length > 0 ? (
  <div>
    <p>Published response groups</p>
    {publishedResponseGroups.map((group) => (
      <p key={group.key}>{group.label}</p>
    ))}
  </div>
) : null}

{publishedRuleItems.length > 0 ? (
  <div>
    <p>Published rules</p>
    {publishedRuleItems.map((rule) => (
      <p key={rule.key}>{rule.ruleName}</p>
    ))}
  </div>
) : null}
```

- [ ] **Step 3: 重跑测试确认通过**

Run: `pnpm --filter web test -- src/features/projects/components/endpoint-editor.test.tsx`
Expected: PASS

### Task 3: 做最小范围回归验证

**Files:**
- Modify: `apps/web/src/features/projects/components/endpoint-editor.tsx`
- Modify: `apps/web/src/features/projects/components/endpoint-editor.test.tsx`

- [ ] **Step 1: 跑相关测试**

Run: `pnpm --filter web test -- src/features/projects/components/endpoint-editor.test.tsx src/features/projects/components/project-shell.test.tsx`
Expected: PASS

- [ ] **Step 2: 跑前端构建**

Run: `pnpm --filter web build`
Expected: PASS

- [ ] **Step 3: 提交实现**

```bash
git add docs/superpowers/plans/2026-04-10-published-mock-release-breakdown.md apps/web/src/features/projects/components/endpoint-editor.tsx apps/web/src/features/projects/components/endpoint-editor.test.tsx
git commit -m "feat: show published mock release breakdown"
```

## Self-Review

### Spec coverage
- 发布响应组明细：Task 1, Task 2
- 发布规则摘要：Task 1, Task 2
- 仅前端展示增强：Task 2

### Placeholder scan
- 所有任务都给出精确文件路径、命令和预期结果
- 没有 `TODO`、`TBD` 或模糊占位词

### Type consistency
- 发布快照仍统一来自 `MockReleaseDetail`
- 规则条件摘要复用现有 query/header 条件格式
