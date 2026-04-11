# Endpoint Mock Release And Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为单个 endpoint 建立独立 Mock 发布快照、草稿命中模拟器，以及明确的“草稿态 / 运行态(发布态)”边界。

**Architecture:** 后端新增 `mock_release` 快照表；`/mock/{projectId}/**` 运行时只读取最新发布快照，不再回退到草稿或 `api_version`。草稿命中模拟通过专用 API 调用后端统一匹配器，匹配能力限定为现有 `query/header` 精确匹配。

**Tech Stack:** `Spring Boot 3.2`, `Java 21`, `JdbcTemplate`, `MySQL 8`, `H2`, `Next.js 15`, `React 19`, `TypeScript`, `Vitest`

---

### Task 1: 增加 Mock 发布快照持久化层

**Files:**
- Modify: `infra/mysql/001_phase1_schema.sql`
- Modify: `services/apihub-server/src/test/resources/project-service-schema.sql`
- Modify: `services/apihub-server/src/main/java/com/apihub/mock/model/MockDtos.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/doc/repository/EndpointRepository.java`
- Create: `services/apihub-server/src/test/java/com/apihub/doc/repository/EndpointRepositoryMockReleaseTest.java`

- [ ] **Step 1: 写失败测试，定义发布快照仓储行为**

```java
@JdbcTest
@Import(EndpointRepository.class)
@Sql(scripts = {"/project-service-schema.sql", "/project-service-data.sql"})
class EndpointRepositoryMockReleaseTest {
    @Autowired
    private EndpointRepository endpointRepository;

    @Test
    void shouldCreateAndListMockReleases() {
        assertThat(endpointRepository.listMockReleases(1L)).isEmpty();
        MockReleaseDetail created = endpointRepository.createMockRelease(1L, "[]", "[]");
        assertThat(created.releaseNo()).isEqualTo(1);
        assertThat(endpointRepository.findLatestMockRelease(1L)).isPresent();
        assertThat(endpointRepository.listMockReleases(1L)).hasSize(1);
    }
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd services/apihub-server; .\gradlew.bat test --tests com.apihub.doc.repository.EndpointRepositoryMockReleaseTest --no-daemon`
Expected: FAIL，提示 `mock_release` 表/方法/DTO 不存在。

- [ ] **Step 3: 增加 schema、DTO、Repository 方法最小实现**

```sql
CREATE TABLE mock_release (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  endpoint_id BIGINT NOT NULL,
  release_no INT NOT NULL,
  response_snapshot_json JSON NOT NULL,
  rules_snapshot_json JSON NOT NULL,
  created_by BIGINT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_mock_release_endpoint_release_no (endpoint_id, release_no),
  KEY idx_mock_release_endpoint_created (endpoint_id, created_at DESC, id DESC)
);
```

```java
public record MockReleaseDetail(
        Long id,
        Long endpointId,
        int releaseNo,
        String responseSnapshotJson,
        String rulesSnapshotJson,
        Instant createdAt
) {}
```

```java
public List<MockReleaseDetail> listMockReleases(Long endpointId) {
    return jdbcTemplate.query("""
            select id, endpoint_id, release_no, response_snapshot_json, rules_snapshot_json, created_at
            from mock_release
            where endpoint_id = ?
            order by release_no desc, id desc
            """, MOCK_RELEASE_ROW_MAPPER, endpointId);
}

public Optional<MockReleaseDetail> findLatestMockRelease(Long endpointId) {
    return jdbcTemplate.query("""
            select id, endpoint_id, release_no, response_snapshot_json, rules_snapshot_json, created_at
            from mock_release
            where endpoint_id = ?
            order by release_no desc, id desc
            limit 1
            """, MOCK_RELEASE_ROW_MAPPER, endpointId).stream().findFirst();
}

public MockReleaseDetail createMockRelease(Long endpointId, String responseSnapshotJson, String rulesSnapshotJson) {
    GeneratedKeyHolder keyHolder = new GeneratedKeyHolder();
    jdbcTemplate.update(connection -> {
        PreparedStatement statement = connection.prepareStatement("""
                insert into mock_release (endpoint_id, release_no, response_snapshot_json, rules_snapshot_json, created_by)
                values (?, ?, ?, ?, ?)
                """, Statement.RETURN_GENERATED_KEYS);
        statement.setLong(1, endpointId);
        statement.setInt(2, nextMockReleaseNo(endpointId));
        statement.setString(3, responseSnapshotJson);
        statement.setString(4, rulesSnapshotJson);
        statement.setLong(5, DEFAULT_USER_ID);
        return statement;
    }, keyHolder);
    return findMockRelease(requireGeneratedId(keyHolder)).orElseThrow();
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd services/apihub-server; .\gradlew.bat test --tests com.apihub.doc.repository.EndpointRepositoryMockReleaseTest --no-daemon`
Expected: PASS

