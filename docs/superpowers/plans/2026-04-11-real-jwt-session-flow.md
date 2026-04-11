# Real JWT Session Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder `access-{userId}` / `refresh-{userId}` tokens with real JWT-based access and refresh flows, add `/refresh`, `/me`, and `/logout`, and make the web console auto-refresh expired access tokens while keeping the current localStorage-based session model.

**Architecture:** Keep the current stateless Bearer flow, but add a `token_version` column on `sys_user` so both access and refresh JWTs can be invalidated without introducing a new refresh-token table or any MySQL foreign keys. Backend authentication stays in Spring Security + `BearerAuthenticationFilter`; frontend keeps localStorage for this iteration, but `apiFetch()` becomes responsible for one-shot refresh and replay when a protected request returns `401`.

**Tech Stack:** `Spring Boot 3.2`, `Java 21`, `Maven`, `java-jwt`, `Spring Security`, `MySQL 8`, `H2`, `Next.js 15`, `React 19`, `TypeScript`, `Vitest`

---

### Task 1: Persist token version and replace placeholder tokens with real JWT claims

**Files:**
- Create: `services/apihub-server/src/main/java/com/apihub/auth/config/AuthTokenProperties.java`
- Create: `services/apihub-server/src/test/java/com/apihub/auth/service/JwtTokenServiceTest.java`
- Create: `services/apihub-server/src/test/java/com/apihub/auth/service/AuthServiceTest.java`
- Modify: `infra/mysql/001_phase1_schema.sql`
- Modify: `infra/mysql/002_phase1_seed.sql`
- Modify: `services/apihub-server/src/test/resources/project-service-schema.sql`
- Modify: `services/apihub-server/src/test/resources/project-service-data.sql`
- Modify: `services/apihub-server/src/main/resources/application.yml`
- Modify: `services/apihub-server/src/main/java/com/apihub/auth/repository/AuthUserRepository.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/auth/service/JwtTokenService.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/auth/service/AuthService.java`

- [ ] **Step 1: Write failing backend tests for JWT issuance, JWT parsing, and token-version invalidation**

```java
@Test
void shouldIssueSignedAccessAndRefreshTokensWithExpectedClaims() {
    LoginResponse response = jwtTokenService.issueTokens(1L, "admin", 3);

    JwtTokenService.AuthTokenClaims accessClaims = jwtTokenService.parseAccessToken(response.accessToken())
            .orElseThrow();
    JwtTokenService.AuthTokenClaims refreshClaims = jwtTokenService.parseRefreshToken(response.refreshToken())
            .orElseThrow();

    assertThat(accessClaims.userId()).isEqualTo(1L);
    assertThat(accessClaims.username()).isEqualTo("admin");
    assertThat(accessClaims.tokenVersion()).isEqualTo(3);
    assertThat(accessClaims.tokenType()).isEqualTo("access");
    assertThat(refreshClaims.tokenType()).isEqualTo("refresh");
}

@Test
void shouldRejectTokenWhenVersionDoesNotMatchCurrentUserVersion() {
    LoginResponse response = jwtTokenService.issueTokens(1L, "admin", 2);

    assertThat(jwtTokenService.parseAccessToken(response.accessToken(), 3)).isEmpty();
    assertThat(jwtTokenService.parseRefreshToken(response.refreshToken(), 3)).isEmpty();
}
```

```java
@Test
void shouldLoginWithRealJwtTokens() {
    given(authUserRepository.findActiveByUsername("admin"))
            .willReturn(Optional.of(new UserCredential(1L, "admin", PASSWORD_HASH, "active", 0)));

    LoginResponse response = authService.login(new LoginRequest("admin", "123456"));

    assertThat(response.accessToken()).contains(".");
    assertThat(response.refreshToken()).contains(".");
}
```

- [ ] **Step 2: Run the focused backend tests and confirm the current placeholder-token implementation fails**

Run: `Set-Location services/apihub-server; $env:JAVA_HOME='D:\dev-tool\java\openjdk-21\jdk-21.0.2'; mvn test "-Dtest=JwtTokenServiceTest,AuthServiceTest"`

Expected: FAIL because `JwtTokenService` still returns `access-{userId}` strings and `AuthUserRepository.UserCredential` does not yet expose `tokenVersion`.

- [ ] **Step 3: Add `token_version` persistence and real JWT signing/parsing**

```sql
alter table sys_user
  add column token_version int not null default 0;
```

