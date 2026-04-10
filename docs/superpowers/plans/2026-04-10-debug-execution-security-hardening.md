# Debug Execution Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 ApiHub 调试执行链路补齐 host allowlist、私网显式放行、全局超时与响应体限制，以及前端可见的策略阻断反馈。

**Architecture:** 在现有项目/环境 CRUD 上扩展调试安全配置字段，不新开独立策略资源。后端在 `DebugService` 前增加独立的策略验证与匹配层，执行器读取全局配置，前端在现有环境面板中补项目级与环境级策略编辑，在 `DebugConsole` 中区分普通错误和策略阻断。

**Tech Stack:** `Spring Boot 3.2`, `Java 21`, `JdbcTemplate`, `MySQL 8`, `H2`, `Next.js 15`, `React 19`, `TypeScript`, `Vitest`

---

## File Map

### Backend persistence and DTOs

- Modify: `infra/mysql/001_phase1_schema.sql`
- Modify: `infra/mysql/002_phase1_seed.sql`
- Modify: `services/apihub-server/src/test/resources/project-service-schema.sql`
- Modify: `services/apihub-server/src/test/resources/project-service-data.sql`
- Modify: `services/apihub-server/src/main/java/com/apihub/project/model/ProjectDtos.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/project/repository/ProjectRepository.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/project/service/ProjectService.java`

### Backend debug security

- Create: `services/apihub-server/src/main/java/com/apihub/debug/config/DebugSecurityProperties.java`
- Create: `services/apihub-server/src/main/java/com/apihub/debug/service/DebugSecurityException.java`
- Create: `services/apihub-server/src/main/java/com/apihub/debug/service/DebugTargetRuleValidator.java`
- Create: `services/apihub-server/src/main/java/com/apihub/debug/service/DebugTargetMatcher.java`
- Create: `services/apihub-server/src/main/java/com/apihub/debug/service/DebugTargetPolicyResolver.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/debug/model/DebugDtos.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/debug/service/DebugService.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/debug/service/JdkDebugHttpExecutor.java`
- Create: `services/apihub-server/src/main/java/com/apihub/debug/web/DebugControllerAdvice.java`
- Modify: `services/apihub-server/src/main/resources/application.yml`

### Frontend SDK and UI

- Modify: `packages/api-sdk/src/client.ts`
- Modify: `packages/api-sdk/src/modules/projects.ts`
- Modify: `apps/web/src/features/projects/components/project-shell.tsx`
- Modify: `apps/web/src/features/projects/components/environment-panel.tsx`
- Modify: `apps/web/src/features/projects/components/debug-console.tsx`
- Create: `apps/web/src/features/projects/components/debug-target-rule-editor.tsx`
- Create: `apps/web/src/features/projects/components/environment-panel.test.tsx`
- Create: `apps/web/src/features/projects/components/debug-console.test.tsx`
- Modify: `apps/web/src/features/projects/components/project-shell.test.tsx`

### Verification

- Modify: `services/apihub-server/src/test/java/com/apihub/project/service/ProjectServiceTest.java`
- Modify: `services/apihub-server/src/test/java/com/apihub/debug/service/DebugServiceTest.java`
- Modify: `services/apihub-server/src/test/java/com/apihub/debug/web/DebugControllerTest.java`
- Create: `services/apihub-server/src/test/java/com/apihub/debug/service/JdkDebugHttpExecutorTest.java`

### Execution precondition

- 在执行本计划前，先基于 `main` 创建独立 worktree，避免污染当前主工作区里用户未提交的改动。

### Task 1: 扩展项目/环境调试安全配置的持久化模型

**Files:**
- Modify: `infra/mysql/001_phase1_schema.sql`
- Modify: `infra/mysql/002_phase1_seed.sql`
- Modify: `services/apihub-server/src/test/resources/project-service-schema.sql`
- Modify: `services/apihub-server/src/test/resources/project-service-data.sql`
- Modify: `services/apihub-server/src/main/java/com/apihub/project/model/ProjectDtos.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/project/repository/ProjectRepository.java`
- Test: `services/apihub-server/src/test/java/com/apihub/project/service/ProjectServiceTest.java`

- [ ] **Step 1: 先写失败测试，固定项目级与环境级调试策略字段的读写契约**

