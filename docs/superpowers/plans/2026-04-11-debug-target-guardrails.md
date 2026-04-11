# Debug Target Guardrails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close debug execution bypasses by validating resolved target IPs and every redirect hop against the existing allowlist/private-network policy.

**Architecture:** Keep policy decisions in `DebugService`, where project/environment policy is already assembled. Change the HTTP executor to perform single-hop requests only, then let `DebugService` follow redirects explicitly, re-validating each target before the next hop. Reuse the existing matcher for host-pattern checks, but extend it with resolved-address inspection so DNS rebinding style targets cannot tunnel into private networks.

**Tech Stack:** `Spring Boot 3.2`, `Java 21`, `Maven`, `JUnit 5`, `Mockito`

---

### Task 1: Add failing tests for resolved-address and redirect enforcement

**Files:**
- Modify: `services/apihub-server/src/test/java/com/apihub/debug/service/DebugServiceTest.java`
- Modify: `services/apihub-server/src/test/java/com/apihub/debug/service/JdkDebugHttpExecutorTest.java`

- [ ] **Step 1: Add a failing service test for allowlisted hostnames that resolve to private IPs**

```java
@Test
void shouldRejectAllowlistedHostnameWhenResolvedAddressIsPrivate() {
    given(projectRepository.findProject(1L)).willReturn(Optional.of(
            new ProjectDetail(1L, "Default", "default", "Seed", List.of(new DebugTargetRuleEntry("partner.example.com", false)))));
    given(projectRepository.findEnvironment(41L)).willReturn(Optional.of(
            new EnvironmentDetail(41L, 1L, "Local", "https://partner.example.com/api", true,
                    List.of(), List.of(), List.of(), "none", "", "", "inherit", List.of())));
    given(endpointRepository.findEndpointReference(31L)).willReturn(Optional.of(
            new EndpointRepository.EndpointReference(31L, 21L, 1L)));
    given(endpointRepository.findEndpoint(31L)).willReturn(Optional.of(
            new EndpointDetail(31L, 21L, "Get User", "GET", "/users/31", "Load user", false)));

    debugService = new DebugService(
            projectRepository,
            endpointRepository,
            debugHttpExecutor,
            debugHistoryRepository,
            new DebugTargetPolicyResolver(),
            new DebugTargetMatcher(),
            debugSecurityProperties,
            host -> List.of(InetAddress.getByAddress("partner.example.com", new byte[]{10, 0, 0, 8})));

    assertThatThrownBy(() -> debugService.execute(new ExecuteDebugRequest(41L, 31L, "", List.of(), "")))
            .isInstanceOf(DebugSecurityException.class)
            .extracting(error -> ((DebugSecurityException) error).getErrorCode())
            .isEqualTo("DEBUG_PRIVATE_TARGET_NOT_ALLOWED");
}
```

- [ ] **Step 2: Add a failing service test for redirect hops that leave the allowlist**

```java
@Test
void shouldRejectRedirectTargetOutsideAllowlist() {
    given(projectRepository.findProject(1L)).willReturn(Optional.of(
            new ProjectDetail(1L, "Default", "default", "Seed", List.of(new DebugTargetRuleEntry("gateway.example.com", false)))));
    given(projectRepository.findEnvironment(41L)).willReturn(Optional.of(
            new EnvironmentDetail(41L, 1L, "Local", "https://gateway.example.com/api", true,
                    List.of(), List.of(), List.of(), "inherit", "", "", "inherit", List.of())));
    given(endpointRepository.findEndpointReference(31L)).willReturn(Optional.of(
            new EndpointRepository.EndpointReference(31L, 21L, 1L)));
    given(endpointRepository.findEndpoint(31L)).willReturn(Optional.of(
            new EndpointDetail(31L, 21L, "Get User", "GET", "/users/31", "Load user", false)));
    given(debugHttpExecutor.execute(any())).willReturn(new DebugHttpResult(
            302,
            List.of(new DebugHeader("location", "https://blocked.example.com/users/31")),
            "",
            15));

    assertThatThrownBy(() -> debugService.execute(new ExecuteDebugRequest(41L, 31L, "", List.of(), "")))
            .isInstanceOf(DebugSecurityException.class)
            .extracting(error -> ((DebugSecurityException) error).getErrorCode())
            .isEqualTo("DEBUG_TARGET_NOT_ALLOWED");
}
```

- [ ] **Step 3: Add a failing executor test that proves redirects are no longer auto-followed by `HttpClient`**

```java
@Test
void shouldDisableAutomaticRedirectFollowing() {
    DebugSecurityProperties properties = new DebugSecurityProperties();
    HttpClient redirectNeverClient = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();

    JdkDebugHttpExecutor executor = new JdkDebugHttpExecutor(redirectNeverClient, properties);

    assertThat(executor.isFollowingRedirects()).isFalse();
}
```
```

- [ ] **Step 4: Run the focused backend tests and confirm failures**

Run: `mvnw.cmd -q -Dtest=DebugServiceTest,JdkDebugHttpExecutorTest test`

Expected: FAIL because resolved-address policy and redirect revalidation are not implemented yet.

### Task 2: Add resolved-address inspection to the debug policy layer

**Files:**
- Modify: `services/apihub-server/src/main/java/com/apihub/debug/service/DebugTargetMatcher.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/debug/service/DebugService.java`
- Test: `services/apihub-server/src/test/java/com/apihub/debug/service/DebugServiceTest.java`

- [ ] **Step 1: Extend the matcher with resolved-address classification**

```java
public record ResolvedTarget(
        boolean privateAddress,
        List<String> resolvedAddresses
) {
}