```sql
INSERT INTO sys_user (
  id, username, display_name, email, password_hash, status, token_version
) VALUES (
  1, 'admin', 'Administrator', 'admin@apihub.local',
  '$2a$10$e0NRvZx7M4mY5g0n1cRkZeE8QjJ8q3YpP0oD7f2fX5B2q6gL2v2mK',
  'active',
  0
);
```

```java
@ConfigurationProperties(prefix = "apihub.auth.jwt")
public record AuthTokenProperties(
        String issuer,
        String secret,
        long accessExpiresSeconds,
        long refreshExpiresSeconds
) {
}
```

```java
public record UserCredential(Long id, String username, String passwordHash, String status, int tokenVersion) {
}

public Optional<UserCredential> findActiveById(Long userId) { ... }

public int incrementTokenVersion(Long userId) {
    jdbcTemplate.update("""
        update sys_user
        set token_version = token_version + 1
        where id = ?
        """, userId);
    return jdbcTemplate.queryForObject("select token_version from sys_user where id = ?", Integer.class, userId);
}
```

```java
public record AuthTokenClaims(Long userId, String username, int tokenVersion, String tokenType) {
}

public LoginResponse issueTokens(Long userId, String username, int tokenVersion) {
    return new LoginResponse(
            signToken(userId, username, tokenVersion, "access", authTokenProperties.accessExpiresSeconds()),
            signToken(userId, username, tokenVersion, "refresh", authTokenProperties.refreshExpiresSeconds()));
}
```

```yaml
apihub:
  auth:
    jwt:
      issuer: apihub
      secret: ${APIHUB_JWT_SECRET:dev-secret-change-me}
      access-expires-seconds: 900
      refresh-expires-seconds: 604800
```

- [ ] **Step 4: Re-run the focused backend tests and confirm real JWT issuance now passes**

Run: `Set-Location services/apihub-server; $env:JAVA_HOME='D:\dev-tool\java\openjdk-21\jdk-21.0.2'; mvn test "-Dtest=JwtTokenServiceTest,AuthServiceTest"`

Expected: PASS

- [ ] **Step 5: Commit Task 1**

```bash
git add infra/mysql/001_phase1_schema.sql infra/mysql/002_phase1_seed.sql services/apihub-server/src/test/resources/project-service-schema.sql services/apihub-server/src/test/resources/project-service-data.sql services/apihub-server/src/main/resources/application.yml services/apihub-server/src/main/java/com/apihub/auth/config/AuthTokenProperties.java services/apihub-server/src/main/java/com/apihub/auth/repository/AuthUserRepository.java services/apihub-server/src/main/java/com/apihub/auth/service/JwtTokenService.java services/apihub-server/src/main/java/com/apihub/auth/service/AuthService.java services/apihub-server/src/test/java/com/apihub/auth/service/JwtTokenServiceTest.java services/apihub-server/src/test/java/com/apihub/auth/service/AuthServiceTest.java
git commit -m "feat: issue real jwt auth tokens"
```

### Task 2: Add `/refresh`, `/me`, `/logout` and tighten security rules around auth endpoints

**Files:**
- Create: `services/apihub-server/src/main/java/com/apihub/auth/model/RefreshTokenRequest.java`
- Create: `services/apihub-server/src/main/java/com/apihub/auth/model/AuthMeResponse.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/auth/web/AuthController.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/auth/service/AuthService.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/auth/security/BearerAuthenticationFilter.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/common/config/SecurityConfig.java`
- Modify: `services/apihub-server/src/test/java/com/apihub/auth/web/AuthControllerTest.java`
- Modify: `services/apihub-server/src/test/java/com/apihub/common/config/ProjectSecurityTest.java`

- [ ] **Step 1: Write failing controller and security tests for refresh, me, and logout**

```java
@Test
void shouldRefreshTokens() throws Exception {
    given(authService.refresh(new RefreshTokenRequest("refresh.jwt.token")))
            .willReturn(new LoginResponse("new-access", "new-refresh"));

    mockMvc.perform(post("/api/v1/auth/refresh")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                            {"refreshToken":"refresh.jwt.token"}
                            """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.accessToken").value("new-access"))
            .andExpect(jsonPath("$.data.refreshToken").value("new-refresh"));
}

@Test
void shouldReturnCurrentUserProfile() throws Exception {
    given(authService.me(1L)).willReturn(new AuthMeResponse(1L, "admin", "Administrator"));
    given(jwtTokenService.parseAccessToken("access.jwt.token")).willReturn(Optional.of(1L));

    mockMvc.perform(get("/api/v1/auth/me")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer access.jwt.token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.username").value("admin"));
}
```

