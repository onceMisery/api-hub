# Mock Body JSONPath Conditions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Mock 规则增加基于请求 Body 的 JSONPath 条件匹配，并让编辑器、模拟器、发布快照和运行时解析保持一致。

**Architecture:** 在现有 `query/header` 精确匹配模型上增加一类最小闭环的 `bodyConditions`，数据结构独立存储为 JSON 数组，不引入 MySQL 外键。后端运行时与模拟器共用一套规则解析逻辑，前端在现有 Mock Rules / Mock Simulator 面板中增加 body 条件输入与请求体样例输入，继续沿用当前 endpoint editor 的状态提升模式。

**Tech Stack:** `Spring Boot 3.2`, `Java 21`, `Maven`, `JdbcTemplate`, `Jackson`, `Next.js 15`, `React 19`, `TypeScript`, `Vitest`

---

### Task 1: 扩展 Mock 规则 DTO、存储和发布快照，承载 body 条件

**Files:**
- Modify: `infra/mysql/001_phase1_schema.sql`
- Modify: `services/apihub-server/src/test/resources/project-service-schema.sql`
- Modify: `services/apihub-server/src/main/java/com/apihub/mock/model/MockDtos.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/doc/repository/EndpointRepository.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/project/service/ProjectService.java`
- Modify: `packages/api-sdk/src/modules/projects.ts`
- Test: `services/apihub-server/src/test/java/com/apihub/mock/web/ApiMockRuleControllerTest.java`
- Test: `services/apihub-server/src/test/java/com/apihub/project/service/ProjectServiceTest.java`

- [ ] **Step 1: 先写失败测试，固定 mock 规则列表/保存/发布快照都要带上 `bodyConditions`**

```java
@Test
void shouldExposeBodyConditionsWhenListingMockRules() throws Exception {
    given(projectService.listMockRules(31L)).willReturn(List.of(
            new MockRuleDetail(
                    11L,
                    31L,
                    "Match request body",
                    120,
                    true,
                    List.of(),
                    List.of(),
                    List.of(new MockBodyConditionEntry("$.user.id", "31")),
                    200,
                    "application/json",
                    "{\"ok\":true}")));

    mockMvc.perform(get("/api/v1/endpoints/31/mock-rules").with(user("tester")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].bodyConditions[0].jsonPath").value("$.user.id"))
            .andExpect(jsonPath("$.data[0].bodyConditions[0].expectedValue").value("31"));
}
```

```java
@Test
void shouldPublishBodyConditionsIntoMockReleaseSnapshot() {
    projectService.replaceMockRules(endpoint.id(), java.util.List.of(
            new MockRuleUpsertItem(
                    "Match request body",
                    120,
                    true,
                    java.util.List.of(),
                    java.util.List.of(),
                    java.util.List.of(new MockBodyConditionEntry("$.user.id", "31")),
                    200,
                    "application/json",
                    "{\"ok\":true}")));

    MockReleaseDetail release = projectService.publishMockRelease(endpoint.id());

    assertThat(release.rulesSnapshotJson()).contains("\"bodyConditions\"");
    assertThat(release.rulesSnapshotJson()).contains("$.user.id");
}
```

- [ ] **Step 2: 运行后端目标测试，确认当前代码还不支持 `bodyConditions`**

Run: `Set-Location services/apihub-server; $env:JAVA_HOME='D:\dev-tool\java\openjdk-21\jdk-21.0.2'; mvn test "-Dtest=ApiMockRuleControllerTest,ProjectServiceTest"`

Expected: FAIL，报错点应落在 `MockRuleDetail` / `MockRuleUpsertItem` 缺少 `bodyConditions` 字段，或 JSON 断言中找不到该字段。

- [ ] **Step 3: 最小实现存储与 DTO 扩展，不改现有规则优先级与排序**

```sql
alter table mock_rule
  add column body_conditions_json json not null;
```

