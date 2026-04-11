# Debug History Filtering And Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 ApiHub 调试台补齐按环境/状态码/时间范围筛选历史记录，以及按当前筛选条件清理历史的能力。

**Architecture:** 保持现有 `DebugHistoryController -> DebugService -> DebugHistoryRepository` 链路不拆层，只在现有查询接口上扩展可选过滤参数，并新增同路径 `DELETE` 清理接口。前端继续由 `ProjectShell` 持有调试历史状态，在 `DebugConsole` 内增加筛选表单和清理入口，SDK 负责参数序列化。

**Tech Stack:** `Spring Boot 3.2`, `Java 21`, `JdbcTemplate`, `Next.js 15`, `React 19`, `TypeScript`, `Vitest`

---

## File Map

### Backend

- Modify: `services/apihub-server/src/main/java/com/apihub/debug/web/DebugHistoryController.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/debug/service/DebugService.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/debug/service/DebugHistoryRepository.java`
- Test: `services/apihub-server/src/test/java/com/apihub/debug/service/DebugServiceTest.java`
- Test: `services/apihub-server/src/test/java/com/apihub/debug/web/DebugHistoryControllerTest.java`

### Frontend SDK and UI

- Modify: `packages/api-sdk/src/modules/projects.ts`
- Modify: `apps/web/src/features/projects/components/project-shell.tsx`
- Modify: `apps/web/src/features/projects/components/debug-console.tsx`
- Modify: `apps/web/src/features/projects/components/debug-console.test.tsx`
- Modify: `apps/web/src/features/projects/components/project-shell.test.tsx`

### Verification

- Run targeted backend tests for debug history
- Run targeted frontend component tests
- Run `pnpm --filter web build`

### Execution precondition

- 在执行本计划前，先使用 `using-git-worktrees` 创建独立 worktree，例如 `debug-history-filtering-cleanup`，不要直接在 `main` 上开发。

### Task 1: 扩展后端调试历史筛选与清理接口

**Files:**
- Modify: `services/apihub-server/src/main/java/com/apihub/debug/web/DebugHistoryController.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/debug/service/DebugService.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/debug/service/DebugHistoryRepository.java`
- Test: `services/apihub-server/src/test/java/com/apihub/debug/service/DebugServiceTest.java`
- Test: `services/apihub-server/src/test/java/com/apihub/debug/web/DebugHistoryControllerTest.java`

- [ ] **Step 1: 先写服务层失败测试，固定筛选参数透传和清理调用**

```java
@Test
void shouldFilterProjectDebugHistoryByEnvironmentStatusAndTimeRange() {
    Instant from = Instant.parse("2026-04-09T00:00:00Z");
    Instant to = Instant.parse("2026-04-10T00:00:00Z");
    given(projectRepository.findProject(1L)).willReturn(Optional.of(new ProjectDetail(1L, "Default", "default", "Seed", List.of())));
    given(debugHistoryRepository.listHistory(1L, 31L, 41L, 500, from, to, 20)).willReturn(List.of());

    debugService.listHistory(1L, 31L, 41L, 500, from, to, 20);

    verify(debugHistoryRepository).listHistory(1L, 31L, 41L, 500, from, to, 20);
}

@Test
void shouldClearProjectDebugHistoryByCurrentFilters() {
    Instant from = Instant.parse("2026-04-09T00:00:00Z");
    Instant to = Instant.parse("2026-04-10T00:00:00Z");
    given(projectRepository.findProject(1L)).willReturn(Optional.of(new ProjectDetail(1L, "Default", "default", "Seed", List.of())));
    given(debugHistoryRepository.deleteHistory(1L, 31L, 41L, 500, from, to)).willReturn(3);

    int deleted = debugService.clearHistory(1L, 31L, 41L, 500, from, to);

    assertThat(deleted).isEqualTo(3);
    verify(debugHistoryRepository).deleteHistory(1L, 31L, 41L, 500, from, to);
}
```

- [ ] **Step 2: 再写控制器失败测试，固定查询参数解析和删除接口契约**