```java
@Test
void shouldPersistProjectAndEnvironmentDebugPolicies() {
    var project = projectService.createProject(new CreateProjectRequest(
            "Secure",
            "secure",
            "debug policy",
            List.of(new DebugTargetRuleEntry("api.partner.com", false))));

    var savedProject = projectService.updateProject(project.id(), new UpdateProjectRequest(
            "Secure",
            "debug policy updated",
            List.of(new DebugTargetRuleEntry("*.corp.example.com", false))));

    var environment = projectService.createEnvironment(project.id(), new CreateEnvironmentRequest(
            "Staging",
            "https://staging.example.com",
            true,
            List.of(),
            List.of(),
            List.of(),
            "none",
            "",
            "",
            "append",
            List.of(new DebugTargetRuleEntry("10.10.1.8", true))));

    assertThat(savedProject.debugAllowedHosts())
            .containsExactly(new DebugTargetRuleEntry("*.corp.example.com", false));
    assertThat(environment.debugHostMode()).isEqualTo("append");
    assertThat(environment.debugAllowedHosts())
            .containsExactly(new DebugTargetRuleEntry("10.10.1.8", true));
}
```

- [ ] **Step 2: 运行测试，确认当前模型确实不支持这些字段**

Run: `Set-Location services/apihub-server; .\gradlew.bat test --tests com.apihub.project.service.ProjectServiceTest --no-daemon`
Expected: FAIL，提示 `CreateProjectRequest` / `UpdateProjectRequest` / `EnvironmentDetail` 等 DTO 缺少 `debugAllowedHosts` 或 `debugHostMode` 字段。

- [ ] **Step 3: 修改 schema、seed、DTO、repository，让调试策略字段真正落表并能读回**

```sql
alter table project
  add column debug_allowed_hosts_json json not null;

alter table environment
  add column debug_host_mode varchar(16) not null default 'inherit',
  add column debug_allowed_hosts_json json not null;
```

```sql
insert into project (
  id, space_id, name, project_key, description, owner_id, status, debug_allowed_hosts_json
) values (
  1, 1, 'Default Project', 'default', 'Seed project for phase 1 workbench', 1, 'active', json_array()
);

insert into environment (
  id, project_id, name, base_url, is_default, variables_json, default_headers_json,
  default_query_json, auth_mode, auth_key, auth_value, debug_host_mode, debug_allowed_hosts_json, created_by
) values (
  1, 1, 'Local', 'https://local.dev', 1, json_array(), json_array(), json_array(),
  'none', '', '', 'inherit', json_array(), 1
);
```

```java
public record DebugTargetRuleEntry(String pattern, boolean allowPrivate) {
}

public record CreateProjectRequest(
        String name,
        String projectKey,
        String description,
        List<DebugTargetRuleEntry> debugAllowedHosts
) {
}

public record UpdateProjectRequest(
        String name,
        String description,
        List<DebugTargetRuleEntry> debugAllowedHosts
) {
}

public record EnvironmentDetail(
        Long id,
        Long projectId,
        String name,
        String baseUrl,
        boolean isDefault,
        List<EnvironmentEntry> variables,
        List<EnvironmentEntry> defaultHeaders,
        List<EnvironmentEntry> defaultQuery,
        String authMode,
        String authKey,
        String authValue,
        String debugHostMode,
        List<DebugTargetRuleEntry> debugAllowedHosts
) {
}
```

```java
private static final RowMapper<ProjectDetail> PROJECT_ROW_MAPPER = (rs, rowNum) -> new ProjectDetail(
        rs.getLong("id"),
        rs.getString("name"),
        rs.getString("project_key"),
        rs.getString("description"),
        deserializeDebugRules(rs.getString("debug_allowed_hosts_json")));

private static final RowMapper<EnvironmentDetail> ENVIRONMENT_ROW_MAPPER = (rs, rowNum) -> new EnvironmentDetail(
        rs.getLong("id"),
        rs.getLong("project_id"),
        rs.getString("name"),
        rs.getString("base_url"),
        rs.getBoolean("is_default"),
        deserializeEntries(rs.getString("variables_json")),
        deserializeEntries(rs.getString("default_headers_json")),
        deserializeEntries(rs.getString("default_query_json")),
        rs.getString("auth_mode"),
        rs.getString("auth_key"),
        rs.getString("auth_value"),
        rs.getString("debug_host_mode"),
        deserializeDebugRules(rs.getString("debug_allowed_hosts_json")));
```

- [ ] **Step 4: 重跑持久化测试，确认项目与环境的调试策略字段可正确写入和回读**

Run: `Set-Location services/apihub-server; .\gradlew.bat test --tests com.apihub.project.service.ProjectServiceTest --no-daemon`
Expected: PASS

- [ ] **Step 5: 提交本任务**

```bash
git add infra/mysql/001_phase1_schema.sql infra/mysql/002_phase1_seed.sql services/apihub-server/src/test/resources/project-service-schema.sql services/apihub-server/src/test/resources/project-service-data.sql services/apihub-server/src/main/java/com/apihub/project/model/ProjectDtos.java services/apihub-server/src/main/java/com/apihub/project/repository/ProjectRepository.java services/apihub-server/src/test/java/com/apihub/project/service/ProjectServiceTest.java
git commit -m "feat: persist debug target policy settings"
```