```sql
CREATE TABLE mock_rule (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  endpoint_id BIGINT NOT NULL,
  rule_name VARCHAR(128) NOT NULL,
  priority INT NOT NULL,
  enabled BOOLEAN NOT NULL,
  query_conditions_json JSON NOT NULL,
  header_conditions_json JSON NOT NULL,
  body_conditions_json JSON NOT NULL,
  status_code INT NOT NULL,
  media_type VARCHAR(128) NOT NULL,
  body_json JSON NOT NULL,
  created_by BIGINT NOT NULL,
  updated_by BIGINT NOT NULL
);
```

```java
public record MockBodyConditionEntry(String jsonPath, String expectedValue) {
}

public record MockRuleDetail(
        Long id,
        Long endpointId,
        String ruleName,
        int priority,
        boolean enabled,
        List<MockConditionEntry> queryConditions,
        List<MockConditionEntry> headerConditions,
        List<MockBodyConditionEntry> bodyConditions,
        int statusCode,
        String mediaType,
        String body
) {
}
```

```java
private static final RowMapper<MockRuleDetail> MOCK_RULE_ROW_MAPPER = (rs, rowNum) -> new MockRuleDetail(
        rs.getLong("id"),
        rs.getLong("endpoint_id"),
        rs.getString("rule_name"),
        rs.getInt("priority"),
        rs.getBoolean("enabled"),
        parseConditionEntries(rs.getString("query_conditions_json")),
        parseConditionEntries(rs.getString("header_conditions_json")),
        parseBodyConditionEntries(rs.getString("body_conditions_json")),
        rs.getInt("status_code"),
        rs.getString("media_type"),
        rs.getString("body_json"));
```

```ts
export type MockBodyConditionEntry = {
  jsonPath: string;
  expectedValue: string;
};

export type MockRuleDetail = {
  id: number;
  endpointId: number;
  ruleName: string;
  priority: number;
  enabled: boolean;
  queryConditions: MockConditionEntry[];
  headerConditions: MockConditionEntry[];
  bodyConditions: MockBodyConditionEntry[];
  statusCode: number;
  mediaType: string;
  body: string;
};
```

- [ ] **Step 4: 重跑后端目标测试，确认存储、读取和发布快照现在都包含 body 条件**

Run: `Set-Location services/apihub-server; $env:JAVA_HOME='D:\dev-tool\java\openjdk-21\jdk-21.0.2'; mvn test "-Dtest=ApiMockRuleControllerTest,ProjectServiceTest"`

Expected: PASS

- [ ] **Step 5: 提交任务 1**

```bash
git add infra/mysql/001_phase1_schema.sql services/apihub-server/src/test/resources/project-service-schema.sql services/apihub-server/src/main/java/com/apihub/mock/model/MockDtos.java services/apihub-server/src/main/java/com/apihub/doc/repository/EndpointRepository.java services/apihub-server/src/main/java/com/apihub/project/service/ProjectService.java packages/api-sdk/src/modules/projects.ts services/apihub-server/src/test/java/com/apihub/mock/web/ApiMockRuleControllerTest.java services/apihub-server/src/test/java/com/apihub/project/service/ProjectServiceTest.java
git commit -m "feat: persist mock body conditions"
```

### Task 2: 为模拟器与运行时解析增加 body JSONPath 匹配

**Files:**
- Modify: `services/apihub-server/src/main/java/com/apihub/mock/model/MockDtos.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/mock/service/MockRuntimeResolver.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/mock/service/MockService.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/mock/web/MockController.java`
- Test: `services/apihub-server/src/test/java/com/apihub/mock/service/MockRuntimeResolverTest.java`
- Test: `services/apihub-server/src/test/java/com/apihub/mock/service/MockServiceTest.java`
- Test: `services/apihub-server/src/test/java/com/apihub/mock/web/ApiMockSimulationControllerTest.java`

- [ ] **Step 1: 先写失败测试，证明 body 条件能驱动模拟器与真实 `/mock/**` 运行时命中**

