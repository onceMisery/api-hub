# Debug Request Body Limit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce a configurable maximum debug request body size before outbound execution so oversized debug payloads are rejected locally with a clear `413` response.

**Architecture:** Keep the existing debug timeout, allowlist, private-network, and response-size protections unchanged. Add one new `maxRequestBodyBytes` property to `DebugSecurityProperties`, validate the substituted request body in `DebugService` before calling `DebugHttpExecutor`, and cover the new failure mode through service and controller tests.

**Tech Stack:** `Spring Boot 3.2`, `Java 21`, `Maven`, `Mockito`, `MockMvc`

---

### Task 1: Add a configurable request-body limit and enforce it in `DebugService`

**Files:**
- Modify: `services/apihub-server/src/main/java/com/apihub/debug/config/DebugSecurityProperties.java`
- Modify: `services/apihub-server/src/main/resources/application.yml`
- Modify: `services/apihub-server/src/main/java/com/apihub/debug/service/DebugService.java`
- Modify: `services/apihub-server/src/test/java/com/apihub/debug/service/DebugServiceTest.java`

- [ ] **Step 1: Write the failing service test for oversized debug request bodies**

```java
@Test
void shouldRejectDebugRequestBodyExceedingConfiguredLimit() {
    DebugSecurityProperties debugSecurityProperties = new DebugSecurityProperties();
    debugSecurityProperties.setMaxRequestBodyBytes(4);
    debugSecurityProperties.setGlobalAllowlist(List.of(
            new DebugSecurityProperties.AllowRule("local.dev", false)));
    debugService = new DebugService(
            projectRepository,
            endpointRepository,
            debugHttpExecutor,
            debugHistoryRepository,
            new DebugTargetPolicyResolver(),
            new DebugTargetMatcher(),
            debugSecurityProperties);
    lenient().when(projectRepository.canAccessProject(1L, 1L)).thenReturn(true);

    given(projectRepository.findProject(1L)).willReturn(Optional.of(
            new ProjectDetail(1L, "Default", "default", "Seed", List.of())));
    given(projectRepository.findEnvironment(41L)).willReturn(Optional.of(
            new EnvironmentDetail(41L, 1L, "Local", "https://local.dev/api", true,
                    List.of(), List.of(), List.of(), "none", "", "", "inherit", List.of())));
    given(endpointRepository.findEndpointReference(31L)).willReturn(Optional.of(
            new EndpointRepository.EndpointReference(31L, 21L, 1L)));
    given(endpointRepository.findEndpoint(31L)).willReturn(Optional.of(
            new EndpointDetail(31L, 21L, "Create User", "POST", "/users", "Create", false)));

    assertThatThrownBy(() -> debugService.execute(new ExecuteDebugRequest(
            41L,
            31L,
            "",
            List.of(),
            "{\"name\":\"alice\"}")))
            .isInstanceOf(ResponseStatusException.class)
            .extracting(error -> ((ResponseStatusException) error).getStatusCode())
            .isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);

    verify(debugHttpExecutor, never()).execute(any());
    verify(debugHistoryRepository, never()).saveHistory(anyLong(), anyLong(), anyLong(), anyString(), anyString(), anyList(), anyString(), anyInt(), anyList(), anyString(), anyLong());
}
```

- [ ] **Step 2: Run the focused service test and confirm it fails because request-size validation does not exist yet**

Run: `Set-Location services/apihub-server; $env:JAVA_HOME='D:\dev-tool\java\openjdk-21\jdk-21.0.2'; mvn test '-Dtest=DebugServiceTest#shouldRejectDebugRequestBodyExceedingConfiguredLimit'`

Expected: FAIL because the current implementation still forwards oversized request bodies to `debugHttpExecutor`.

- [ ] **Step 3: Add the new config property and the smallest possible service-side byte-length validation**

```java
private int maxRequestBodyBytes = 65536;

public int getMaxRequestBodyBytes() {
    return maxRequestBodyBytes;
}

public void setMaxRequestBodyBytes(int maxRequestBodyBytes) {
    this.maxRequestBodyBytes = maxRequestBodyBytes;
}
```

```yaml
apihub:
  debug:
    security:
      connect-timeout-ms: 5000
      read-timeout-ms: 10000
      max-request-body-bytes: 65536
      max-response-body-bytes: 262144
```

```java
String requestBody = substituteVariables(request.body(), variables);
requireRequestBodyWithinLimit(requestBody);

private void requireRequestBodyWithinLimit(String requestBody) {
    byte[] bodyBytes = requestBody == null ? new byte[0] : requestBody.getBytes(StandardCharsets.UTF_8);
    if (bodyBytes.length > debugSecurityProperties.getMaxRequestBodyBytes()) {
        throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Debug request body exceeded configured size limit");
    }
}
```

- [ ] **Step 4: Re-run the focused service test and confirm it passes**