### Task 2: 为项目/环境策略保存增加校验器和合并器

**Files:**
- Create: `services/apihub-server/src/main/java/com/apihub/debug/service/DebugTargetRuleValidator.java`
- Create: `services/apihub-server/src/main/java/com/apihub/debug/service/DebugTargetMatcher.java`
- Create: `services/apihub-server/src/main/java/com/apihub/debug/service/DebugTargetPolicyResolver.java`
- Create: `services/apihub-server/src/main/java/com/apihub/debug/service/DebugSecurityException.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/project/service/ProjectService.java`
- Test: `services/apihub-server/src/test/java/com/apihub/project/service/ProjectServiceTest.java`

- [ ] **Step 1: 先写失败测试，固定非法 pattern、非法 mode 和规则合并语义**

```java
@Test
void shouldRejectInvalidDebugRulePattern() {
    assertThatThrownBy(() -> projectService.updateProject(1L, new UpdateProjectRequest(
            "Default Project",
            "Seed project",
            List.of(new DebugTargetRuleEntry("https://bad.example.com/path", false)))))
            .isInstanceOf(ResponseStatusException.class)
            .extracting(error -> ((ResponseStatusException) error).getStatusCode())
            .isEqualTo(HttpStatus.BAD_REQUEST);
}

@Test
void shouldRejectInvalidEnvironmentDebugMode() {
    assertThatThrownBy(() -> projectService.updateEnvironment(1L, new UpdateEnvironmentRequest(
            "Local",
            "https://local.dev",
            true,
            List.of(),
            List.of(),
            List.of(),
            "none",
            "",
            "",
            "merge-all",
            List.of())))
            .isInstanceOf(ResponseStatusException.class)
            .extracting(error -> ((ResponseStatusException) error).getStatusCode())
            .isEqualTo(HttpStatus.BAD_REQUEST);
}
```

- [ ] **Step 2: 运行测试，确认当前服务层没有做这些校验**

Run: `Set-Location services/apihub-server; .\gradlew.bat test --tests com.apihub.project.service.ProjectServiceTest --no-daemon`
Expected: FAIL，提示更新项目或环境时没有抛出 `400`。

- [ ] **Step 3: 实现规则校验器、host 匹配器和环境模式合并器，并在 `ProjectService` 保存前调用**

```java
public void validateRules(List<DebugTargetRuleEntry> rules) {
    for (DebugTargetRuleEntry rule : rules == null ? List.<DebugTargetRuleEntry>of() : rules) {
        String pattern = normalizePattern(rule.pattern());
        if (pattern.contains("://") || pattern.contains("/") || pattern.contains("?") || pattern.contains(":")) {
            throw DebugSecurityException.badRequest(
                    "DEBUG_RULE_PATTERN_INVALID",
                    "调试白名单规则只允许填写 host 或 IP");
        }
        if (pattern.startsWith("*") && !pattern.startsWith("*.")) {
            throw DebugSecurityException.badRequest(
                    "DEBUG_RULE_PATTERN_INVALID",
                    "通配规则只允许使用 *.<domain> 形式");
        }
    }
}
```

```java
public List<DebugTargetRuleEntry> resolveEffectiveRules(
        List<DebugTargetRuleEntry> globalRules,
        List<DebugTargetRuleEntry> projectRules,
        String environmentMode,
        List<DebugTargetRuleEntry> environmentRules
) {
    return switch (environmentMode) {
        case "inherit" -> concat(globalRules, projectRules);
        case "append" -> concat(globalRules, projectRules, environmentRules);
        case "override" -> concat(globalRules, environmentRules);
        default -> throw DebugSecurityException.badRequest(
                "DEBUG_ENVIRONMENT_MODE_INVALID",
                "调试环境策略模式不合法");
    };
}
```

```java
public ProjectDetail updateProject(Long projectId, UpdateProjectRequest request) {
    ProjectDetail current = requireProject(projectId);
    List<DebugTargetRuleEntry> debugAllowedHosts = request.debugAllowedHosts() != null
            ? request.debugAllowedHosts()
            : current.debugAllowedHosts();
    debugTargetRuleValidator.validateRules(debugAllowedHosts);
    return projectRepository.updateProject(
            projectId,
            request.name() != null ? request.name() : current.name(),
            request.description() != null ? request.description() : current.description(),
            debugAllowedHosts);
}
```

- [ ] **Step 4: 重跑服务层测试，确认保存前校验与模式校验已经生效**

Run: `Set-Location services/apihub-server; .\gradlew.bat test --tests com.apihub.project.service.ProjectServiceTest --no-daemon`
Expected: PASS