```java
@Test
void shouldReturnFilteredDebugHistory() throws Exception {
    Instant from = Instant.parse("2026-04-09T00:00:00Z");
    Instant to = Instant.parse("2026-04-10T00:00:00Z");
    given(debugService.listHistory(1L, 31L, 41L, 500, from, to, 5)).willReturn(List.of());

    mockMvc.perform(get("/api/v1/projects/1/debug-history")
                    .with(user("tester"))
                    .param("endpointId", "31")
                    .param("environmentId", "41")
                    .param("statusCode", "500")
                    .param("createdFrom", "2026-04-09T00:00:00Z")
                    .param("createdTo", "2026-04-10T00:00:00Z")
                    .param("limit", "5"))
            .andExpect(status().isOk());
}

@Test
void shouldDeleteFilteredDebugHistory() throws Exception {
    Instant from = Instant.parse("2026-04-09T00:00:00Z");
    Instant to = Instant.parse("2026-04-10T00:00:00Z");
    given(debugService.clearHistory(1L, 31L, 41L, 500, from, to)).willReturn(3);

    mockMvc.perform(delete("/api/v1/projects/1/debug-history")
                    .with(user("tester"))
                    .param("endpointId", "31")
                    .param("environmentId", "41")
                    .param("statusCode", "500")
                    .param("createdFrom", "2026-04-09T00:00:00Z")
                    .param("createdTo", "2026-04-10T00:00:00Z"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.deletedCount").value(3));
}
```

- [ ] **Step 3: 运行后端目标测试，确认当前代码尚不支持这些参数与删除接口**

Run: `Set-Location services/apihub-server; .\gradlew.bat test --tests com.apihub.debug.service.DebugServiceTest --tests com.apihub.debug.web.DebugHistoryControllerTest --no-daemon`

Expected: FAIL，提示 `listHistory` 方法签名不匹配，且 `DELETE /api/v1/projects/{projectId}/debug-history` 不存在。

- [ ] **Step 4: 实现服务层与仓储层筛选/删除逻辑**

```java
public List<DebugHistoryItem> listHistory(Long projectId,
                                          Long endpointId,
                                          Long environmentId,
                                          Integer statusCode,
                                          Instant createdFrom,
                                          Instant createdTo,
                                          int limit) {
    projectRepository.findProject(projectId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
    return debugHistoryRepository.listHistory(
            projectId,
            endpointId,
            environmentId,
            statusCode,
            createdFrom,
            createdTo,
            Math.max(1, Math.min(limit, 50)));
}

public int clearHistory(Long projectId,
                        Long endpointId,
                        Long environmentId,
                        Integer statusCode,
                        Instant createdFrom,
                        Instant createdTo) {
    projectRepository.findProject(projectId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
    return debugHistoryRepository.deleteHistory(projectId, endpointId, environmentId, statusCode, createdFrom, createdTo);
}
```

```java
private record HistoryQuery(String sql, List<Object> args) {
}

private HistoryQuery buildHistoryQuery(String selectClause,
                                       Long projectId,
                                       Long endpointId,
                                       Long environmentId,
                                       Integer statusCode,
                                       Instant createdFrom,
                                       Instant createdTo,
                                       Integer limit) {
    StringBuilder sql = new StringBuilder(selectClause)
            .append(" from debug_history where project_id = ?");
    List<Object> args = new ArrayList<>();
    args.add(projectId);

    if (endpointId != null) {
        sql.append(" and endpoint_id = ?");
        args.add(endpointId);
    }
    if (environmentId != null) {
        sql.append(" and environment_id = ?");
        args.add(environmentId);
    }
    if (statusCode != null) {
        sql.append(" and response_status_code = ?");
        args.add(statusCode);
    }
    if (createdFrom != null) {
        sql.append(" and created_at >= ?");
        args.add(Timestamp.from(createdFrom));
    }
    if (createdTo != null) {
        sql.append(" and created_at <= ?");
        args.add(Timestamp.from(createdTo));
    }
    if (limit != null) {
        sql.append(" order by created_at desc, id desc limit ?");
        args.add(limit);
    }
    return new HistoryQuery(sql.toString(), args);
}
```

