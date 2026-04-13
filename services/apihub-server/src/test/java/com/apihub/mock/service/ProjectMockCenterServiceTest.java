package com.apihub.mock.service;

import com.apihub.auth.repository.AuthUserRepository;
import com.apihub.debug.service.DebugTargetRuleValidator;
import com.apihub.doc.model.DocDtos.CreateEndpointRequest;
import com.apihub.doc.model.DocDtos.ResponseUpsertItem;
import com.apihub.doc.repository.EndpointRepository;
import com.apihub.doc.service.VersionComparisonService;
import com.apihub.mock.model.ProjectMockDtos.MockAccessMode;
import com.apihub.mock.model.ProjectMockDtos.UpdateProjectMockAccessRequest;
import com.apihub.mock.repository.ProjectMockAccessRepository;
import com.apihub.project.model.ProjectDtos.CreateGroupRequest;
import com.apihub.project.model.ProjectDtos.CreateModuleRequest;
import com.apihub.project.model.ProjectDtos.CreateProjectRequest;
import com.apihub.project.repository.ProjectRepository;
import com.apihub.project.service.ProjectService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@JdbcTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:mock-center-service;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
@Import({
        ProjectMockCenterService.class,
        ProjectMockAccessRepository.class,
        ProjectRepository.class,
        EndpointRepository.class,
        ProjectService.class,
        VersionComparisonService.class,
        MockRuntimeResolver.class,
        DebugTargetRuleValidator.class,
        AuthUserRepository.class
})
@Sql(scripts = "/project-service-schema.sql")
@Sql(scripts = "/project-service-data.sql")
class ProjectMockCenterServiceTest {

    @Autowired
    private ProjectMockCenterService projectMockCenterService;

    @Autowired
    private ProjectService projectService;

    @Test
    void shouldSummarizeMockCenterAndDetectDraftChanges() {
        var project = projectService.createProject(1L, new CreateProjectRequest("Center", "center", "center", List.of()));
        var module = projectService.createModule(1L, project.id(), new CreateModuleRequest("Core"));
        var group = projectService.createGroup(1L, module.id(), new CreateGroupRequest("User APIs"));
        var endpoint = projectService.createEndpoint(1L, group.id(), new CreateEndpointRequest(
                "Get User",
                "GET",
                "/users/{id}",
                "load user",
                true));
        projectService.replaceResponses(1L, endpoint.id(), List.of(
                new ResponseUpsertItem(200, "application/json", "userId", "string", true, "User id", "u_1001")));
        projectMockCenterService.publishEndpoint(1L, project.id(), endpoint.id());
        projectService.replaceResponses(1L, endpoint.id(), List.of(
                new ResponseUpsertItem(200, "application/json", "userId", "string", true, "User id", "u_1002")));

        var center = projectMockCenterService.getMockCenter(1L, project.id());

        assertThat(center.settings().mode()).isEqualTo(MockAccessMode.PRIVATE);
        assertThat(center.items()).singleElement()
                .extracting("endpointName", "latestReleaseNo", "draftChanged", "responseFieldCount")
                .containsExactly("Get User", 1, true, 1);
    }

    @Test
    void shouldRejectViewerUpdatingMockAccessOrPublishingMockCenterEndpoint() {
        assertThatThrownBy(() -> projectMockCenterService.updateMockAccess(2L, 1L,
                new UpdateProjectMockAccessRequest(MockAccessMode.PUBLIC, "ignored", false)))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);

        assertThatThrownBy(() -> projectMockCenterService.publishEndpoint(2L, 1L, 1L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void shouldRegenerateMockAccessTokenWhenRequested() {
        var before = projectMockCenterService.getMockCenter(1L, 1L);

        var updated = projectMockCenterService.updateMockAccess(1L, 1L,
                new UpdateProjectMockAccessRequest(MockAccessMode.TOKEN, null, true));

        assertThat(updated.mode()).isEqualTo(MockAccessMode.TOKEN);
        assertThat(updated.token()).isNotBlank();
        assertThat(updated.token()).isNotEqualTo(before.settings().token());
    }
}