- [ ] **Step 5: 提交本任务**

```bash
git add services/apihub-server/src/main/java/com/apihub/debug/service/DebugTargetRuleValidator.java services/apihub-server/src/main/java/com/apihub/debug/service/DebugTargetMatcher.java services/apihub-server/src/main/java/com/apihub/debug/service/DebugTargetPolicyResolver.java services/apihub-server/src/main/java/com/apihub/debug/service/DebugSecurityException.java services/apihub-server/src/main/java/com/apihub/project/service/ProjectService.java services/apihub-server/src/test/java/com/apihub/project/service/ProjectServiceTest.java
git commit -m "feat: validate and resolve debug target policies"
```

### Task 3: 在调试执行链路中接入目标访问控制与全局限制

**Files:**
- Create: `services/apihub-server/src/main/java/com/apihub/debug/config/DebugSecurityProperties.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/debug/model/DebugDtos.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/debug/service/DebugService.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/debug/service/JdkDebugHttpExecutor.java`
- Modify: `services/apihub-server/src/main/resources/application.yml`
- Test: `services/apihub-server/src/test/java/com/apihub/debug/service/DebugServiceTest.java`
- Test: `services/apihub-server/src/test/java/com/apihub/debug/service/JdkDebugHttpExecutorTest.java`

- [ ] **Step 1: 先写失败测试，固定 allowlist、私网、override/append 与历史记录写入边界**

```java
@Test
void shouldBlockHostOutsideAllowlist() {
    given(projectRepository.findProject(1L)).willReturn(Optional.of(
            new ProjectDetail(1L, "Default", "default", "Seed", List.of())));
    given(projectRepository.findEnvironment(41L)).willReturn(Optional.of(
            new EnvironmentDetail(41L, 1L, "Local", "https://blocked.example.com", true,
                    List.of(), List.of(), List.of(), "none", "", "", "inherit", List.of())));
    given(endpointRepository.findEndpointReference(31L)).willReturn(Optional.of(
            new EndpointRepository.EndpointReference(31L, 21L, 1L)));
    given(endpointRepository.findEndpoint(31L)).willReturn(Optional.of(
            new EndpointDetail(31L, 21L, "Get User", "GET", "/users/31", "Load user", false)));

    assertThatThrownBy(() -> debugService.execute(new ExecuteDebugRequest(41L, 31L, "", List.of(), "")))
            .isInstanceOf(DebugSecurityException.class)
            .extracting(error -> ((DebugSecurityException) error).getErrorCode())
            .isEqualTo("DEBUG_TARGET_NOT_ALLOWED");

    verify(debugHistoryRepository, never()).saveHistory(anyLong(), anyLong(), anyLong(), anyString(), anyString(), anyList(), anyString(), anyInt(), anyList(), anyString(), anyLong());
}

@Test
void shouldRequireExplicitPrivateAllowance() {
    given(projectRepository.findProject(1L)).willReturn(Optional.of(
            new ProjectDetail(1L, "Default", "default", "Seed", List.of(new DebugTargetRuleEntry("10.10.1.8", false)))));
    given(projectRepository.findEnvironment(41L)).willReturn(Optional.of(
            new EnvironmentDetail(41L, 1L, "Local", "http://10.10.1.8", true,
                    List.of(), List.of(), List.of(), "none", "", "", "inherit", List.of())));
    given(endpointRepository.findEndpointReference(31L)).willReturn(Optional.of(
            new EndpointRepository.EndpointReference(31L, 21L, 1L)));
    given(endpointRepository.findEndpoint(31L)).willReturn(Optional.of(
            new EndpointDetail(31L, 21L, "Get User", "GET", "/users/31", "Load user", false)));

    assertThatThrownBy(() -> debugService.execute(new ExecuteDebugRequest(41L, 31L, "", List.of(), "")))
            .isInstanceOf(DebugSecurityException.class)
            .extracting(error -> ((DebugSecurityException) error).getErrorCode())
            .isEqualTo("DEBUG_PRIVATE_TARGET_NOT_ALLOWED");
}
```

- [ ] **Step 2: 运行测试，确认当前 `DebugService` 还没有任何策略判定逻辑**

Run: `Set-Location services/apihub-server; .\gradlew.bat test --tests com.apihub.debug.service.DebugServiceTest --no-daemon`
Expected: FAIL，提示未抛出 `DebugSecurityException`。

- [ ] **Step 3: 引入全局安全配置、调试错误 DTO、目标校验流程和响应体限制**

```java
@ConfigurationProperties(prefix = "apihub.debug.security")
public record DebugSecurityProperties(
        long connectTimeoutMs,
        long readTimeoutMs,
        int maxResponseBodyBytes,
        List<AllowRule> globalAllowlist
) {
    public record AllowRule(String pattern, boolean allowPrivate) {
    }
}
```