- [ ] **Step 5: 实现控制器查询参数解析与删除接口**

```java
@GetMapping
public ApiResponse<List<DebugHistoryItem>> listHistory(@PathVariable Long projectId,
                                                       @RequestParam(required = false) Long endpointId,
                                                       @RequestParam(required = false) Long environmentId,
                                                       @RequestParam(required = false) Integer statusCode,
                                                       @RequestParam(required = false) Instant createdFrom,
                                                       @RequestParam(required = false) Instant createdTo,
                                                       @RequestParam(defaultValue = "10") int limit) {
    return ApiResponse.success(debugService.listHistory(projectId, endpointId, environmentId, statusCode, createdFrom, createdTo, limit));
}

@DeleteMapping
public ApiResponse<Map<String, Integer>> clearHistory(@PathVariable Long projectId,
                                                      @RequestParam(required = false) Long endpointId,
                                                      @RequestParam(required = false) Long environmentId,
                                                      @RequestParam(required = false) Integer statusCode,
                                                      @RequestParam(required = false) Instant createdFrom,
                                                      @RequestParam(required = false) Instant createdTo) {
    int deletedCount = debugService.clearHistory(projectId, endpointId, environmentId, statusCode, createdFrom, createdTo);
    return ApiResponse.success(Map.of("deletedCount", deletedCount));
}
```

- [ ] **Step 6: 重跑后端目标测试，确认筛选与清理接口已生效**

Run: `Set-Location services/apihub-server; .\gradlew.bat test --tests com.apihub.debug.service.DebugServiceTest --tests com.apihub.debug.web.DebugHistoryControllerTest --no-daemon`

Expected: PASS

- [ ] **Step 7: 提交后端子任务**

```bash
git add services/apihub-server/src/main/java/com/apihub/debug/web/DebugHistoryController.java services/apihub-server/src/main/java/com/apihub/debug/service/DebugService.java services/apihub-server/src/main/java/com/apihub/debug/service/DebugHistoryRepository.java services/apihub-server/src/test/java/com/apihub/debug/service/DebugServiceTest.java services/apihub-server/src/test/java/com/apihub/debug/web/DebugHistoryControllerTest.java
git commit -m "feat: filter and clear debug history"
```

### Task 2: 扩展 SDK 与前端调试台历史筛选/清理体验

**Files:**
- Modify: `packages/api-sdk/src/modules/projects.ts`
- Modify: `apps/web/src/features/projects/components/project-shell.tsx`
- Modify: `apps/web/src/features/projects/components/debug-console.tsx`
- Modify: `apps/web/src/features/projects/components/debug-console.test.tsx`
- Modify: `apps/web/src/features/projects/components/project-shell.test.tsx`

- [ ] **Step 1: 先写前端失败测试，固定筛选回调和清理行为**

```tsx
it("submits debug history filters and clear action", async () => {
  const onChangeHistoryFilters = vi.fn();
  const onClearHistory = vi.fn().mockResolvedValue(undefined);

  render(
    <DebugConsole
      endpoint={endpoint}
      environment={environment}
      environmentOptions={[environment, otherEnvironment]}
      history={history}
      historyFilters={{
        endpointId: 31,
        environmentId: null,
        statusCode: null,
        createdFrom: "",
        createdTo: ""
      }}
      isLoadingHistory={false}
      onChangeHistoryFilters={onChangeHistoryFilters}
      onClearHistory={onClearHistory}
      onExecute={vi.fn()}
      onReplayHistory={vi.fn()}
      onRunHistory={vi.fn()}
      replayDraft={null}
    />
  );

  fireEvent.change(screen.getByLabelText("Debug history environment filter"), { target: { value: "42" } });
  fireEvent.change(screen.getByLabelText("Debug history status filter"), { target: { value: "500" } });
  fireEvent.click(screen.getByRole("button", { name: "Clear debug history" }));

  expect(onChangeHistoryFilters).toHaveBeenCalledWith(expect.objectContaining({
    environmentId: 42,
    statusCode: 500
  }));
  await waitFor(() => expect(onClearHistory).toHaveBeenCalled());
});
```