```java
@Test
void shouldMatchRuleByBodyJsonPath() {
    MockSimulationResult result = resolver.resolveDraft(new MockSimulationRequest(
            List.of(new MockRuleUpsertItem(
                    "Match request body",
                    120,
                    true,
                    List.of(),
                    List.of(),
                    List.of(new MockBodyConditionEntry("$.user.id", "31")),
                    202,
                    "application/json",
                    "{\"matched\":true}")),
            List.of(),
            List.of(),
            List.of(),
            "{\"user\":{\"id\":31}}"));

    assertThat(result.source()).isEqualTo("rule");
    assertThat(result.explanations()).contains("Matched body $.user.id=31");
}
```

```java
@Test
void shouldApplyReleasedBodyConditionAtRuntime() {
    given(endpointRepository.findLatestMockRelease(31L)).willReturn(Optional.of(
            new MockReleaseDetail(
                    5L,
                    31L,
                    1,
                    "[]",
                    "[{\"ruleName\":\"match\",\"priority\":120,\"enabled\":true,\"queryConditions\":[],\"headerConditions\":[],\"bodyConditions\":[{\"jsonPath\":\"$.user.id\",\"expectedValue\":\"31\"}],\"statusCode\":202,\"mediaType\":\"application/json\",\"body\":\"{\\\"matched\\\":true}\"}]",
                    Instant.parse("2026-04-09T12:00:00Z"))));

    MockService.MockResponse response = mockService.resolve(
            1L,
            "POST",
            "/users/31",
            Map.of(),
            Map.of(),
            "{\"user\":{\"id\":31}}");

    assertThat(response.statusCode()).isEqualTo(202);
}
```

- [ ] **Step 2: 运行后端目标测试，确认当前模拟器请求和运行时解析还没有 body 输入**

Run: `Set-Location services/apihub-server; $env:JAVA_HOME='D:\dev-tool\java\openjdk-21\jdk-21.0.2'; mvn test "-Dtest=MockRuntimeResolverTest,MockServiceTest,ApiMockSimulationControllerTest"`

Expected: FAIL，报错点应落在 `MockSimulationRequest` 缺少请求体字段，或 `MockService.resolve` 参数不匹配。

- [ ] **Step 3: 最小实现 body 条件匹配，限定为根路径开头的 JSONPath 子集**

```java
public record MockSimulationRequest(
        List<MockRuleUpsertItem> draftRules,
        List<MockSimulationResponseItem> draftResponses,
        List<MockConditionEntry> querySamples,
        List<MockConditionEntry> headerSamples,
        String bodySample
) {
}
```

```java
for (MockBodyConditionEntry condition : safeBodyConditions(rule.bodyConditions())) {
    String requestValue = resolveJsonPath(bodyNode, condition.jsonPath());
    if (!normalizeBodyValue(condition.expectedValue()).equals(requestValue)) {
        return new RuleMatchResult(false, List.of(
                "Rule " + rule.ruleName() + " skipped: missing body " + condition.jsonPath() + "=" + condition.expectedValue()
        ));
    }
    explanations.add("Matched body " + condition.jsonPath() + "=" + condition.expectedValue());
}
```

```java
public MockResponse resolve(Long projectId,
                            String method,
                            String path,
                            Map<String, List<String>> queryParameters,
                            Map<String, String> requestHeaders,
                            String requestBody) {
    MockSimulationResult document = mockRuntimeResolver.resolveDraft(new MockSimulationRequest(
            readMockRules(release.rulesSnapshotJson()),
            readResponses(release.responseSnapshotJson()),
            toQueryConditionEntries(queryParameters),
            toHeaderConditionEntries(requestHeaders),
            requestBody
    ));
    return new MockResponse(document.statusCode(), List.of(new DebugHeader("Content-Type", document.mediaType())), document.body());
}
```

```java
public ResponseEntity<String> handleMock(@PathVariable Long projectId, HttpServletRequest request) {
    MockService.MockResponse response = mockService.resolve(
            projectId,
            request.getMethod(),
            requestPath,
            extractQueryParameters(request),
            extractHeaders(request),
            request.getReader().lines().collect(Collectors.joining(System.lineSeparator())));
```