```java
public record DebugExecutionErrorDetail(
        String errorCode,
        String host,
        List<String> matchedPatterns
) {
}
```

```java
List<DebugTargetRuleEntry> effectiveRules = debugTargetPolicyResolver.resolveEffectiveRules(
        debugSecurityProperties.globalAllowlist().stream()
                .map(rule -> new DebugTargetRuleEntry(rule.pattern(), rule.allowPrivate()))
                .toList(),
        project.debugAllowedHosts(),
        environment.debugHostMode(),
        environment.debugAllowedHosts());

DebugTargetMatcher.MatchResult match = debugTargetMatcher.match(targetUri.getHost(), effectiveRules);
if (!match.matched()) {
    throw DebugSecurityException.forbidden(
            "DEBUG_TARGET_NOT_ALLOWED",
            "目标主机 " + targetUri.getHost() + " 未在调试白名单中",
            targetUri.getHost(),
            List.of());
}
if (match.privateTarget() && !match.allowPrivate()) {
    throw DebugSecurityException.forbidden(
            "DEBUG_PRIVATE_TARGET_NOT_ALLOWED",
            "目标主机 " + targetUri.getHost() + " 命中私网限制，需显式允许私网访问",
            targetUri.getHost(),
            match.matchedPatterns());
}
```

```java
HttpRequest httpRequest = builder.method(request.method(), bodyPublisher).build();
HttpResponse<InputStream> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofInputStream());
byte[] responseBytes = response.body().readNBytes(maxResponseBodyBytes + 1);
if (responseBytes.length > maxResponseBodyBytes) {
    throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Debug response exceeded configured size limit");
}
String responseBody = new String(responseBytes, StandardCharsets.UTF_8);
```

- [ ] **Step 4: 分别重跑服务层和执行器测试，确认 400/403 与 502 的边界正确**

Run: `Set-Location services/apihub-server; .\gradlew.bat test --tests com.apihub.debug.service.DebugServiceTest --tests com.apihub.debug.service.JdkDebugHttpExecutorTest --no-daemon`
Expected: PASS

- [ ] **Step 5: 提交本任务**

```bash
git add services/apihub-server/src/main/java/com/apihub/debug/config/DebugSecurityProperties.java services/apihub-server/src/main/java/com/apihub/debug/model/DebugDtos.java services/apihub-server/src/main/java/com/apihub/debug/service/DebugService.java services/apihub-server/src/main/java/com/apihub/debug/service/JdkDebugHttpExecutor.java services/apihub-server/src/main/resources/application.yml services/apihub-server/src/test/java/com/apihub/debug/service/DebugServiceTest.java services/apihub-server/src/test/java/com/apihub/debug/service/JdkDebugHttpExecutorTest.java
git commit -m "feat: enforce debug target security checks"
```

### Task 4: 为调试接口补充结构化错误响应

**Files:**
- Create: `services/apihub-server/src/main/java/com/apihub/debug/web/DebugControllerAdvice.java`
- Modify: `services/apihub-server/src/test/java/com/apihub/debug/web/DebugControllerTest.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/debug/service/DebugSecurityException.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/debug/model/DebugDtos.java`

- [ ] **Step 1: 先写失败测试，固定 `400/403` 错误响应体必须包含 `message` 和 `data.errorCode`**

```java
@Test
void shouldReturnStructuredPolicyError() throws Exception {
    given(debugService.execute(any())).willThrow(DebugSecurityException.forbidden(
            "DEBUG_TARGET_NOT_ALLOWED",
            "目标主机 blocked.example.com 未在调试白名单中",
            "blocked.example.com",
            List.of()));

    mockMvc.perform(post("/api/v1/debug/execute")
                    .with(user("tester"))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                            {"environmentId":41,"endpointId":31,"queryString":"","headers":[],"body":""}
                            """))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("目标主机 blocked.example.com 未在调试白名单中"))
            .andExpect(jsonPath("$.data.errorCode").value("DEBUG_TARGET_NOT_ALLOWED"))
            .andExpect(jsonPath("$.data.host").value("blocked.example.com"));
}
```

- [ ] **Step 2: 运行 WebMvc 测试，确认现在还没有统一的调试异常映射**

Run: `Set-Location services/apihub-server; .\gradlew.bat test --tests com.apihub.debug.web.DebugControllerTest --no-daemon`
Expected: FAIL，提示响应体结构不是预期的 `ApiResponse` 包装。

- [ ] **Step 3: 新增 `DebugControllerAdvice`，把调试安全异常统一映射到 `ApiResponse<DebugExecutionErrorDetail>`**