```tsx
it("fetches debug history again when history filters change", async () => {
  render(<ProjectShell projectId={1} />);

  await screen.findByText("Get User");
  fireEvent.change(screen.getByLabelText("Debug history environment filter"), { target: { value: "41" } });

  await waitFor(() =>
    expect(fetchDebugHistory).toHaveBeenLastCalledWith(1, {
      endpointId: 31,
      environmentId: 41,
      statusCode: undefined,
      createdFrom: undefined,
      createdTo: undefined,
      limit: 10
    })
  );
});
```

- [ ] **Step 2: 运行前端目标测试，确认当前 UI 和 SDK 尚不支持这些参数**

Run: `pnpm --filter web test -- src/features/projects/components/debug-console.test.tsx src/features/projects/components/project-shell.test.tsx`

Expected: FAIL，提示缺少历史筛选 props、缺少 `Clear debug history` 按钮，且 `fetchDebugHistory` 调用参数不匹配。

- [ ] **Step 3: 扩展 SDK 历史筛选/清理接口**

```ts
export type DebugHistoryFilters = {
  endpointId?: number;
  environmentId?: number;
  statusCode?: number;
  createdFrom?: string;
  createdTo?: string;
  limit?: number;
};

export function fetchDebugHistory(projectId: number, filters: DebugHistoryFilters = {}) {
  const searchParams = new URLSearchParams({ limit: String(filters.limit ?? 10) });
  if (filters.endpointId) searchParams.set("endpointId", String(filters.endpointId));
  if (filters.environmentId) searchParams.set("environmentId", String(filters.environmentId));
  if (filters.statusCode) searchParams.set("statusCode", String(filters.statusCode));
  if (filters.createdFrom) searchParams.set("createdFrom", filters.createdFrom);
  if (filters.createdTo) searchParams.set("createdTo", filters.createdTo);
  return apiFetch<DebugHistoryItem[]>(`/api/v1/projects/${projectId}/debug-history?${searchParams.toString()}`);
}

export function clearDebugHistory(projectId: number, filters: Omit<DebugHistoryFilters, "limit"> = {}) {
  const searchParams = new URLSearchParams();
  if (filters.endpointId) searchParams.set("endpointId", String(filters.endpointId));
  if (filters.environmentId) searchParams.set("environmentId", String(filters.environmentId));
  if (filters.statusCode) searchParams.set("statusCode", String(filters.statusCode));
  if (filters.createdFrom) searchParams.set("createdFrom", filters.createdFrom);
  if (filters.createdTo) searchParams.set("createdTo", filters.createdTo);
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  return apiFetch<{ deletedCount: number }>(`/api/v1/projects/${projectId}/debug-history${suffix}`, { method: "DELETE" });
}
```

- [ ] **Step 4: 在 `ProjectShell` 管理历史筛选状态与清理动作**

```tsx
const [historyFilters, setHistoryFilters] = useState({
  environmentId: null as number | null,
  statusCode: null as number | null,
  createdFrom: "",
  createdTo: ""
});

useEffect(() => {
  if (!selectedEndpointId) {
    setDebugHistory([]);
    return;
  }

  void fetchDebugHistory(projectId, {
    endpointId: selectedEndpointId,
    environmentId: historyFilters.environmentId ?? undefined,
    statusCode: historyFilters.statusCode ?? undefined,
    createdFrom: historyFilters.createdFrom || undefined,
    createdTo: historyFilters.createdTo || undefined,
    limit: 10
  }).then((response) => setDebugHistory(response.data));
}, [projectId, selectedEndpointId, historyFilters]);

async function handleClearHistory() {
  if (!selectedEndpointId) {
    return;
  }
  await clearDebugHistory(projectId, {
    endpointId: selectedEndpointId,
    environmentId: historyFilters.environmentId ?? undefined,
    statusCode: historyFilters.statusCode ?? undefined,
    createdFrom: historyFilters.createdFrom || undefined,
    createdTo: historyFilters.createdTo || undefined
  });
  setDebugHistory([]);
}
```