- [ ] **Step 5: 提交这一任务**

```bash
git add infra/mysql/001_phase1_schema.sql services/apihub-server/src/test/resources/project-service-schema.sql services/apihub-server/src/main/java/com/apihub/mock/model/MockDtos.java services/apihub-server/src/main/java/com/apihub/doc/repository/EndpointRepository.java services/apihub-server/src/test/java/com/apihub/doc/repository/EndpointRepositoryMockReleaseTest.java
git commit -m "feat: add endpoint mock release repository"
```

### Task 2: 实现统一 Mock 匹配器（草稿模拟与运行态共用）

**Files:**
- Modify: `services/apihub-server/src/main/java/com/apihub/mock/model/MockDtos.java`
- Create: `services/apihub-server/src/main/java/com/apihub/mock/service/MockRuntimeResolver.java`
- Create: `services/apihub-server/src/test/java/com/apihub/mock/service/MockRuntimeResolverTest.java`

- [ ] **Step 1: 写失败测试，固定命中和回退语义**

```java
class MockRuntimeResolverTest {
    private final MockRuntimeResolver resolver = new MockRuntimeResolver();

    @Test
    void shouldMatchRuleByQueryAndHeader() {
        MockSimulationResult result = resolver.resolveDraft(new MockSimulationRequest(
                List.of(new MockRuleDetail(7L, 31L, "Unauthorized", 100, true,
                        List.of(new MockConditionEntry("mode", "strict")),
                        List.of(new MockConditionEntry("x-scenario", "unauthorized")),
                        401, "application/json", "{\"error\":\"token expired\"}")),
                List.of(new MockSimulationResponseItem(200, "application/json", "userId", "string", true, "", "u_1001")),
                List.of(new MockConditionEntry("mode", "strict")),
                List.of(new MockConditionEntry("x-scenario", "unauthorized"))
        ));
        assertThat(result.source()).isEqualTo("rule");
        assertThat(result.matchedRuleName()).isEqualTo("Unauthorized");
        assertThat(result.statusCode()).isEqualTo(401);
    }

    @Test
    void shouldFallbackWhenNoRuleMatched() {
        MockSimulationResult result = resolver.resolveDraft(new MockSimulationRequest(
                List.of(new MockRuleDetail(7L, 31L, "Unauthorized", 100, true,
                        List.of(),
                        List.of(new MockConditionEntry("x-scenario", "unauthorized")),
                        401, "application/json", "{\"error\":\"token expired\"}")),
                List.of(new MockSimulationResponseItem(200, "application/json", "userId", "string", true, "", "u_1001")),
                List.of(),
                List.of()
        ));
        assertThat(result.source()).isEqualTo("default-response");
        assertThat(result.matchedRuleName()).isNull();
        assertThat(result.explanations()).isNotEmpty();
    }
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd services/apihub-server; .\gradlew.bat test --tests com.apihub.mock.service.MockRuntimeResolverTest --no-daemon`
Expected: FAIL，提示解析器和模拟 DTO 不存在。

- [ ] **Step 3: 增加模拟 DTO 与解析器实现（仅 query/header 精确匹配）**

```java
public record MockSimulationRequest(
        List<MockRuleDetail> draftRules,
        List<MockSimulationResponseItem> draftResponses,
        List<MockConditionEntry> querySamples,
        List<MockConditionEntry> headerSamples
) {}

public record MockSimulationResult(
        String source,
        String matchedRuleName,
        Integer matchedRulePriority,
        List<String> explanations,
        int statusCode,
        String mediaType,
        String body
) {}
```

```java
@Service
public class MockRuntimeResolver {
    public MockSimulationResult resolveDraft(MockSimulationRequest request) {
        // 1. enabled + priority desc 规则遍历
        // 2. query/header 精确匹配
        // 3. 命中返回 rule 响应
        // 4. 未命中返回 default-response（来自 draftResponses 的首个状态组）
    }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd services/apihub-server; .\gradlew.bat test --tests com.apihub.mock.service.MockRuntimeResolverTest --no-daemon`