public ResolvedTarget inspectResolvedAddresses(List<InetAddress> addresses) {
    List<String> resolved = addresses.stream()
            .map(InetAddress::getHostAddress)
            .toList();
    boolean hasPrivateAddress = addresses.stream().anyMatch(this::isPrivateAddress);
    return new ResolvedTarget(hasPrivateAddress, resolved);
}
```

- [ ] **Step 2: Inject a host resolver into `DebugService` so tests can control DNS outcomes**

```java
private final Function<String, List<InetAddress>> hostResolver;

public DebugService(..., DebugSecurityProperties debugSecurityProperties) {
    this(..., debugSecurityProperties, host -> Arrays.asList(InetAddress.getAllByName(host)));
}
```

- [ ] **Step 3: Enforce resolved-address policy after pattern matching**

```java
List<InetAddress> addresses = hostResolver.apply(targetUri.getHost());
DebugTargetMatcher.ResolvedTarget resolvedTarget = debugTargetMatcher.inspectResolvedAddresses(addresses);
if (resolvedTarget.privateAddress() && !matchResult.allowPrivate()) {
    throw DebugSecurityException.forbidden(
            "DEBUG_PRIVATE_TARGET_NOT_ALLOWED",
            "Resolved target address entered a private network range",
            targetUri.getHost(),
            matchResult.matchedPatterns());
}
```

- [ ] **Step 4: Re-run the focused backend tests**

Run: `mvnw.cmd -q -Dtest=DebugServiceTest test`

Expected: still FAIL, but only on redirect handling.

### Task 3: Move redirect following into `DebugService` and re-check every hop

**Files:**
- Modify: `services/apihub-server/src/main/java/com/apihub/debug/config/DebugSecurityProperties.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/debug/service/DebugService.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/debug/service/JdkDebugHttpExecutor.java`
- Test: `services/apihub-server/src/test/java/com/apihub/debug/service/DebugServiceTest.java`
- Test: `services/apihub-server/src/test/java/com/apihub/debug/service/JdkDebugHttpExecutorTest.java`

- [ ] **Step 1: Add a configurable redirect limit**

```java
private int maxRedirects = 5;

public int getMaxRedirects() {
    return maxRedirects;
}

public void setMaxRedirects(int maxRedirects) {
    this.maxRedirects = maxRedirects;
}
```

- [ ] **Step 2: Disable automatic redirect following in the JDK executor**

```java
this(HttpClient.newBuilder()
        .connectTimeout(Duration.ofMillis(debugSecurityProperties.getConnectTimeoutMs()))
        .followRedirects(HttpClient.Redirect.NEVER)
        .build(),
        debugSecurityProperties);
```

- [ ] **Step 3: Add explicit redirect handling in `DebugService`**

```java
DebugHttpResult result = debugHttpExecutor.execute(request);
URI finalUri = targetUri;
int redirects = 0;

while (isRedirect(result.statusCode())) {
    if (redirects >= debugSecurityProperties.getMaxRedirects()) {
        throw DebugSecurityException.badRequest("DEBUG_REDIRECT_LIMIT_EXCEEDED", "Debug redirect limit exceeded");
    }
    URI redirectUri = resolveRedirectUri(finalUri, result.headers());
    enforceTargetPolicy(project, environment, redirectUri);
    result = debugHttpExecutor.execute(new DebugHttpRequest(endpoint.method(), redirectUri, headers, requestBody));
    finalUri = redirectUri;
    redirects++;
}
```

- [ ] **Step 4: Persist the final redirected URL instead of the first-hop URL**

```java
debugHistoryRepository.saveHistory(
        ...,
        finalUri.toString(),
        ...);

return new ExecuteDebugResponse(
        endpoint.method(),
        finalUri.toString(),
        ...
);
```

- [ ] **Step 5: Re-run the focused backend tests**

Run: `mvnw.cmd -q -Dtest=DebugServiceTest,JdkDebugHttpExecutorTest test`

Expected: PASS

### Task 4: Full backend verification and commit

**Files:**
- Verify: `services/apihub-server/src/main/java/com/apihub/debug/service/DebugService.java`
- Verify: `services/apihub-server/src/main/java/com/apihub/debug/service/DebugTargetMatcher.java`
- Verify: `services/apihub-server/src/main/java/com/apihub/debug/service/JdkDebugHttpExecutor.java`
- Verify: `services/apihub-server/src/test/java/com/apihub/debug/service/DebugServiceTest.java`
- Verify: `services/apihub-server/src/test/java/com/apihub/debug/service/JdkDebugHttpExecutorTest.java`
- Modify: `docs/superpowers/plans/2026-04-11-debug-target-guardrails.md`

- [ ] **Step 1: Run the focused backend verification set**

Run: `mvnw.cmd -q -Dtest=DebugServiceTest,JdkDebugHttpExecutorTest test`

Expected: PASS

- [ ] **Step 2: Run the full backend test suite**

Run: `mvnw.cmd test`

Expected: PASS

- [ ] **Step 3: Commit the feature**

```bash
git add services/apihub-server/src/main/java/com/apihub/debug/config/DebugSecurityProperties.java services/apihub-server/src/main/java/com/apihub/debug/service/DebugService.java services/apihub-server/src/main/java/com/apihub/debug/service/DebugTargetMatcher.java services/apihub-server/src/main/java/com/apihub/debug/service/JdkDebugHttpExecutor.java services/apihub-server/src/test/java/com/apihub/debug/service/DebugServiceTest.java services/apihub-server/src/test/java/com/apihub/debug/service/JdkDebugHttpExecutorTest.java docs/superpowers/plans/2026-04-11-debug-target-guardrails.md
git commit -m "feat: harden debug target guardrails"
```