```java
@RestControllerAdvice(assignableTypes = DebugController.class)
public class DebugControllerAdvice {

    @ExceptionHandler(DebugSecurityException.class)
    public ResponseEntity<ApiResponse<DebugExecutionErrorDetail>> handleDebugSecurity(DebugSecurityException exception) {
        return ResponseEntity.status(exception.getStatus())
                .body(new ApiResponse<>(
                        exception.getBusinessCode(),
                        exception.getReason(),
                        new DebugExecutionErrorDetail(
                                exception.getErrorCode(),
                                exception.getHost(),
                                exception.getMatchedPatterns())));
    }
}
```

- [ ] **Step 4: 重跑控制器测试，确认调试阻断可以稳定返回结构化错误**

Run: `Set-Location services/apihub-server; .\gradlew.bat test --tests com.apihub.debug.web.DebugControllerTest --no-daemon`
Expected: PASS

- [ ] **Step 5: 提交本任务**

```bash
git add services/apihub-server/src/main/java/com/apihub/debug/web/DebugControllerAdvice.java services/apihub-server/src/main/java/com/apihub/debug/service/DebugSecurityException.java services/apihub-server/src/main/java/com/apihub/debug/model/DebugDtos.java services/apihub-server/src/test/java/com/apihub/debug/web/DebugControllerTest.java
git commit -m "feat: return structured debug security errors"
```

### Task 5: 扩展 SDK 与项目工作台状态，让前端拿到并保存安全策略

**Files:**
- Modify: `packages/api-sdk/src/client.ts`
- Modify: `packages/api-sdk/src/modules/projects.ts`
- Modify: `apps/web/src/features/projects/components/project-shell.tsx`
- Modify: `apps/web/src/features/projects/components/project-shell.test.tsx`

- [ ] **Step 1: 先写失败测试，固定项目详情加载、项目策略保存和 `ApiRequestError` 承载 `errorCode` 的行为**

```tsx
it("loads project detail and saves project debug policy", async () => {
  fetchProject.mockResolvedValueOnce({
    data: {
      id: 1,
      name: "Default Project",
      projectKey: "default",
      description: "Seed project",
      debugAllowedHosts: [{ pattern: "*.corp.example.com", allowPrivate: false }]
    }
  });
  updateProject.mockResolvedValueOnce({
    data: {
      id: 1,
      name: "Default Project",
      projectKey: "default",
      description: "Seed project",
      debugAllowedHosts: [{ pattern: "10.10.1.8", allowPrivate: true }]
    }
  });

  render(<ProjectShell projectId={1} />);

  expect(await screen.findByDisplayValue("*.corp.example.com")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Project debug rule 1 pattern"), { target: { value: "10.10.1.8" } });
  fireEvent.click(screen.getByLabelText("Project debug rule 1 allow private"));
  fireEvent.click(screen.getByRole("button", { name: "Save project debug policy" }));

  await waitFor(() =>
    expect(updateProject).toHaveBeenCalledWith(1, {
      name: "Default Project",
      description: "Seed project",
      debugAllowedHosts: [{ pattern: "10.10.1.8", allowPrivate: true }]
    })
  );
});
```

- [ ] **Step 2: 运行前端测试，确认目前既没有项目详情状态，也没有错误详情透传**

Run: `pnpm --filter web test -- src/features/projects/components/project-shell.test.tsx`
Expected: FAIL，提示 `fetchProject` / `updateProject` 未接入，或页面上不存在项目级策略编辑器。

- [ ] **Step 3: 修改 SDK 和 `ProjectShell`，把项目级调试策略纳入前端状态管理**

```ts
export class ApiRequestError extends Error {
  readonly status: number;
  readonly errorCode?: string;
  readonly data?: unknown;

  constructor(status: number, message: string, errorCode?: string, data?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.errorCode = errorCode;
    this.data = data;
  }
}
```

```ts
export type DebugTargetRule = {
  pattern: string;
  allowPrivate: boolean;
};

export type ProjectDetail = {
  id: number;
  name: string;
  projectKey: string;
  description: string | null;
  debugAllowedHosts: DebugTargetRule[];
};

export function fetchProject(projectId: number) {
  return apiFetch<ProjectDetail>(`/api/v1/projects/${projectId}`);
}

export function updateProject(projectId: number, payload: UpdateProjectPayload) {
  return apiFetch<ProjectDetail>(`/api/v1/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}
```

```tsx
const [project, setProject] = useState<ProjectDetail | null>(null);

useEffect(() => {
  void fetchProject(projectId).then((response) => setProject(response.data));
}, [projectId]);