```java
@Test
void shouldRequireBearerTokenForLogout() throws Exception {
    mockMvc.perform(post("/api/v1/auth/logout"))
            .andExpect(status().isUnauthorized());
}
```

- [ ] **Step 2: Run the focused backend web/security tests and confirm they fail because the endpoints do not exist yet**

Run: `Set-Location services/apihub-server; $env:JAVA_HOME='D:\dev-tool\java\openjdk-21\jdk-21.0.2'; mvn test "-Dtest=AuthControllerTest,ProjectSecurityTest"`

Expected: FAIL because `/api/v1/auth/refresh`, `/api/v1/auth/me`, and `/api/v1/auth/logout` are missing and `SecurityConfig` still treats `/api/v1/auth/**` as fully public.

- [ ] **Step 3: Implement the auth session endpoints and narrow the public auth surface**

```java
public LoginResponse refresh(RefreshTokenRequest request) {
    JwtTokenService.AuthTokenClaims claims = jwtTokenService.parseRefreshToken(request.refreshToken())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token invalid"));
    UserCredential user = authUserRepository.findActiveById(claims.userId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token invalid"));
    if (user.tokenVersion() != claims.tokenVersion()) {
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token invalid");
    }

    int nextVersion = authUserRepository.incrementTokenVersion(user.id());
    return jwtTokenService.issueTokens(user.id(), user.username(), nextVersion);
}

public AuthMeResponse me(Long userId) {
    UserCredential user = authUserRepository.findActiveById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    return new AuthMeResponse(user.id(), user.username(), user.username());
}

public void logout(Long userId) {
    authUserRepository.incrementTokenVersion(userId);
}
```

```java
@PostMapping("/refresh")
public ApiResponse<LoginResponse> refresh(@RequestBody RefreshTokenRequest request) {
    return ApiResponse.success(authService.refresh(request));
}

@GetMapping("/me")
public ApiResponse<AuthMeResponse> me(Authentication authentication) {
    return ApiResponse.success(authService.me((Long) authentication.getPrincipal()));
}

@PostMapping("/logout")
public ApiResponse<Void> logout(Authentication authentication) {
    authService.logout((Long) authentication.getPrincipal());
    return ApiResponse.success(null);
}
```

```java
.authorizeHttpRequests(authorize -> authorize
        .requestMatchers("/api/v1/auth/login", "/api/v1/auth/refresh", "/api/health", "/mock/**").permitAll()
        .anyRequest().authenticated())
```

- [ ] **Step 4: Re-run the focused backend web/security tests and confirm the new auth endpoints pass**

Run: `Set-Location services/apihub-server; $env:JAVA_HOME='D:\dev-tool\java\openjdk-21\jdk-21.0.2'; mvn test "-Dtest=AuthControllerTest,ProjectSecurityTest"`

Expected: PASS

- [ ] **Step 5: Commit Task 2**

```bash
git add services/apihub-server/src/main/java/com/apihub/auth/model/RefreshTokenRequest.java services/apihub-server/src/main/java/com/apihub/auth/model/AuthMeResponse.java services/apihub-server/src/main/java/com/apihub/auth/web/AuthController.java services/apihub-server/src/main/java/com/apihub/auth/service/AuthService.java services/apihub-server/src/main/java/com/apihub/auth/security/BearerAuthenticationFilter.java services/apihub-server/src/main/java/com/apihub/common/config/SecurityConfig.java services/apihub-server/src/test/java/com/apihub/auth/web/AuthControllerTest.java services/apihub-server/src/test/java/com/apihub/common/config/ProjectSecurityTest.java
git commit -m "feat: add auth refresh me and logout endpoints"
```

### Task 3: Add SDK-level auto refresh and centralize token lifecycle in the web app

**Files:**
- Modify: `packages/api-sdk/src/client.ts`
- Modify: `packages/api-sdk/src/modules/auth.ts`
- Modify: `apps/web/src/lib/auth-store.ts`
- Create: `apps/web/src/lib/auth-session.test.ts`

- [ ] **Step 1: Write a failing frontend test for 401 -> refresh -> replay and failed-refresh cleanup**