- [ ] **Step 5: 在 `DebugConsole` 增加筛选表单和清理按钮**

```tsx
<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
  <select
    aria-label="Debug history environment filter"
    value={historyFilters.environmentId ?? ""}
    onChange={(event) => onChangeHistoryFilters({
      ...historyFilters,
      environmentId: event.target.value ? Number(event.target.value) : null
    })}
  >
    <option value="">All environments</option>
    {environmentOptions.map((item) => (
      <option key={item.id} value={item.id}>{item.name}</option>
    ))}
  </select>
  <input
    aria-label="Debug history status filter"
    value={historyFilters.statusCode ?? ""}
    onChange={(event) => onChangeHistoryFilters({
      ...historyFilters,
      statusCode: event.target.value ? Number(event.target.value) : null
    })}
  />
  <input
    aria-label="Debug history created from filter"
    type="datetime-local"
    value={historyFilters.createdFrom}
    onChange={(event) => onChangeHistoryFilters({ ...historyFilters, createdFrom: event.target.value })}
  />
  <input
    aria-label="Debug history created to filter"
    type="datetime-local"
    value={historyFilters.createdTo}
    onChange={(event) => onChangeHistoryFilters({ ...historyFilters, createdTo: event.target.value })}
  />
  <button onClick={() => void onClearHistory()} type="button">Clear debug history</button>
</div>
```

- [ ] **Step 6: 重跑前端目标测试并修绿**

Run: `pnpm --filter web test -- src/features/projects/components/debug-console.test.tsx src/features/projects/components/project-shell.test.tsx`

Expected: PASS

- [ ] **Step 7: 跑前端生产构建，确认类型和页面构建无回归**

Run: `pnpm --filter web build`

Expected: PASS

- [ ] **Step 8: 提交前端子任务**

```bash
git add packages/api-sdk/src/modules/projects.ts apps/web/src/features/projects/components/project-shell.tsx apps/web/src/features/projects/components/debug-console.tsx apps/web/src/features/projects/components/debug-console.test.tsx apps/web/src/features/projects/components/project-shell.test.tsx
git commit -m "feat: add debug history filters and cleanup"
```

### Task 3: 最终回归并整理分支

**Files:**
- No new code expected unless verification 暴露问题

- [ ] **Step 1: 运行后端目标测试集**

Run: `Set-Location services/apihub-server; .\gradlew.bat test --tests com.apihub.debug.service.DebugServiceTest --tests com.apihub.debug.web.DebugHistoryControllerTest --no-daemon`

Expected: PASS

- [ ] **Step 2: 运行前端目标测试集**

Run: `pnpm --filter web test -- src/features/projects/components/debug-console.test.tsx src/features/projects/components/project-shell.test.tsx`

Expected: PASS

- [ ] **Step 3: 运行前端构建**

Run: `pnpm --filter web build`

Expected: PASS

- [ ] **Step 4: 检查 git 状态，只保留本功能相关改动**

Run: `git status --short`

Expected: 仅看到本 feature 改动；不要把 `.gradle/`、`build/` 或其他用户未跟踪文件一起提交。

- [ ] **Step 5: 提交最终整合改动**

```bash
git add services/apihub-server/src/main/java/com/apihub/debug services/apihub-server/src/test/java/com/apihub/debug packages/api-sdk/src/modules/projects.ts apps/web/src/features/projects/components/debug-console.tsx apps/web/src/features/projects/components/project-shell.tsx apps/web/src/features/projects/components/debug-console.test.tsx apps/web/src/features/projects/components/project-shell.test.tsx
git commit -m "feat: improve debug history management"
```
