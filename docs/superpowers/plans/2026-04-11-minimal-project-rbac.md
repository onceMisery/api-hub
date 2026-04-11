# Minimal Project RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让已登录用户只能访问自己拥有或加入的项目及其子资源，并把新建项目/模块/分组/环境的归属从硬编码管理员切到当前认证用户。

**Architecture:** 继续沿用当前 Spring Security Bearer 认证，只把 `Authentication.getPrincipal()` 中的 `Long userId` 往 controller/service 透传。权限判断集中放在 `ProjectService` + `ProjectRepository` 的项目树访问校验里，基于现有 `project.owner_id`、`space.owner_id`、`project_member`、`space_member` 做最小闭环，不引入 MySQL 外键，也不新增独立权限框架。

**Tech Stack:** `Spring Boot 3.2`, `Java 21`, `Spring Security`, `JDBC`, `H2`, `Maven`

---

### Task 1: 用失败测试固定项目列表与项目树的成员访问边界

**Files:**
- Modify: `services/apihub-server/src/test/java/com/apihub/common/config/ProjectSecurityTest.java`
- Modify: `services/apihub-server/src/test/java/com/apihub/project/web/ProjectTreeControllerTest.java`

- [ ] **Step 1: 先补失败测试，覆盖“无成员资格不能看到项目”和“controller 必须透传当前用户”**

```java
@Test
void shouldRejectProjectTreeWhenAuthenticatedUserCannotAccessProject() throws Exception {
    given(jwtTokenService.parseAccessTokenClaims("access-9")).willReturn(Optional.of(
            new JwtTokenService.AuthTokenClaims(9L, "outsider", 0, "access")));
    given(authUserRepository.findActiveById(9L)).willReturn(Optional.of(
            new AuthUserRepository.UserCredential(9L, "outsider", "Outsider", "hash", "active", 0)));
    given(projectService.getProjectTree(9L, 1L))
            .willThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));

    mockMvc.perform(get("/api/v1/projects/1/tree")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer access-9"))
            .andExpect(status().isNotFound());
}

@Test
void shouldPassAuthenticatedUserIdIntoProjectList() throws Exception {
    given(projectService.listProjects(1L)).willReturn(List.of(
            new ProjectDetail(1L, "Default Project", "default", "Seed project", List.of())));

    mockMvc.perform(get("/api/v1/projects")
                    .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].projectKey").value("default"));

    verify(projectService).listProjects(1L);
}
```

- [ ] **Step 2: 跑目标测试，确认当前 controller/service 还没有 `userId` 透传**

Run: `Set-Location services/apihub-server; $env:JAVA_HOME='D:\dev-tool\java\openjdk-21\jdk-21.0.2'; mvn test "-Dtest=ProjectTreeControllerTest,ProjectSecurityTest"`

Expected: FAIL，报错点应落在 `listProjects(1L)` / `getProjectTree(9L, 1L)` 这类新签名不存在，或 controller 没有从 `Authentication` 取 `Long` principal。

### Task 2: 在仓储和服务层补最小项目成员校验

**Files:**
- Modify: `services/apihub-server/src/main/java/com/apihub/project/repository/ProjectRepository.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/project/service/ProjectService.java`
- Modify: `services/apihub-server/src/test/java/com/apihub/project/service/ProjectServiceTest.java`
- Modify: `services/apihub-server/src/test/resources/project-service-data.sql`
- Modify: `infra/mysql/002_phase1_seed.sql`

- [ ] **Step 1: 先补失败测试，固定成员过滤、越权访问和创建后自动入项**

```java
@Test
void shouldListOnlyProjectsVisibleToCurrentUser() {
    assertThat(projectService.listProjects(1L))
            .extracting("projectKey")
            .containsExactly("default");
    assertThat(projectService.listProjects(9L)).isEmpty();
}

@Test
void shouldRejectModuleAccessWhenUserCannotReachParentProject() {
    assertThatThrownBy(() -> projectService.listModules(9L, 1L))
            .isInstanceOf(ResponseStatusException.class)
            .extracting(error -> ((ResponseStatusException) error).getStatusCode())
            .isEqualTo(HttpStatus.NOT_FOUND);
}

@Test
void shouldCreateProjectForCurrentUserAndGrantProjectAdminMembership() {
    var created = projectService.createProject(7L, new CreateProjectRequest("Owned", "owned", "by user", List.of()));

    assertThat(projectService.listProjects(7L))
            .extracting("projectKey")
            .contains("owned");
    assertThat(projectService.listProjects(1L))
            .extracting("projectKey")
            .doesNotContain("owned");
}
```

- [ ] **Step 2: 运行 service 测试，确认当前实现还会把所有项目都暴露给任何用户，并继续写死 `DEFAULT_USER_ID`**