Expected: PASS

- [ ] **Step 5: 提交这一任务**

```bash
git add services/apihub-server/src/main/java/com/apihub/mock/model/MockDtos.java services/apihub-server/src/main/java/com/apihub/mock/service/MockRuntimeResolver.java services/apihub-server/src/test/java/com/apihub/mock/service/MockRuntimeResolverTest.java
git commit -m "feat: add mock runtime resolver for draft simulation"
```

### Task 3: 后端 API 与运行态切换到“只认发布态”

**Files:**
- Create: `services/apihub-server/src/main/java/com/apihub/mock/web/ApiMockReleaseController.java`
- Create: `services/apihub-server/src/main/java/com/apihub/mock/web/ApiMockSimulationController.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/project/service/ProjectService.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/mock/service/MockService.java`
- Create: `services/apihub-server/src/test/java/com/apihub/mock/web/ApiMockReleaseControllerTest.java`
- Create: `services/apihub-server/src/test/java/com/apihub/mock/web/ApiMockSimulationControllerTest.java`
- Modify: `services/apihub-server/src/test/java/com/apihub/mock/service/MockServiceTest.java`

- [ ] **Step 1: 写失败测试，覆盖发布 API、模拟 API、运行态无发布即失败**

```java
// /api/v1/endpoints/{endpointId}/mock-releases GET/POST
// /api/v1/endpoints/{endpointId}/mock-simulations POST
// MockService.resolve(): 无发布快照时返回 404
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd services/apihub-server; .\gradlew.bat test --tests com.apihub.mock.web.ApiMockReleaseControllerTest --tests com.apihub.mock.web.ApiMockSimulationControllerTest --tests com.apihub.mock.service.MockServiceTest --no-daemon`
Expected: FAIL，提示新接口与新行为尚未实现。

- [ ] **Step 3: 增加 Controller + Service 方法并改造运行态逻辑**

```java
@GetMapping("/api/v1/endpoints/{endpointId}/mock-releases")
public ApiResponse<List<MockReleaseDetail>> listMockReleases(@PathVariable Long endpointId) {
    return ApiResponse.success(projectService.listMockReleases(endpointId));
}

@PostMapping("/api/v1/endpoints/{endpointId}/mock-releases")
public ApiResponse<MockReleaseDetail> publishMockRelease(@PathVariable Long endpointId) {
    return ApiResponse.success(projectService.publishMockRelease(endpointId));
}
```

```java
@PostMapping("/api/v1/endpoints/{endpointId}/mock-simulations")
public ApiResponse<MockSimulationResult> simulate(@PathVariable Long endpointId,
                                                  @RequestBody MockSimulationRequest request) {
    return ApiResponse.success(projectService.simulateMock(endpointId, request));
}
```

```java
// ProjectService
public List<MockReleaseDetail> listMockReleases(Long endpointId) {
    requireEndpoint(endpointId);
    return endpointRepository.listMockReleases(endpointId);
}

public MockReleaseDetail publishMockRelease(Long endpointId) {
    requireEndpoint(endpointId);
    String responseSnapshotJson = writeJson(endpointRepository.listResponses(endpointId));
    String rulesSnapshotJson = writeJson(endpointRepository.listMockRules(endpointId));
    return endpointRepository.createMockRelease(endpointId, responseSnapshotJson, rulesSnapshotJson);
}

public MockSimulationResult simulateMock(Long endpointId, MockSimulationRequest request) {
    requireEndpoint(endpointId);
    return mockRuntimeResolver.resolveDraft(request);
}
```

```java
// MockService.resolve
MockReleaseDetail release = endpointRepository.findLatestMockRelease(endpoint.id())
    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Mock release not published"));
// 从 release 快照构造 request，交给 MockRuntimeResolver 计算
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd services/apihub-server; .\gradlew.bat test --tests com.apihub.mock.web.ApiMockReleaseControllerTest --tests com.apihub.mock.web.ApiMockSimulationControllerTest --tests com.apihub.mock.service.MockServiceTest --no-daemon`
Expected: PASS

- [ ] **Step 5: 提交这一任务**