async function handleUpdateProjectPolicy(debugAllowedHosts: DebugTargetRule[]) {
  if (!project) {
    return;
  }
  const response = await updateProject(projectId, {
    name: project.name,
    description: project.description ?? "",
    debugAllowedHosts
  });
  setProject(response.data);
}
```

- [ ] **Step 4: 重跑前端测试，确认页面现在能拉取和保存项目级调试策略**

Run: `pnpm --filter web test -- src/features/projects/components/project-shell.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交本任务**

```bash
git add packages/api-sdk/src/client.ts packages/api-sdk/src/modules/projects.ts apps/web/src/features/projects/components/project-shell.tsx apps/web/src/features/projects/components/project-shell.test.tsx
git commit -m "feat: wire debug policy state into project shell"
```

### Task 6: 补齐项目/环境策略编辑器和调试阻断提示

**Files:**
- Create: `apps/web/src/features/projects/components/debug-target-rule-editor.tsx`
- Modify: `apps/web/src/features/projects/components/environment-panel.tsx`
- Modify: `apps/web/src/features/projects/components/debug-console.tsx`
- Create: `apps/web/src/features/projects/components/environment-panel.test.tsx`
- Create: `apps/web/src/features/projects/components/debug-console.test.tsx`
- Modify: `apps/web/src/features/projects/components/project-shell.tsx`
- Modify: `apps/web/src/features/projects/components/project-shell.test.tsx`

- [ ] **Step 1: 先写失败测试，固定项目规则编辑、环境 mode 切换和策略阻断提示**

```tsx
it("submits environment debug host mode and host rules", async () => {
  const onUpdateEnvironment = vi.fn().mockResolvedValue(undefined);

  render(
    <EnvironmentPanel
      environments={[{
        id: 41,
        projectId: 1,
        name: "Local",
        baseUrl: "https://local.dev",
        isDefault: true,
        variables: [],
        defaultHeaders: [],
        defaultQuery: [],
        authMode: "none",
        authKey: "",
        authValue: "",
        debugHostMode: "inherit",
        debugAllowedHosts: []
      }]}
      projectDebugAllowedHosts={[]}
      onUpdateEnvironment={onUpdateEnvironment}
      onUpdateProjectDebugPolicy={vi.fn()}
      onCreateEnvironment={vi.fn()}
      onDeleteEnvironment={vi.fn()}
      onSelectEnvironment={vi.fn()}
      selectedEnvironmentId={41}
    />
  );

  fireEvent.change(screen.getByLabelText("Environment 41 debug host mode"), { target: { value: "append" } });
  fireEvent.change(screen.getByLabelText("Environment 41 debug rule 1 pattern"), { target: { value: "10.10.1.8" } });
  fireEvent.click(screen.getByLabelText("Environment 41 debug rule 1 allow private"));
  fireEvent.click(screen.getByRole("button", { name: "Save environment 41" }));

  await waitFor(() =>
    expect(onUpdateEnvironment).toHaveBeenCalledWith(41, expect.objectContaining({
      debugHostMode: "append",
      debugAllowedHosts: [{ pattern: "10.10.1.8", allowPrivate: true }]
    }))
  );
});
```

