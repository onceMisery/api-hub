package com.apihub.project.service;

import com.apihub.doc.model.DocDtos.CreateEndpointRequest;
import com.apihub.doc.model.DocDtos.ParameterUpsertItem;
import com.apihub.doc.model.DocDtos.ResponseUpsertItem;
import com.apihub.doc.model.DocDtos.CreateVersionRequest;
import com.apihub.doc.model.DocDtos.UpdateEndpointRequest;
import com.apihub.project.model.ProjectDtos.CreateEnvironmentRequest;
import com.apihub.project.model.ProjectDtos.EnvironmentEntry;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.jdbc.Sql;

import static org.assertj.core.api.Assertions.assertThat;

@JdbcTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:project-service;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
@Import({ProjectService.class, ProjectRepository.class, EndpointRepository.class})
@Sql(scripts = "/project-service-schema.sql")
@Sql(scripts = "/project-service-data.sql")
class ProjectServiceTest {

    @Autowired
    private ProjectService projectService;

    @Test
    void shouldCompleteProjectModuleGroupEndpointVersionFlowAgainstDatabase() {
        assertThat(projectService.listProjects()).extracting("projectKey").contains("default");

        var project = projectService.createProject(new CreateProjectRequest("Demo", "demo", "first project"));
        var updatedProject = projectService.updateProject(project.id(), new UpdateProjectRequest("Demo Updated", "desc"));
        var environment = projectService.createEnvironment(project.id(), new CreateEnvironmentRequest(
                "Local",
                "https://local.dev",
                true,
                java.util.List.of(new EnvironmentEntry("token", "dev-token")),
                java.util.List.of(new EnvironmentEntry("Authorization", "Bearer {{token}}"))));
        var updatedEnvironment = projectService.updateEnvironment(environment.id(), new UpdateEnvironmentRequest(
                "Staging",
                "https://staging.dev",
                true,
                java.util.List.of(new EnvironmentEntry("token", "staging-token")),
                java.util.List.of(new EnvironmentEntry("X-App", "apihub"))));
        var module = projectService.createModule(project.id(), new CreateModuleRequest("Core"));
        var group = projectService.createGroup(module.id(), new CreateGroupRequest("User APIs"));
        var endpoint = projectService.createEndpoint(group.id(), new CreateEndpointRequest(
                "Get User",
                "GET",
                "/users/{id}",
                "load user"));
        var renamedModule = projectService.updateModule(module.id(), new UpdateModuleRequest("Core Services"));
        var renamedGroup = projectService.updateGroup(group.id(), new UpdateGroupRequest("User Management"));
        var updatedEndpoint = projectService.updateEndpoint(endpoint.id(), new UpdateEndpointRequest(
                "Get User Detail",
                "GET",
                "/users/{id}",
                "load detailed user"));
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
        projectService.replaceParameters(endpoint.id(), java.util.List.of(parameter));
        projectService.replaceResponses(endpoint.id(), java.util.List.of(response));
        var version = projectService.createVersion(endpoint.id(), new CreateVersionRequest(
                "v1",
                "initial",
                "{\"path\":\"/users/{id}\"}"));

        assertThat(updatedProject.name()).isEqualTo("Demo Updated");
        assertThat(environment.name()).isEqualTo("Local");
        assertThat(updatedEnvironment.baseUrl()).isEqualTo("https://staging.dev");
        assertThat(updatedEnvironment.variables()).containsExactly(new EnvironmentEntry("token", "staging-token"));
        assertThat(updatedEnvironment.defaultHeaders()).containsExactly(new EnvironmentEntry("X-App", "apihub"));
        assertThat(projectService.listEnvironments(project.id())).extracting("name").containsExactly("Staging");
        assertThat(renamedModule.name()).isEqualTo("Core Services");
        assertThat(renamedGroup.name()).isEqualTo("User Management");
        assertThat(projectService.getProject(project.id()).projectKey()).isEqualTo("demo");
        assertThat(projectService.listModules(project.id())).extracting("name").containsExactly("Core Services");
        assertThat(projectService.listGroups(module.id())).extracting("name").containsExactly("User Management");
        assertThat(projectService.listEndpoints(group.id())).extracting("name").containsExactly("Get User Detail");
        assertThat(updatedEndpoint.description()).isEqualTo("load detailed user");
        assertThat(projectService.getEndpoint(endpoint.id()).description()).isEqualTo("load detailed user");
        assertThat(projectService.listParameters(endpoint.id())).singleElement().extracting("name").isEqualTo("id");
        assertThat(projectService.listResponses(endpoint.id())).singleElement().extracting("name").isEqualTo("userId");
        assertThat(projectService.listVersions(endpoint.id())).extracting("version").containsExactly("v1");
        assertThat(version.changeSummary()).isEqualTo("initial");
        assertThat(projectService.getProjectTree(project.id()).modules()).hasSize(1);
    }

    @Test
    void shouldDeleteEndpointGroupAndModule() {
        var project = projectService.createProject(new CreateProjectRequest("Cleanup", "cleanup", "cleanup project"));
        var environment = projectService.createEnvironment(project.id(), new CreateEnvironmentRequest(
                "Local",
                "https://cleanup.dev",
                false,
                java.util.List.of(),
                java.util.List.of()));
        var module = projectService.createModule(project.id(), new CreateModuleRequest("Legacy"));
        var group = projectService.createGroup(module.id(), new CreateGroupRequest("Deprecated"));
        var endpoint = projectService.createEndpoint(group.id(), new CreateEndpointRequest(
                "Delete Me",
                "DELETE",
                "/legacy",
                "remove soon"));

        projectService.deleteEndpoint(endpoint.id());
        assertThat(projectService.listEndpoints(group.id())).isEmpty();

        projectService.deleteGroup(group.id());
        assertThat(projectService.listGroups(module.id())).isEmpty();

        projectService.deleteModule(module.id());
        assertThat(projectService.listModules(project.id())).isEmpty();

        projectService.deleteEnvironment(environment.id());
        assertThat(projectService.listEnvironments(project.id())).isEmpty();
    }
}