```bash
git add services/apihub-server/src/main/java/com/apihub/mock/web/ApiMockReleaseController.java services/apihub-server/src/main/java/com/apihub/mock/web/ApiMockSimulationController.java services/apihub-server/src/main/java/com/apihub/project/service/ProjectService.java services/apihub-server/src/main/java/com/apihub/mock/service/MockService.java services/apihub-server/src/test/java/com/apihub/mock/web/ApiMockReleaseControllerTest.java services/apihub-server/src/test/java/com/apihub/mock/web/ApiMockSimulationControllerTest.java services/apihub-server/src/test/java/com/apihub/mock/service/MockServiceTest.java
git commit -m "feat: add mock publish and simulation backend apis"
```

### Task 4: SDK 与 ProjectShell 接入新 Mock API

**Files:**
- Modify: `packages/api-sdk/src/modules/projects.ts`
- Modify: `apps/web/src/features/projects/components/project-shell.tsx`
- Modify: `apps/web/src/features/projects/components/project-shell.test.tsx`

- [ ] **Step 1: 写失败测试，覆盖发布动作和模拟动作透传**

```tsx
// project-shell.test.tsx
// 1. 选中 endpoint 后加载 mock releases
// 2. 点击 Publish mock 调用 publishEndpointMockRelease(endpointId)
// 3. 点击 Run mock simulation 调用 simulateEndpointMock(endpointId, payload)
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test -- src/features/projects/components/project-shell.test.tsx`
Expected: FAIL，提示 SDK 方法与 shell handler 不存在。

- [ ] **Step 3: SDK 新增 API，并在 shell 中串联状态**

```ts
export function fetchEndpointMockReleases(endpointId: number) {
  return apiFetch<MockReleaseDetail[]>(`/api/v1/endpoints/${endpointId}/mock-releases`);
}

export function publishEndpointMockRelease(endpointId: number) {
  return apiFetch<MockReleaseDetail>(`/api/v1/endpoints/${endpointId}/mock-releases`, {
    method: "POST"
  });
}

export function simulateEndpointMock(endpointId: number, payload: MockSimulationPayload) {
  return apiFetch<MockSimulationResult>(`/api/v1/endpoints/${endpointId}/mock-simulations`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
```

```tsx
const [mockReleases, setMockReleases] = useState<MockReleaseDetail[]>([]);

async function handlePublishMockRelease() {
  if (!selectedEndpointId) {
    return;
  }
  await publishEndpointMockRelease(selectedEndpointId);
  const response = await fetchEndpointMockReleases(selectedEndpointId);
  setMockReleases(response.data);
}

async function handleSimulateMock(payload: MockSimulationPayload) {
  if (!selectedEndpointId) {
    throw new Error("No endpoint selected");
  }
  const response = await simulateEndpointMock(selectedEndpointId, payload);
  return response.data;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test -- src/features/projects/components/project-shell.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交这一任务**

```bash
git add packages/api-sdk/src/modules/projects.ts apps/web/src/features/projects/components/project-shell.tsx apps/web/src/features/projects/components/project-shell.test.tsx
git commit -m "feat: wire mock release and simulation in project shell"
```

### Task 5: EndpointEditor 拆分 Mock 草稿模拟与发布运行态展示

**Files:**
- Modify: `apps/web/src/features/projects/components/endpoint-editor.tsx`
- Modify: `apps/web/src/features/projects/components/endpoint-editor.test.tsx`

- [ ] **Step 1: 写失败测试，固定三段式 UI 行为**

```tsx
// endpoint-editor.test.tsx
// 1. Mock Simulator: 输入 query/header 样例后可触发 onSimulateMock 并显示 matched rule / fallback 信息
// 2. Published Runtime: 显示当前 Release #N 或未发布状态
// 3. Publish mock 按钮触发 onPublishMockRelease
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter web test -- src/features/projects/components/endpoint-editor.test.tsx`
Expected: FAIL，提示新 props 与新区域尚未实现。

- [ ] **Step 3: 改造 EndpointEditor 的 Mock 区域**

```tsx
type EndpointEditorProps = {
  endpoint: EndpointDetail | null;
  projectId: number;
  versions: VersionDetail[];
  mockReleases?: MockReleaseDetail[];
  onPublishMockRelease?: () => Promise<void>;
  onSimulateMock?: (payload: MockSimulationPayload) => Promise<MockSimulationResult>;
  onSaveMockRules?: (payload: MockRuleUpsertItem[]) => Promise<void>;
  onSaveResponses?: (payload: ResponseUpsertItem[]) => Promise<void>;
};
```

```tsx
<EditorPanel title="Mock Rules Draft">
  <button type="button" onClick={() => setMockRuleRows((current) => [...current, createMockRuleDraft()])}>
    Add mock rule
  </button>