Run: `Set-Location services/apihub-server; $env:JAVA_HOME='D:\dev-tool\java\openjdk-21\jdk-21.0.2'; mvn test "-Dtest=ProjectServiceTest"`

Expected: FAIL，报错点应落在 `listProjects(9L)` 仍能看到种子项目、`listModules(9L, 1L)` 签名不存在，或新建项目仍挂到 `DEFAULT_USER_ID = 1L`。

- [ ] **Step 3: 在仓储层增加项目可见性和项目树引用查询，不引入外键**

```java
public List<ProjectDetail> listProjects(Long userId) {
    return jdbcTemplate.query("""
            select distinct p.id, p.name, p.project_key, p.description, p.debug_allowed_hosts_json
            from project p
            left join project_member pm
                   on pm.project_id = p.id
                  and pm.user_id = ?
                  and pm.member_status = 'active'
            left join space_member sm
                   on sm.space_id = p.space_id
                  and sm.user_id = ?
                  and sm.member_status = 'active'
            join space s on s.id = p.space_id
            where p.owner_id = ?
               or pm.id is not null
               or s.owner_id = ?
               or sm.id is not null
            order by p.id
            """, PROJECT_ROW_MAPPER, userId, userId, userId, userId);
}

public boolean canAccessProject(Long userId, Long projectId) {
    Integer matched = jdbcTemplate.queryForObject("""
            select count(*)
            from project p
            left join project_member pm
                   on pm.project_id = p.id
                  and pm.user_id = ?
                  and pm.member_status = 'active'
            left join space_member sm
                   on sm.space_id = p.space_id
                  and sm.user_id = ?
                  and sm.member_status = 'active'
            join space s on s.id = p.space_id
            where p.id = ?
              and (p.owner_id = ? or pm.id is not null or s.owner_id = ? or sm.id is not null)
            """, Integer.class, userId, userId, projectId, userId, userId);
    return matched != null && matched > 0;
}
```

- [ ] **Step 4: 在 service 层统一要求 `userId`，并对 project/module/group/endpoint/environment 都回溯到所属项目后鉴权**

```java
@Transactional(readOnly = true)
public List<ProjectDetail> listProjects(Long userId) {
    return projectRepository.listProjects(userId);
}

private ProjectDetail requireProject(Long userId, Long projectId) {
    ProjectDetail project = projectRepository.findProject(projectId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
    if (!projectRepository.canAccessProject(userId, projectId)) {
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found");
    }
    return project;
}

private ProjectRepository.ModuleReference requireModule(Long userId, Long moduleId) {
    ProjectRepository.ModuleReference module = projectRepository.findModuleReference(moduleId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Module not found"));
    requireProject(userId, module.projectId());
    return module;
}
```

- [ ] **Step 5: 新建项目时改用当前用户作为 owner / created_by，并写入最小成员关系**

```java
public ProjectDetail createProject(Long userId, CreateProjectRequest request) {
    debugTargetRuleValidator.validateRules(request.debugAllowedHosts());
    return projectRepository.createProject(userId, request);
}
```

```java
public ProjectDetail createProject(Long userId, CreateProjectRequest request) {
    GeneratedKeyHolder keyHolder = new GeneratedKeyHolder();
    jdbcTemplate.update(connection -> {
        PreparedStatement statement = connection.prepareStatement("""
                insert into project (space_id, name, project_key, description, owner_id, status, debug_allowed_hosts_json)
                values (?, ?, ?, ?, ?, 'active', ?)
                """, Statement.RETURN_GENERATED_KEYS);
        statement.setLong(1, DEFAULT_SPACE_ID);
        statement.setString(2, request.name());
        statement.setString(3, request.projectKey());
        statement.setString(4, request.description());
        statement.setLong(5, userId);
        statement.setString(6, serializeDebugRules(request.debugAllowedHosts()));
        return statement;
    }, keyHolder);
    long projectId = requireGeneratedId(keyHolder);
    jdbcTemplate.update("""
            insert into project_member (project_id, user_id, role_code, member_status)
            values (?, ?, 'project_admin', 'active')
            """, projectId, userId);
    return findProject(projectId).orElseThrow();
}
```

- [ ] **Step 6: 给种子数据补最小成员关系，保证 admin 在默认 space/project 上有明确 membership**

```sql
INSERT INTO space_member (id, space_id, user_id, role_code, member_status)
VALUES (1, 1, 1, 'space_admin', 'active');

INSERT INTO project_member (id, project_id, user_id, role_code, member_status)
VALUES (1, 1, 1, 'project_admin', 'active');
```

- [ ] **Step 7: 重跑 service 测试，确认越权访问变成 404，且新项目只对创建者可见**

Run: `Set-Location services/apihub-server; $env:JAVA_HOME='D:\dev-tool\java\openjdk-21\jdk-21.0.2'; mvn test "-Dtest=ProjectServiceTest"`

Expected: PASS