```tsx
it("refreshes tokens once and retries the original request", async () => {
  window.localStorage.setItem("apihub.accessToken", "expired-access");
  window.localStorage.setItem("apihub.refreshToken", "valid-refresh");

  const fetchMock = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ code: 401, message: "Unauthorized", data: null }), { status: 401 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({
      code: 0,
      message: "ok",
      data: { accessToken: "new-access", refreshToken: "new-refresh" }
    }), { status: 200 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({
      code: 0,
      message: "ok",
      data: [{ id: 1, name: "Default Project", projectKey: "default", description: "Seed", debugAllowedHosts: [] }]
    }), { status: 200 }));

  vi.stubGlobal("fetch", fetchMock);

  const response = await fetchProjects();

  expect(response.data[0].projectKey).toBe("default");
  expect(window.localStorage.getItem("apihub.accessToken")).toBe("new-access");
  expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/v1/auth/refresh", expect.anything());
  expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/v1/projects", expect.objectContaining({
    headers: expect.any(Headers)
  }));
});
```

```tsx
it("clears local tokens when refresh also fails", async () => {
  window.localStorage.setItem("apihub.accessToken", "expired-access");
  window.localStorage.setItem("apihub.refreshToken", "expired-refresh");

  const fetchMock = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ code: 401, message: "Unauthorized", data: null }), { status: 401 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ code: 401, message: "Refresh token invalid", data: null }), { status: 401 }));

  vi.stubGlobal("fetch", fetchMock);

  await expect(fetchProjects()).rejects.toMatchObject({ status: 401 });
  expect(window.localStorage.getItem("apihub.accessToken")).toBeNull();
  expect(window.localStorage.getItem("apihub.refreshToken")).toBeNull();
});
```

- [ ] **Step 2: Run the focused frontend auth-session test and confirm the current client does not retry**

Run: `pnpm --filter web test -- src/lib/auth-session.test.ts`

Expected: FAIL because `apiFetch()` currently sends the request once and throws on the first `401`.

- [ ] **Step 3: Implement one-shot refresh-and-replay in `apiFetch()` and expose the new auth API helpers**

```ts
export function refreshSession(payload: { refreshToken: string }) {
  return apiFetch<{ accessToken: string; refreshToken: string }>("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify(payload)
  }, { skipAuthRefresh: true });
}

export function fetchMe() {
  return apiFetch<{ id: number; username: string; displayName: string }>("/api/v1/auth/me");
}

export function logout() {
  return apiFetch<null>("/api/v1/auth/logout", { method: "POST" });
}
```

```ts
type ApiFetchOptions = {
  skipAuthRefresh?: boolean;
};

async function apiFetchInternal<T>(input: string, init?: RequestInit, options?: ApiFetchOptions): Promise<ApiResponse<T>> {
  const response = await fetch(input, { ...init, headers: buildHeaders(init) });

  if (response.status === 401 && !options?.skipAuthRefresh && typeof window !== "undefined") {
    const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    if (refreshToken) {
      const refreshResponse = await apiFetchInternal<{ accessToken: string; refreshToken: string }>(
        "/api/v1/auth/refresh",
        { method: "POST", body: JSON.stringify({ refreshToken }) },
        { skipAuthRefresh: true }
      );
      window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, refreshResponse.data.accessToken);
      window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshResponse.data.refreshToken);
      return apiFetchInternal<T>(input, init, { skipAuthRefresh: true });
    }
  }
```

```ts
export function loadTokens() {
  if (typeof window === "undefined") {
    return { accessToken: null, refreshToken: null };
  }

  return {
    accessToken: window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY),
    refreshToken: window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
  };
}
```

- [ ] **Step 4: Re-run the focused frontend auth-session test and confirm refresh-and-replay passes**

Run: `pnpm --filter web test -- src/lib/auth-session.test.ts`

Expected: PASS

- [ ] **Step 5: Commit Task 3**

```bash
git add packages/api-sdk/src/client.ts packages/api-sdk/src/modules/auth.ts apps/web/src/lib/auth-store.ts apps/web/src/lib/auth-session.test.ts
git commit -m "feat: refresh expired web sessions automatically"
```

### Task 4: Surface `/me` and logout in the web console without redesigning the whole UI

**Files:**
- Create: `apps/web/src/features/auth/components/session-bar.tsx`
- Create: `apps/web/src/features/auth/components/session-bar.test.tsx`
- Create: `apps/web/src/features/auth/components/login-form.test.tsx`
- Modify: `apps/web/src/features/auth/components/login-form.tsx`
- Modify: `apps/web/src/app/console/projects/page.tsx`
- Modify: `apps/web/src/features/projects/components/project-shell.tsx`
- Modify: `apps/web/src/features/projects/components/project-shell.test.tsx`

- [ ] **Step 1: Write failing frontend tests for login-page self-check and session-bar logout**