```tsx
it("shows policy blocked alert with message and errorCode", async () => {
  const blockedError = new ApiRequestError(
    403,
    "目标主机 blocked.example.com 未在调试白名单中",
    "DEBUG_TARGET_NOT_ALLOWED",
    { errorCode: "DEBUG_TARGET_NOT_ALLOWED", host: "blocked.example.com" }
  );

  const onExecute = vi.fn().mockRejectedValue(blockedError);

  render(
    <DebugConsole
      endpoint={{ id: 31, groupId: 21, name: "Get User", method: "GET", path: "/users/{id}", description: "", mockEnabled: false }}
      environment={{ id: 41, projectId: 1, name: "Local", baseUrl: "https://local.dev", isDefault: true, variables: [], defaultHeaders: [], defaultQuery: [], authMode: "none", authKey: "", authValue: "", debugHostMode: "inherit", debugAllowedHosts: [] }}
      history={[]}
      isLoadingHistory={false}
      onExecute={onExecute}
      onReplayHistory={vi.fn()}
      onRunHistory={vi.fn()}
      replayDraft={null}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: "Send request" }));

  expect(await screen.findByText("DEBUG_TARGET_NOT_ALLOWED")).toBeInTheDocument();
  expect(screen.getByText("目标主机 blocked.example.com 未在调试白名单中")).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行组件测试，确认当前 UI 还没有显式规则编辑器和阻断提示卡**

Run: `pnpm --filter web test -- src/features/projects/components/environment-panel.test.tsx src/features/projects/components/debug-console.test.tsx src/features/projects/components/project-shell.test.tsx`
Expected: FAIL，提示组件 props、输入框或阻断文案不存在。

- [ ] **Step 3: 实现共享规则编辑器、环境面板策略 UI 和调试阻断展示**

```tsx
export function DebugTargetRuleEditor({
  labelPrefix,
  rules,
  disabled = false,
  onChange
}: {
  labelPrefix: string;
  rules: DebugTargetRule[];
  disabled?: boolean;
  onChange: (rules: DebugTargetRule[]) => void;
}) {
  const safeRules = rules.length > 0 ? rules : [{ pattern: "", allowPrivate: false }];
  return (
    <div className="space-y-3">
      {safeRules.map((rule, index) => (
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <input
            aria-label={`${labelPrefix} debug rule ${index + 1} pattern`}
            disabled={disabled}
            value={rule.pattern}
            onChange={(event) => onChange(updateRule(safeRules, index, { ...rule, pattern: event.target.value }))}
          />
          <label>
            <input
              aria-label={`${labelPrefix} debug rule ${index + 1} allow private`}
              checked={rule.allowPrivate}
              disabled={disabled}
              onChange={(event) => onChange(updateRule(safeRules, index, { ...rule, allowPrivate: event.target.checked }))}
              type="checkbox"
            />
            Allow private
          </label>
        </div>
      ))}
    </div>
  );
}
```

```tsx
{policyError ? (
  <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
    <p className="font-semibold">Request blocked by debug policy</p>
    <p className="mt-1">{policyError.message}</p>
    <p className="mt-2 font-mono text-xs">{policyError.errorCode}</p>
  </div>
) : error ? (
  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
) : null}
```

```tsx
<EnvironmentPanel
  environments={environments}
  projectDebugAllowedHosts={project?.debugAllowedHosts ?? []}
  onUpdateProjectDebugPolicy={handleUpdateProjectPolicy}
  onCreateEnvironment={handleCreateEnvironment}
  onDeleteEnvironment={handleDeleteEnvironment}
  onSelectEnvironment={setSelectedEnvironmentId}
  onUpdateEnvironment={handleUpdateEnvironment}
  selectedEnvironmentId={selectedEnvironmentId}
/>
```

- [ ] **Step 4: 重跑前端测试和构建，确认策略编辑与阻断提示闭环成立**

Run: `pnpm --filter web test -- src/features/projects/components/environment-panel.test.tsx src/features/projects/components/debug-console.test.tsx src/features/projects/components/project-shell.test.tsx`
Expected: PASS

Run: `pnpm --filter web build`
Expected: PASS

- [ ] **Step 5: 提交本任务**

```bash
git add apps/web/src/features/projects/components/debug-target-rule-editor.tsx apps/web/src/features/projects/components/environment-panel.tsx apps/web/src/features/projects/components/debug-console.tsx apps/web/src/features/projects/components/environment-panel.test.tsx apps/web/src/features/projects/components/debug-console.test.tsx apps/web/src/features/projects/components/project-shell.tsx apps/web/src/features/projects/components/project-shell.test.tsx
git commit -m "feat: add debug policy editors and blocked state ui"
```

### Task 7: 做最终回归验证并整理分支

**Files:**
- No new code expected unless verification 暴露缺口

- [ ] **Step 1: 运行后端目标测试集，确认持久化、策略判定、错误响应都稳定**

Run: `Set-Location services/apihub-server; .\gradlew.bat test --tests com.apihub.project.service.ProjectServiceTest --tests com.apihub.debug.service.DebugServiceTest --tests com.apihub.debug.service.JdkDebugHttpExecutorTest --tests com.apihub.debug.web.DebugControllerTest --no-daemon`
Expected: PASS

- [ ] **Step 2: 运行前端目标测试集，确认工作台和调试台都稳定**

Run: `pnpm --filter web test -- src/features/projects/components/environment-panel.test.tsx src/features/projects/components/debug-console.test.tsx src/features/projects/components/project-shell.test.tsx`
Expected: PASS

- [ ] **Step 3: 运行前端构建，确认类型和生产构建没有回归**

Run: `pnpm --filter web build`
Expected: PASS

- [ ] **Step 4: 检查 git 状态，只保留本功能相关文件**

Run: `git status --short`
Expected: 只看到本 feature 的改动；如果出现无关文件，不要回滚用户已有改动，只在提交时精确 `git add` 本功能文件。

- [ ] **Step 5: 提交最终整合结果**

```bash
git add infra/mysql/001_phase1_schema.sql infra/mysql/002_phase1_seed.sql services/apihub-server/src/main services/apihub-server/src/test packages/api-sdk/src/client.ts packages/api-sdk/src/modules/projects.ts apps/web/src/features/projects/components
git commit -m "feat: harden debug execution target security"
```