Run: `Set-Location services/apihub-server; $env:JAVA_HOME='D:\dev-tool\java\openjdk-21\jdk-21.0.2'; mvn test '-Dtest=DebugServiceTest#shouldRejectDebugRequestBodyExceedingConfiguredLimit'`

Expected: PASS

- [ ] **Step 5: Commit Task 1**

```bash
git add services/apihub-server/src/main/java/com/apihub/debug/config/DebugSecurityProperties.java services/apihub-server/src/main/resources/application.yml services/apihub-server/src/main/java/com/apihub/debug/service/DebugService.java services/apihub-server/src/test/java/com/apihub/debug/service/DebugServiceTest.java
git commit -m "feat: limit debug request body size"
```

### Task 2: Lock the HTTP contract so oversized payloads surface as `413` from the debug API

**Files:**
- Modify: `services/apihub-server/src/test/java/com/apihub/debug/web/DebugControllerTest.java`

- [ ] **Step 1: Write the failing controller test for the `413` response**

```java
@Test
void shouldReturnPayloadTooLargeWhenDebugBodyExceedsLimit() throws Exception {
    given(debugService.execute(eq(1L), any()))
            .willThrow(new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Debug request body exceeded configured size limit"));

    mockMvc.perform(post("/api/v1/debug/execute")
                    .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of())))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                            {
                              "environmentId": 41,
                              "endpointId": 31,
                              "queryString": "",
                              "headers": [],
                              "body": "{\"payload\":\"too-large\"}"
                            }
                            """))
            .andExpect(status().isPayloadTooLarge())
            .andExpect(jsonPath("$.message").value("Debug request body exceeded configured size limit"));
}
```

- [ ] **Step 2: Run the focused controller test and confirm the current API contract does not yet cover this case**

Run: `Set-Location services/apihub-server; $env:JAVA_HOME='D:\dev-tool\java\openjdk-21\jdk-21.0.2'; mvn test '-Dtest=DebugControllerTest#shouldReturnPayloadTooLargeWhenDebugBodyExceedsLimit'`

Expected: FAIL if the test does not exist yet, then PASS once the controller test is added because `ResponseStatusException` already maps to the standard error envelope.

- [ ] **Step 3: Keep the controller layer unchanged unless the focused test shows the status/message contract is broken**

```java
// No production code expected for this task.
// The test exists to lock the 413 contract around the existing controller/advice stack.
```

- [ ] **Step 4: Re-run the focused controller test and confirm it passes**

Run: `Set-Location services/apihub-server; $env:JAVA_HOME='D:\dev-tool\java\openjdk-21\jdk-21.0.2'; mvn test '-Dtest=DebugControllerTest#shouldReturnPayloadTooLargeWhenDebugBodyExceedsLimit'`

Expected: PASS

- [ ] **Step 5: Commit Task 2**

```bash
git add services/apihub-server/src/test/java/com/apihub/debug/web/DebugControllerTest.java
git commit -m "test: cover oversized debug request payloads"
```

### Task 3: Run the minimal regression set and finish the worktree cleanly

**Files:**
- Modify: `docs/superpowers/plans/2026-04-11-debug-request-body-limit.md`

- [ ] **Step 1: Run the targeted debug regression suite**

Run: `Set-Location services/apihub-server; $env:JAVA_HOME='D:\dev-tool\java\openjdk-21\jdk-21.0.2'; mvn test '-Dtest=DebugServiceTest,JdkDebugHttpExecutorTest,DebugControllerTest,DebugHistoryControllerTest'`

Expected: PASS

- [ ] **Step 2: Check git status and confirm only request-limit changes are present**

Run: `git status --short`

Expected: only the debug request-limit files and this plan file are modified in the worktree.

- [ ] **Step 3: Commit the final integrated change**

```bash
git add docs/superpowers/plans/2026-04-11-debug-request-body-limit.md services/apihub-server/src/main/java/com/apihub/debug/config/DebugSecurityProperties.java services/apihub-server/src/main/resources/application.yml services/apihub-server/src/main/java/com/apihub/debug/service/DebugService.java services/apihub-server/src/test/java/com/apihub/debug/service/DebugServiceTest.java services/apihub-server/src/test/java/com/apihub/debug/web/DebugControllerTest.java
git commit -m "feat: enforce debug request body limits"
```

## Self-Review

### Spec coverage
- 可配置的调试请求体大小限制：Task 1
- 超限时在本地拒绝而不是继续发出外部请求：Task 1
- `413` Web 合约回归：Task 2
- 最小 debug 相关回归验证：Task 3

### Placeholder scan
- 所有任务都给出了明确文件、命令、预期结果和关键代码片段
- 没有 `TODO` / `TBD` / “类似 Task N” 之类占位描述

### Type consistency
- 配置属性统一命名为 `maxRequestBodyBytes`
- 服务层统一抛出 `HttpStatus.PAYLOAD_TOO_LARGE`
- 本计划不改动 SDK payload 结构，也不改动 controller 方法签名