- [ ] **Step 4: 重跑后端目标测试，确认模拟器与运行时都能识别 body 条件**

Run: `Set-Location services/apihub-server; $env:JAVA_HOME='D:\dev-tool\java\openjdk-21\jdk-21.0.2'; mvn test "-Dtest=MockRuntimeResolverTest,MockServiceTest,ApiMockSimulationControllerTest"`

Expected: PASS

- [ ] **Step 5: 提交任务 2**

```bash
git add services/apihub-server/src/main/java/com/apihub/mock/model/MockDtos.java services/apihub-server/src/main/java/com/apihub/mock/service/MockRuntimeResolver.java services/apihub-server/src/main/java/com/apihub/mock/service/MockService.java services/apihub-server/src/main/java/com/apihub/mock/web/MockController.java services/apihub-server/src/test/java/com/apihub/mock/service/MockRuntimeResolverTest.java services/apihub-server/src/test/java/com/apihub/mock/service/MockServiceTest.java services/apihub-server/src/test/java/com/apihub/mock/web/ApiMockSimulationControllerTest.java
git commit -m "feat: match mock rules by request body"
```

### Task 3: 补齐前端编辑器和模拟器，让用户可编辑 body 条件并输入请求体样例

**Files:**
- Modify: `packages/api-sdk/src/modules/projects.ts`
- Modify: `apps/web/src/features/projects/components/endpoint-editor-utils.ts`
- Modify: `apps/web/src/features/projects/components/endpoint-editor.tsx`
- Modify: `apps/web/src/features/projects/components/endpoint-mock-rules-panel.tsx`
- Modify: `apps/web/src/features/projects/components/endpoint-mock-simulator-panel.tsx`
- Test: `apps/web/src/features/projects/components/endpoint-editor.test.tsx`
- Test: `apps/web/src/features/projects/components/project-shell.test.tsx`

- [ ] **Step 1: 先写失败测试，固定 body 条件编辑、保存和模拟 payload**

```tsx
it("saves body jsonpath conditions and includes simulator request body", async () => {
  const onSaveMockRules = vi.fn().mockResolvedValue(undefined);
  const onSimulateMock = vi.fn().mockResolvedValue({
    source: "rule",
    matchedRuleName: "Match request body",
    matchedRulePriority: 120,
    explanations: ["Matched body $.user.id=31"],
    statusCode: 202,
    mediaType: "application/json",
    body: "{\"matched\":true}"
  });

  render(<EndpointEditor ... onSaveMockRules={onSaveMockRules} onSimulateMock={onSimulateMock} versions={[]} />);

  fireEvent.click(screen.getByRole("button", { name: "Add mock rule" }));
  fireEvent.change(screen.getByLabelText("Mock rule 1 body conditions"), {
    target: { value: "$.user.id=31" }
  });
  fireEvent.click(screen.getByRole("button", { name: "Save mock rules" }));
  fireEvent.change(screen.getByLabelText("Simulator request body"), {
    target: { value: "{\"user\":{\"id\":31}}" }
  });
  fireEvent.click(screen.getByRole("button", { name: "Run mock simulation" }));

  await waitFor(() =>
    expect(onSaveMockRules).toHaveBeenCalledWith([
      expect.objectContaining({
        bodyConditions: [{ jsonPath: "$.user.id", expectedValue: "31" }]
      })
    ])
  );

  await waitFor(() =>
    expect(onSimulateMock).toHaveBeenCalledWith(expect.objectContaining({
      bodySample: "{\"user\":{\"id\":31}}"
    }))
  );
});
```

- [ ] **Step 2: 运行前端目标测试，确认当前编辑器还没有 body 条件/请求体样例 UI**

Run: `pnpm --filter web test -- src/features/projects/components/endpoint-editor.test.tsx src/features/projects/components/project-shell.test.tsx`