```tsx
it("redirects to the console when an existing session is already valid", async () => {
  vi.mocked(fetchMe).mockResolvedValue({
    code: 0,
    message: "ok",
    data: { id: 1, username: "admin", displayName: "Administrator" }
  });
  saveTokens("access", "refresh");

  render(<LoginForm />);

  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/console/projects"));
});
```

```tsx
it("loads the current user and logs out from the session bar", async () => {
  vi.mocked(fetchMe).mockResolvedValue({
    code: 0,
    message: "ok",
    data: { id: 1, username: "admin", displayName: "Administrator" }
  });
  vi.mocked(logout).mockResolvedValue({ code: 0, message: "ok", data: null });

  render(<SessionBar />);

  expect(await screen.findByText("Administrator")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

  await waitFor(() => expect(logout).toHaveBeenCalled());
  expect(window.localStorage.getItem("apihub.accessToken")).toBeNull();
});
```

- [ ] **Step 2: Run the focused frontend auth UI tests and confirm the session UI does not exist yet**

Run: `pnpm --filter web test -- src/features/auth/components/login-form.test.tsx src/features/auth/components/session-bar.test.tsx`

Expected: FAIL because `LoginForm` does not perform `/me` self-checks and there is no `SessionBar` component yet.

- [ ] **Step 3: Add a lightweight session bar and use it in both console pages**

```tsx
export function SessionBar() {
  const router = useRouter();
  const [user, setUser] = useState<{ displayName: string; username: string } | null>(null);

  useEffect(() => {
    void fetchMe()
      .then((response) => setUser(response.data))
      .catch(() => {
        clearTokens();
        router.replace("/login");
      });
  }, [router]);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      clearTokens();
      router.replace("/login");
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-[1.6rem] border border-white/60 bg-white/70 px-5 py-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Session</p>
        <p className="mt-1 text-sm font-medium text-slate-900">{user?.displayName ?? "Loading session..."}</p>
      </div>
      <button type="button" onClick={handleLogout}>Sign out</button>
    </div>
  );
}
```

```tsx
useEffect(() => {
  const { accessToken, refreshToken } = loadTokens();
  if (!accessToken && !refreshToken) {
    return;
  }

  void fetchMe()
    .then(() => {
      router.replace("/console/projects");
    })
    .catch(() => {
      clearTokens();
    });
}, [router]);
```

```tsx
<main className="mx-auto flex min-h-screen max-w-[1320px] flex-col gap-8 p-6 text-slate-900">
  <SessionBar />
  ...
</main>
```

- [ ] **Step 4: Re-run the focused frontend auth UI tests plus the project shell regression**

Run: `pnpm --filter web test -- src/features/auth/components/login-form.test.tsx src/features/auth/components/session-bar.test.tsx src/features/projects/components/project-shell.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit Task 4**

```bash
git add apps/web/src/features/auth/components/session-bar.tsx apps/web/src/features/auth/components/session-bar.test.tsx apps/web/src/features/auth/components/login-form.tsx apps/web/src/features/auth/components/login-form.test.tsx apps/web/src/app/console/projects/page.tsx apps/web/src/features/projects/components/project-shell.tsx apps/web/src/features/projects/components/project-shell.test.tsx
git commit -m "feat: add jwt session self-check and logout ui"
```

### Task 5: Final verification and integration

**Files:**
- Modify: `docs/superpowers/plans/2026-04-11-real-jwt-session-flow.md`

- [ ] **Step 1: Run the focused backend verification set**

Run: `Set-Location services/apihub-server; $env:JAVA_HOME='D:\dev-tool\java\openjdk-21\jdk-21.0.2'; mvn test "-Dtest=JwtTokenServiceTest,AuthServiceTest,AuthControllerTest,ProjectSecurityTest"`

Expected: PASS

- [ ] **Step 2: Run the focused frontend verification set**

Run: `pnpm --filter web test -- src/lib/auth-session.test.ts src/features/auth/components/login-form.test.tsx src/features/auth/components/session-bar.test.tsx src/features/projects/components/project-shell.test.tsx`

Expected: PASS

- [ ] **Step 3: Run the frontend production build**

Run: `pnpm --filter web build`

Expected: PASS

- [ ] **Step 4: Check git status**

Run: `git status --short`

Expected: only the JWT-session-flow files and this plan file remain.

- [ ] **Step 5: Commit the final integration result**

```bash
git add docs/superpowers/plans/2026-04-11-real-jwt-session-flow.md infra/mysql/001_phase1_schema.sql infra/mysql/002_phase1_seed.sql services/apihub-server/src/main services/apihub-server/src/test packages/api-sdk/src apps/web/src
git commit -m "feat: implement real jwt session flow"
```
