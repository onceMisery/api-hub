package com.apihub.project.service;

import com.apihub.doc.model.DocDtos.CreateEndpointRequest;
import com.apihub.doc.model.DocDtos.ParameterUpsertItem;
import com.apihub.doc.model.DocDtos.ResponseUpsertItem;
import com.apihub.doc.model.DocDtos.CreateVersionRequest;
import com.apihub.doc.model.DocDtos.UpdateEndpointRequest;
import com.apihub.mock.model.MockDtos.MockBodyConditionEntry;
import com.apihub.mock.model.MockDtos.MockConditionEntry;
import com.apihub.mock.model.MockDtos.MockRuleUpsertItem;
import com.apihub.mock.model.MockDtos.MockSimulationRequest;
import com.apihub.project.model.ProjectDtos.CreateEnvironmentRequest;
import com.apihub.project.model.ProjectDtos.EnvironmentEntry;
import com.apihub.project.model.ProjectDtos.DebugTargetRuleEntry;
import com.apihub.mock.model.MockDtos.MockSimulationResponseItem;
import com.apihub.mock.model.MockDtos.MockSimulationResult;
import com.apihub.debug.service.DebugTargetRuleValidator;
import com.apihub.mock.service.MockRuntimeResolver;
import com.apihub.project.model.ProjectDtos.UpdateGroupRequest;
import com.apihub.project.model.ProjectDtos.UpdateModuleRequest;
import com.apihub.project.model.ProjectDtos.UpdateEnvironmentRequest;
import com.apihub.doc.repository.EndpointRepository;
import com.apihub.project.model.ProjectDtos.CreateGroupRequest;
import com.apihub.project.model.ProjectDtos.CreateModuleRequest;
import com.apihub.project.model.ProjectDtos.CreateProjectRequest;
import com.apihub.project.model.ProjectDtos.UpdateProjectRequest;
import com.apihub.project.repository.ProjectRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@JdbcTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:project-service;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
@Import({ProjectService.class, ProjectRepository.class, EndpointRepository.class, MockRuntimeResolver.class, DebugTargetRuleValidator.class})
@Sql(scripts = "/project-service-schema.sql")
@Sql(scripts = "/project-service-data.sql")
class ProjectServiceTest {

    @Autowired
    private ProjectService projectService;

    @Test
    void shouldListOnlyProjectsVisibleToCurrentUser() {
        assertThat(projectService.listProjects(1L))
                .extracting("projectKey")
                .containsExactly("default");
        assertThat(projectService.listProjects(9L)).isEmpty();
    }