</EditorPanel>

<EditorPanel title="Mock Simulator">
  <textarea aria-label="Simulator query samples" value={simulationQueryText} onChange={(event) => setSimulationQueryText(event.target.value)} />
  <textarea aria-label="Simulator header samples" value={simulationHeaderText} onChange={(event) => setSimulationHeaderText(event.target.value)} />
  <button type="button" onClick={() => void handleRunSimulation()}>Run mock simulation</button>
  {simulationResult ? <pre>{simulationResult.body}</pre> : null}
</EditorPanel>

<EditorPanel title="Published Runtime">
  <p>{mockReleases.length > 0 ? `Release #${mockReleases[0].releaseNo}` : "No published release yet."}</p>
  <button type="button" onClick={() => void onPublishMockRelease?.()}>Publish mock</button>
</EditorPanel>
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter web test -- src/features/projects/components/endpoint-editor.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交这一任务**

```bash
git add apps/web/src/features/projects/components/endpoint-editor.tsx apps/web/src/features/projects/components/endpoint-editor.test.tsx
git commit -m "feat: separate draft simulator and published runtime in endpoint editor"
```

### Task 6: 最终验证与范围复核

**Files:**
- Modify: `infra/mysql/001_phase1_schema.sql`
- Modify: `services/apihub-server/src/main/java/com/apihub/mock/service/MockService.java`
- Modify: `apps/web/src/features/projects/components/endpoint-editor.tsx`
- Modify: `apps/web/src/features/projects/components/project-shell.tsx`

- [ ] **Step 1: 跑后端目标测试集**

Run: `cd services/apihub-server; .\gradlew.bat test --tests com.apihub.doc.repository.EndpointRepositoryMockReleaseTest --tests com.apihub.mock.service.MockRuntimeResolverTest --tests com.apihub.mock.web.ApiMockReleaseControllerTest --tests com.apihub.mock.web.ApiMockSimulationControllerTest --tests com.apihub.mock.service.MockServiceTest --no-daemon`
Expected: PASS

- [ ] **Step 2: 跑前端目标测试集**

Run: `pnpm --filter web test -- src/features/projects/components/endpoint-editor.test.tsx src/features/projects/components/project-shell.test.tsx`
Expected: PASS

- [ ] **Step 3: 运行前端构建验证类型和路由编译**

Run: `pnpm --filter web build`
Expected: PASS

- [ ] **Step 4: 复核变更范围**

Run: `git diff -- infra/mysql/001_phase1_schema.sql services/apihub-server packages/api-sdk/src/modules/projects.ts apps/web/src/features/projects/components/endpoint-editor.tsx apps/web/src/features/projects/components/project-shell.tsx`
Expected: 仅包含发布快照、发布/模拟 API、运行态边界切换、编辑器与工作台联动改造。

- [ ] **Step 5: 提交最终特性集成**

```bash
git add infra/mysql/001_phase1_schema.sql services/apihub-server packages/api-sdk/src/modules/projects.ts apps/web/src/features/projects/components/endpoint-editor.tsx apps/web/src/features/projects/components/endpoint-editor.test.tsx apps/web/src/features/projects/components/project-shell.tsx apps/web/src/features/projects/components/project-shell.test.tsx
git commit -m "feat: add endpoint mock release boundary and draft simulator"
```

## Self-Review

### Spec coverage
- endpoint 级独立发布：Task 1, Task 3
- 运行态只认发布态：Task 3
- 草稿模拟复用后端匹配器：Task 2, Task 3, Task 4, Task 5
- 只支持 query/header 精确匹配：Task 2
- 前端边界清晰展示：Task 5

### Placeholder scan
- 无占位词或“后续补齐”描述
- 每个任务都有明确文件路径、命令和预期结果
- 涉及代码变更的步骤均给出代码片段

### Type consistency
- 发布实体统一为 `MockReleaseDetail`
- 模拟请求/响应统一为 `MockSimulationRequest` / `MockSimulationResult`
- 运行态未发布错误统一为 `Mock release not published`
