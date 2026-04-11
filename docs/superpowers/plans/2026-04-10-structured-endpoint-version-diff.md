# Structured Endpoint Version Diff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 endpoint 版本对比从“只看少量摘要新增”升级为“可识别新增、删除、字段值修改”的结构化差异。

**Architecture:** 保持现有版本快照格式和前端比较入口不变，只扩展 `EndpointEditor` 里的本地 diff 计算逻辑。对 `endpoint / parameters / responses` 三类数据分别构建稳定键，输出更细粒度的差异项，不新增后端 API。

**Tech Stack:** `Next.js 15`, `React 19`, `TypeScript`, `Vitest`, `Testing Library`

---

### Task 1: 用失败测试固定删除与字段修改 diff

**Files:**
- Modify: `apps/web/src/features/projects/components/endpoint-editor.test.tsx`
- Test: `apps/web/src/features/projects/components/endpoint-editor.test.tsx`

- [ ] **Step 1: 补失败测试，覆盖参数删除、响应字段修改和 endpoint 名称修改**

```tsx
it("shows structural diff items for removed and changed fields", async () => {
  render(
    <EndpointEditor
      endpoint={{
        id: 7,
        groupId: 3,
        name: "Get User Detail",
        method: "GET",
        path: "/users/{id}",
        description: "Load a single user with profile",
        mockEnabled: false
      }}
      projectId={1}
      parameters={[]}
      responses={[
        {
          id: 1,
          httpStatusCode: 200,
          mediaType: "application/json",
          name: "userId",
          dataType: "uuid",
          required: true,
          description: "Current user identifier",
          exampleValue: "u_2002",
          sortOrder: 0
        }
      ]}
      versions={[
        {
          id: 1,
          endpointId: 7,
          version: "v1",
          changeSummary: "Initial release",
          snapshotJson: JSON.stringify({
            endpoint: {
              name: "Get User",
              method: "GET",
              path: "/users/{id}",
              description: "Load a single user"
            },
            parameters: [
              {
                sectionType: "query",
                name: "expand",
                dataType: "string",
                required: false,
                description: "Expand relations",
                exampleValue: "team"
              }
            ],
            responses: [
              {
                httpStatusCode: 200,
                mediaType: "application/json",
                name: "userId",
                dataType: "string",
                required: true,
                description: "User identifier",
                exampleValue: "u_1001"
              }
            ]
          })
        }
      ]}
    />
  );

  fireEvent.change(screen.getByLabelText("Compare against version"), { target: { value: "1" } });

  expect(await screen.findByText("Changed endpoint name")).toBeInTheDocument();
  expect(screen.getByText("Get User -> Get User Detail")).toBeInTheDocument();
  expect(screen.getByText("Removed request parameter")).toBeInTheDocument();
  expect(screen.getByText("query.expand")).toBeInTheDocument();
  expect(screen.getByText("Changed response field type")).toBeInTheDocument();
  expect(screen.getByText("200 application/json userId: string -> uuid")).toBeInTheDocument();
  expect(screen.getByText("Changed response field example")).toBeInTheDocument();
  expect(screen.getByText("200 application/json userId: u_1001 -> u_2002")).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试确认当前 diff 逻辑还不支持这些项**

Run: `pnpm --filter web test -- src/features/projects/components/endpoint-editor.test.tsx`
Expected: FAIL，提示找不到新的结构化 diff 文案。

### Task 2: 扩展本地 snapshot diff 计算逻辑

**Files:**
- Modify: `apps/web/src/features/projects/components/endpoint-editor.tsx`
- Modify: `apps/web/src/features/projects/components/endpoint-editor.test.tsx`

- [ ] **Step 1: 为 endpoint / parameters / responses 建立稳定键和字段比对**

```tsx
function buildSnapshotDiff(previous: SnapshotShape, current: SnapshotShape) {
  const items: Array<{ title: string; detail: string }> = [];

  pushEndpointDiff(items, previous.endpoint, current.endpoint);
  pushParameterDiff(items, previous.parameters, current.parameters);
  pushResponseDiff(items, previous.responses, current.responses);

  return items;
}
```

- [ ] **Step 2: 输出删除项和字段修改项**

```tsx
items.push({
  title: "Removed request parameter",
  detail: "query.expand"
});

items.push({
  title: "Changed response field type",
  detail: "200 application/json userId: string -> uuid"
});
```

- [ ] **Step 3: 重跑测试确认结构化 diff 通过**

Run: `pnpm --filter web test -- src/features/projects/components/endpoint-editor.test.tsx`
Expected: PASS

### Task 3: 做最小范围回归验证

**Files:**
- Modify: `apps/web/src/features/projects/components/endpoint-editor.tsx`
- Modify: `apps/web/src/features/projects/components/endpoint-editor.test.tsx`

- [ ] **Step 1: 跑编辑器与工作台测试**

Run: `pnpm --filter web test -- src/features/projects/components/endpoint-editor.test.tsx src/features/projects/components/project-shell.test.tsx`
Expected: PASS

- [ ] **Step 2: 跑前端构建**

Run: `pnpm --filter web build`
Expected: PASS

- [ ] **Step 3: 提交实现**

```bash
git add docs/superpowers/plans/2026-04-10-structured-endpoint-version-diff.md apps/web/src/features/projects/components/endpoint-editor.tsx apps/web/src/features/projects/components/endpoint-editor.test.tsx
git commit -m "feat: add structured endpoint version diff"
```

## Self-Review

### Spec coverage
- endpoint 基础字段修改：Task 1, Task 2
- 参数/响应删除与字段修改：Task 1, Task 2
- 不改后端协议：Task 2 仅在前端本地 diff 计算中完成

### Placeholder scan
- 所有任务都包含精确路径、命令和预期结果
- 没有 `TODO`、`TBD` 或“类似 Task N”的占位描述

### Type consistency
- 快照仍统一使用现有 `SnapshotShape`
- 参数键使用 `sectionType.name`
- 响应键使用 `statusCode mediaType name`