Expected: FAIL，报错点应落在找不到 `Mock rule 1 body conditions` 或 `Simulator request body` 输入框。

- [ ] **Step 3: 最小实现前端字段、解析和说明文案，不改既有 query/header 交互**

```ts
export type MockRuleDraft = {
  ruleName: string;
  priority: number;
  enabled: boolean;
  queryConditionsText: string;
  headerConditionsText: string;
  bodyConditionsText: string;
  statusCode: number;
  mediaType: string;
  body: string;
};
```

```ts
export function parseBodyConditions(text: string): MockBodyConditionEntry[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.indexOf("=");
      return {
        jsonPath: line.slice(0, separatorIndex).trim(),
        expectedValue: line.slice(separatorIndex + 1).trim()
      };
    })
    .filter((condition) => condition.jsonPath);
}
```

```tsx
<Field label={`Mock rule ${index + 1} body conditions`}>
  <textarea
    aria-label={`Mock rule ${index + 1} body conditions`}
    onChange={(event) => onUpdateRule(index, "bodyConditionsText", event.target.value)}
    placeholder="$.user.id=31"
    value={rule.bodyConditionsText}
  />
</Field>
```

```tsx
<Field label="Simulator request body">
  <textarea
    aria-label="Simulator request body"
    onChange={(event) => onBodyTextChange(event.target.value)}
    placeholder='{"user":{"id":31}}'
    value={simulationBodyText}
  />
</Field>
```

- [ ] **Step 4: 重跑前端目标测试和构建，确认编辑器到模拟器的交互闭环成立**

Run: `pnpm --filter web test -- src/features/projects/components/endpoint-editor.test.tsx src/features/projects/components/project-shell.test.tsx`

Expected: PASS

Run: `pnpm --filter web build`

Expected: PASS

- [ ] **Step 5: 提交任务 3**

```bash
git add packages/api-sdk/src/modules/projects.ts apps/web/src/features/projects/components/endpoint-editor-utils.ts apps/web/src/features/projects/components/endpoint-editor.tsx apps/web/src/features/projects/components/endpoint-mock-rules-panel.tsx apps/web/src/features/projects/components/endpoint-mock-simulator-panel.tsx apps/web/src/features/projects/components/endpoint-editor.test.tsx apps/web/src/features/projects/components/project-shell.test.tsx
git commit -m "feat: edit and simulate mock body conditions"
```

### Task 4: 做最终回归验证并整理提交

**Files:**
- No new code expected unless verification 暴露缺口

- [ ] **Step 1: 跑后端 Mock 目标测试集，确认 DTO、仓储、模拟器和运行时全部一致**

Run: `Set-Location services/apihub-server; $env:JAVA_HOME='D:\dev-tool\java\openjdk-21\jdk-21.0.2'; mvn test "-Dtest=ProjectServiceTest,ApiMockRuleControllerTest,MockRuntimeResolverTest,MockServiceTest,ApiMockSimulationControllerTest"`

Expected: PASS

- [ ] **Step 2: 跑前端相关测试集，确认 endpoint editor 与 project shell 没有回归**

Run: `pnpm --filter web test -- src/features/projects/components/endpoint-editor.test.tsx src/features/projects/components/project-shell.test.tsx`

Expected: PASS

- [ ] **Step 3: 跑前端生产构建**

Run: `pnpm --filter web build`

Expected: PASS

- [ ] **Step 4: 检查 git 状态，只保留本功能相关文件**

Run: `git status --short`

Expected: 只出现本功能改动；若有用户自己的无关文件，不回滚，只在提交时精确 `git add`。

- [ ] **Step 5: 提交最终整合结果**

```bash
git add infra/mysql/001_phase1_schema.sql services/apihub-server/src/main services/apihub-server/src/test packages/api-sdk/src/modules/projects.ts apps/web/src/features/projects/components docs/superpowers/plans/2026-04-11-mock-body-jsonpath-conditions.md
git commit -m "feat: support mock body jsonpath conditions"
```
