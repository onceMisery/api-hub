package com.apihub.project.service;

import com.apihub.doc.model.DocDtos.CreateEndpointRequest;
import com.apihub.doc.model.DocDtos.CreateVersionRequest;
import com.apihub.doc.model.DocDtos.UpdateEndpointRequest;
import com.apihub.project.model.ProjectDtos.CreateGroupRequest;
import com.apihub.project.model.ProjectDtos.CreateModuleRequest;
import com.apihub.project.model.ProjectDtos.CreateProjectRequest;
import com.apihub.project.model.ProjectDtos.UpdateProjectRequest;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ProjectServiceTest {

    private final ProjectService projectService = new ProjectService();

    @Test
    void shouldCompleteProjectModuleGroupEndpointVersionFlow() {
        var project = projectService.createProject(new CreateProjectRequest("Demo", "demo", "first project"));
        var updatedProject = projectService.updateProject(project.id(), new UpdateProjectRequest("Demo Updated", "desc"));
        var module = projectService.createModule(project.id(), new CreateModuleRequest("Core"));
        var group = projectService.createGroup(module.id(), new CreateGroupRequest("User APIs"));
        var endpoint = projectService.createEndpoint(group.id(), new CreateEndpointRequest(
                "Get User",
                "GET",
                "/users/{id}",
                "load user"));
        var updatedEndpoint = projectService.updateEndpoint(endpoint.id(), new UpdateEndpointRequest(
                "Get User Detail",
                "GET",
                "/users/{id}",
                "load detailed user"));
        var version = projectService.createVersion(endpoint.id(), new CreateVersionRequest(
                "v1",
                "initial",
                "{\"path\":\"/users/{id}\"}"));

        assertThat(updatedProject.name()).isEqualTo("Demo Updated");
        assertThat(projectService.getProject(project.id()).projectKey()).isEqualTo("demo");
        assertThat(projectService.listModules(project.id())).extracting("name").containsExactly("Core");
        assertThat(projectService.listGroups(module.id())).extracting("name").containsExactly("User APIs");
        assertThat(projectService.listEndpoints(group.id())).extracting("name").containsExactly("Get User Detail");
        assertThat(projectService.getEndpoint(endpoint.id()).description()).isEqualTo("load detailed user");
        assertThat(projectService.listVersions(endpoint.id())).extracting("version").containsExactly("v1");
        assertThat(version.changeSummary()).isEqualTo("initial");
        assertThat(projectService.getProjectTree(project.id()).modules()).hasSize(1);
    }
}