### Task 3: 让 project/doc/debug/mock 控制器都透传当前用户，并对调试/Mock 子链路复用项目权限

**Files:**
- Modify: `services/apihub-server/src/main/java/com/apihub/project/web/ProjectController.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/project/web/ModuleController.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/project/web/ModuleMutationController.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/project/web/ApiGroupController.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/project/web/ApiGroupMutationController.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/project/web/ProjectEnvironmentController.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/project/web/EnvironmentMutationController.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/doc/web/ApiEndpointController.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/doc/web/ApiSchemaController.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/doc/web/ApiVersionController.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/debug/web/DebugController.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/debug/web/DebugHistoryController.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/debug/service/DebugService.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/mock/web/ApiMockRuleController.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/mock/web/ApiMockReleaseController.java`
- Modify: `services/apihub-server/src/main/java/com/apihub/mock/web/ApiMockSimulationController.java`
- Modify: `services/apihub-server/src/test/java/com/apihub/project/web/ProjectTreeControllerTest.java`
- Modify: `services/apihub-server/src/test/java/com/apihub/common/config/ProjectSecurityTest.java`

- [ ] **Step 1: controller 全部改成从 `Authentication` 取 `Long` principal，再调用新 service 签名**

```java
@GetMapping
public ApiResponse<List<ProjectDetail>> listProjects(Authentication authentication) {
    return ApiResponse.success(projectService.listProjects((Long) authentication.getPrincipal()));
}

@GetMapping("/{projectId}/tree")
public ApiResponse<ProjectTreeResponse> getProjectTree(@PathVariable Long projectId,
                                                       Authentication authentication) {
    return ApiResponse.success(projectService.getProjectTree((Long) authentication.getPrincipal(), projectId));
}
```

- [ ] **Step 2: debug/mock 也必须接当前用户，避免知道 `environmentId/endpointId` 就能越权调用**

```java
public ApiResponse<ExecuteDebugResponse> execute(@RequestBody ExecuteDebugRequest request,
                                                 Authentication authentication) {
    return ApiResponse.success(debugService.execute((Long) authentication.getPrincipal(), request));
}
```

```java
public ExecuteDebugResponse execute(Long userId, ExecuteDebugRequest request) {
    EnvironmentDetail environment = requireEnvironment(userId, request.environmentId());
    EndpointDetail endpoint = requireEndpoint(userId, request.endpointId());
    ...
}
```

- [ ] **Step 3: 重跑 web/security 测试，确认 controller 层都改到新签名且 JWT principal 可以稳定透传**

Run: `Set-Location services/apihub-server; $env:JAVA_HOME='D:\dev-tool\java\openjdk-21\jdk-21.0.2'; mvn test "-Dtest=ProjectTreeControllerTest,ProjectSecurityTest"`

Expected: PASS

### Task 4: 做一组最小后端回归并提交

**Files:**
- Modify: `docs/superpowers/plans/2026-04-11-minimal-project-rbac.md`

- [ ] **Step 1: 运行最小 RBAC 相关后端回归**

Run: `Set-Location services/apihub-server; $env:JAVA_HOME='D:\dev-tool\java\openjdk-21\jdk-21.0.2'; mvn test "-Dtest=ProjectServiceTest,ProjectTreeControllerTest,ProjectSecurityTest,AuthControllerTest"`

Expected: PASS

- [ ] **Step 2: 检查工作区，确认只包含 RBAC 相关文件**

Run: `git status --short`

Expected: 只出现本次 RBAC 相关 Java、SQL、测试和计划文档改动。

- [ ] **Step 3: 提交**

```bash
git add docs/superpowers/plans/2026-04-11-minimal-project-rbac.md infra/mysql/002_phase1_seed.sql services/apihub-server/src/main/java/com/apihub/project services/apihub-server/src/main/java/com/apihub/doc services/apihub-server/src/main/java/com/apihub/debug services/apihub-server/src/main/java/com/apihub/mock services/apihub-server/src/test/java/com/apihub/project services/apihub-server/src/test/java/com/apihub/common/config/ProjectSecurityTest.java services/apihub-server/src/test/resources/project-service-data.sql
git commit -m "feat: enforce minimal project membership access"
```

## Self-Review

### Spec coverage
- 项目列表/详情/树的成员过滤：Task 1, Task 2
- project/doc/debug/mock 子资源越权收口：Task 2, Task 3
- 去掉 `DEFAULT_USER_ID` 写死创建归属：Task 2
- 不引入 MySQL 外键：Task 2 仅复用现有 owner/member 表

### Placeholder scan
- 所有任务都给出了精确文件、命令和关键代码片段
- 没有 `TODO` / `TBD` / “类似 Task N” 这类占位描述

### Type consistency
- controller/service 一律透传 `Long userId`
- 越权统一回 `404`，避免泄露资源存在性
- 成员资格只依赖 `project_member` / `space_member` / owner 字段