    @Test
    void shouldRejectProjectResourcesWhenUserCannotAccessParentProject() {
        assertThatThrownBy(() -> projectService.listModules(9L, 1L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
        assertThatThrownBy(() -> projectService.getProjectTree(9L, 1L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void shouldCreateProjectForCurrentUserAndScopeVisibility() {
        var project = projectService.createProject(7L, new CreateProjectRequest("Owned", "owned", "by user", java.util.List.of()));

        assertThat(projectService.listProjects(7L))
                .extracting("projectKey")
                .contains("owned");
        assertThat(projectService.listProjects(1L))
                .extracting("projectKey")
                .doesNotContain("owned");
    }

    @Test
    void shouldPersistProjectAndEnvironmentDebugPolicies() {
        var project = projectService.createProject(1L, new CreateProjectRequest(
                "Secure",
                "secure",
                "debug policy",
                java.util.List.of(new DebugTargetRuleEntry("api.partner.com", false))));

        var savedProject = projectService.updateProject(1L, project.id(), new UpdateProjectRequest(
                "Secure",
                "debug policy updated",
                java.util.List.of(new DebugTargetRuleEntry("*.corp.example.com", false))));

        var environment = projectService.createEnvironment(1L, project.id(), new CreateEnvironmentRequest(
                "Staging",
                "https://staging.example.com",
                true,
                java.util.List.of(),
                java.util.List.of(),
                java.util.List.of(),
                "none",
                "",
                "",
                "append",
                java.util.List.of(new DebugTargetRuleEntry("10.10.1.8", true))));

        assertThat(savedProject.debugAllowedHosts())
                .containsExactly(new DebugTargetRuleEntry("*.corp.example.com", false));
        assertThat(environment.debugHostMode()).isEqualTo("append");
        assertThat(environment.debugAllowedHosts())
                .containsExactly(new DebugTargetRuleEntry("10.10.1.8", true));
    }

    @Test
    void shouldRejectInvalidDebugRulePattern() {
        assertThatThrownBy(() -> projectService.updateProject(1L, 1L, new UpdateProjectRequest(
                "Default Project",
                "Seed project",
                java.util.List.of(new DebugTargetRuleEntry("https://bad.example.com/path", false)))))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void shouldRejectInvalidEnvironmentDebugMode() {
        assertThatThrownBy(() -> projectService.updateEnvironment(1L, 1L, new UpdateEnvironmentRequest(
                "Local",
                "https://local.dev",
                true,
                java.util.List.of(),
                java.util.List.of(),
                java.util.List.of(),
                "none",
                "",
                "",
                "merge-all",
                java.util.List.of())))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void shouldCompleteProjectModuleGroupEndpointVersionFlowAgainstDatabase() {
        assertThat(projectService.listProjects(1L)).extracting("projectKey").contains("default");

        var project = projectService.createProject(1L, new CreateProjectRequest("Demo", "demo", "first project", java.util.List.of()));
        var updatedProject = projectService.updateProject(1L, project.id(), new UpdateProjectRequest("Demo Updated", "desc", java.util.List.of()));
        var environment = projectService.createEnvironment(1L, project.id(), new CreateEnvironmentRequest(
                "Local",
                "https://local.dev",
                true,
                java.util.List.of(new EnvironmentEntry("token", "dev-token")),
                java.util.List.of(new EnvironmentEntry("Authorization", "Bearer {{token}}")),
                java.util.List.of(new EnvironmentEntry("locale", "zh-CN")),
                "bearer",
                "Authorization",
                "dev-token",
                "inherit",
                java.util.List.of()));
        var updatedEnvironment = projectService.updateEnvironment(1L, environment.id(), new UpdateEnvironmentRequest(
                "Staging",
                "https://staging.dev",
                true,
                java.util.List.of(new EnvironmentEntry("token", "staging-token")),
                java.util.List.of(new EnvironmentEntry("X-App", "apihub")),
                java.util.List.of(new EnvironmentEntry("region", "cn")),
                "api_key_header",
                "X-API-Key",
                "staging-key",
                "inherit",
                java.util.List.of()));
        var module = projectService.createModule(1L, project.id(), new CreateModuleRequest("Core"));
        var group = projectService.createGroup(1L, module.id(), new CreateGroupRequest("User APIs"));
        var endpoint = projectService.createEndpoint(1L, group.id(), new CreateEndpointRequest(
                "Get User",
                "GET",
                "/users/{id}",
                "load user",
                true));
        var renamedModule = projectService.updateModule(1L, module.id(), new UpdateModuleRequest("Core Services"));
        var renamedGroup = projectService.updateGroup(1L, group.id(), new UpdateGroupRequest("User Management"));
        var updatedEndpoint = projectService.updateEndpoint(1L, endpoint.id(), new UpdateEndpointRequest(
                "Get User Detail",
                "GET",
                "/users/{id}",
                "load detailed user",
                false));
        var parameter = new ParameterUpsertItem(
                "path",
                "id",
                "string",
                true,
                "User id",
                "u_1001");
        var response = new ResponseUpsertItem(
                200,
                "application/json",
                "userId",
                "string",
                true,
                "Primary identifier",
                "u_1001");
        projectService.replaceParameters(1L, endpoint.id(), java.util.List.of(parameter));
        projectService.replaceResponses(1L, endpoint.id(), java.util.List.of(response));
        var version = projectService.createVersion(1L, endpoint.id(), new CreateVersionRequest(
                "v1",
                "initial",
                "{\"path\":\"/users/{id}\"}"));

        assertThat(updatedProject.name()).isEqualTo("Demo Updated");
        assertThat(environment.name()).isEqualTo("Local");
        assertThat(updatedEnvironment.baseUrl()).isEqualTo("https://staging.dev");
        assertThat(updatedEnvironment.variables()).containsExactly(new EnvironmentEntry("token", "staging-token"));
        assertThat(updatedEnvironment.defaultHeaders()).containsExactly(new EnvironmentEntry("X-App", "apihub"));
        assertThat(updatedEnvironment.defaultQuery()).containsExactly(new EnvironmentEntry("region", "cn"));
        assertThat(updatedEnvironment.authMode()).isEqualTo("api_key_header");
        assertThat(updatedEnvironment.authKey()).isEqualTo("X-API-Key");
        assertThat(updatedEnvironment.authValue()).isEqualTo("staging-key");
        assertThat(projectService.listEnvironments(1L, project.id())).extracting("name").containsExactly("Staging");
        assertThat(renamedModule.name()).isEqualTo("Core Services");
        assertThat(renamedGroup.name()).isEqualTo("User Management");
        assertThat(projectService.getProject(1L, project.id()).projectKey()).isEqualTo("demo");
        assertThat(projectService.listModules(1L, project.id())).extracting("name").containsExactly("Core Services");
        assertThat(projectService.listGroups(1L, module.id())).extracting("name").containsExactly("User Management");
        assertThat(projectService.listEndpoints(1L, group.id())).extracting("name").containsExactly("Get User Detail");
        assertThat(updatedEndpoint.description()).isEqualTo("load detailed user");
        assertThat(projectService.getEndpoint(1L, endpoint.id()).description()).isEqualTo("load detailed user");
        assertThat(projectService.listParameters(1L, endpoint.id())).singleElement().extracting("name").isEqualTo("id");
        assertThat(projectService.listResponses(1L, endpoint.id())).singleElement().extracting("name").isEqualTo("userId");
        assertThat(projectService.listVersions(1L, endpoint.id())).extracting("version").containsExactly("v1");
        assertThat(version.changeSummary()).isEqualTo("initial");
        assertThat(projectService.getProjectTree(1L, project.id()).modules()).hasSize(1);
    }

    @Test
    void shouldDeleteEndpointGroupAndModule() {
        var project = projectService.createProject(1L, new CreateProjectRequest("Cleanup", "cleanup", "cleanup project", java.util.List.of()));
        var environment = projectService.createEnvironment(1L, project.id(), new CreateEnvironmentRequest(
                "Local",
                "https://cleanup.dev",
                false,
                java.util.List.of(),
                java.util.List.of(),
                java.util.List.of(),
                "none",
                "",
                "",
                "inherit",
                java.util.List.of()));
        var module = projectService.createModule(1L, project.id(), new CreateModuleRequest("Legacy"));
        var group = projectService.createGroup(1L, module.id(), new CreateGroupRequest("Deprecated"));
        var endpoint = projectService.createEndpoint(1L, group.id(), new CreateEndpointRequest(
                "Delete Me",
                "DELETE",
                "/legacy",
                "remove soon",
                false));

        projectService.deleteEndpoint(1L, endpoint.id());
        assertThat(projectService.listEndpoints(1L, group.id())).isEmpty();

        projectService.deleteGroup(1L, group.id());
        assertThat(projectService.listGroups(1L, module.id())).isEmpty();

        projectService.deleteModule(1L, module.id());
        assertThat(projectService.listModules(1L, project.id())).isEmpty();

        projectService.deleteEnvironment(1L, environment.id());
        assertThat(projectService.listEnvironments(1L, project.id())).isEmpty();
    }

    @Test
    void shouldPublishAndListEndpointMockReleases() {
        var project = projectService.createProject(1L, new CreateProjectRequest("Mock Publish", "mock-publish", "mock publish", java.util.List.of()));
        var module = projectService.createModule(1L, project.id(), new CreateModuleRequest("Core"));
        var group = projectService.createGroup(1L, module.id(), new CreateGroupRequest("User APIs"));
        var endpoint = projectService.createEndpoint(1L, group.id(), new CreateEndpointRequest(
                "Get User",
                "GET",
                "/users/{id}",
                "load user",
                true));

        projectService.replaceResponses(1L, endpoint.id(), java.util.List.of(
                new ResponseUpsertItem(200, "application/json", "userId", "string", true, "", "u_1001")));
        projectService.replaceMockRules(1L, endpoint.id(), java.util.List.of(
                new MockRuleUpsertItem(
                        "Unauthorized",
                        100,
                        true,
                        java.util.List.of(new MockConditionEntry("mode", "strict")),
                        java.util.List.of(new MockConditionEntry("x-scenario", "unauthorized")),
                        java.util.List.of(new MockBodyConditionEntry("$.user.id", "31")),
                        401,
                        "application/json",
                        "{\"error\":\"token expired\"}")));

        var firstRelease = projectService.publishMockRelease(1L, endpoint.id());
        var secondRelease = projectService.publishMockRelease(1L, endpoint.id());
        var releases = projectService.listMockReleases(1L, endpoint.id());

        assertThat(firstRelease.releaseNo()).isEqualTo(1);
        assertThat(secondRelease.releaseNo()).isEqualTo(2);
        assertThat(releases).extracting("releaseNo").containsExactly(2, 1);
        assertThat(releases.get(0).responseSnapshotJson()).contains("\"userId\"");
        assertThat(releases.get(0).rulesSnapshotJson()).contains("\"Unauthorized\"");
        assertThat(releases.get(0).rulesSnapshotJson()).contains("\"bodyConditions\"");
        assertThat(releases.get(0).rulesSnapshotJson()).contains("$.user.id");
    }

    @Test
    void shouldSimulateEndpointMockDraftThroughResolver() {
        var project = projectService.createProject(1L, new CreateProjectRequest("Mock Simulate", "mock-simulate", "mock simulate", java.util.List.of()));
        var module = projectService.createModule(1L, project.id(), new CreateModuleRequest("Core"));
        var group = projectService.createGroup(1L, module.id(), new CreateGroupRequest("User APIs"));
        var endpoint = projectService.createEndpoint(1L, group.id(), new CreateEndpointRequest(
                "Get User",
                "GET",
                "/users/{id}",
                "load user",
                true));

        MockSimulationResult result = projectService.simulateMock(1L, endpoint.id(), new MockSimulationRequest(
                java.util.List.of(new MockRuleUpsertItem(
                        "Unauthorized",
                        100,
                        true,
                        java.util.List.of(new MockConditionEntry("mode", "strict")),
                        java.util.List.of(new MockConditionEntry("x-scenario", "unauthorized")),
                        java.util.List.of(),
                        401,
                        "application/json",
                        "{\"error\":\"token expired\"}"
                )),
                java.util.List.of(new MockSimulationResponseItem(
                        200,
                        "application/json",
                        "userId",
                        "string",
                        true,
                        "",
                        "u_1001"
                )),
                java.util.List.of(new MockConditionEntry("mode", "strict")),
                java.util.List.of(new MockConditionEntry("x-scenario", "unauthorized")),
                ""
        ));

        assertThat(result.source()).isEqualTo("rule");
        assertThat(result.matchedRuleName()).isEqualTo("Unauthorized");
        assertThat(result.statusCode()).isEqualTo(401);
        assertThat(result.body()).isEqualTo("{\"error\":\"token expired\"}");
    }
}
