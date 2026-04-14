package com.apihub.doc.service;

import com.apihub.auth.repository.AuthUserRepository;
import com.apihub.debug.service.DebugTargetRuleValidator;
import com.apihub.doc.model.DocDtos.CreateEndpointRequest;
import com.apihub.doc.model.DocDtos.ParameterUpsertItem;
import com.apihub.doc.model.DocDtos.ResponseUpsertItem;
import com.apihub.doc.repository.EndpointRepository;
import com.apihub.mock.service.MockRuntimeResolver;
import com.apihub.project.model.ProjectDtos.CreateGroupRequest;
import com.apihub.project.model.ProjectDtos.CreateModuleRequest;
import com.apihub.project.model.ProjectDtos.CreateProjectRequest;
import com.apihub.project.model.ProjectDtos.CreateEnvironmentRequest;
import com.apihub.project.repository.ProjectRepository;
import com.apihub.project.service.ProjectService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.jdbc.Sql;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@JdbcTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:project-export-service;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
@Import({
        ProjectExportService.class,
        ProjectService.class,
        ProjectRepository.class,
        EndpointRepository.class,
        MockRuntimeResolver.class,
        DebugTargetRuleValidator.class,
        AuthUserRepository.class,
        VersionComparisonService.class
})
@Sql(scripts = "/project-service-schema.sql")
@Sql(scripts = "/project-service-data.sql")
class ProjectExportServiceTest {

    @Autowired
    private ProjectExportService projectExportService;

    @Autowired
    private ProjectService projectService;

    @Test
    void shouldExportProjectAsOpenApiAndMarkdown() {
        var project = projectService.createProject(1L, new CreateProjectRequest("Export Target", "export-target", "Export docs", List.of()));
        projectService.createEnvironment(1L, project.id(), new CreateEnvironmentRequest(
                "QA",
                "https://qa.example.com",
                true,
                List.of(),
                List.of(),
                List.of(),
                "none",
                "",
                "",
                "inherit",
                List.of()));
        var module = projectService.createModule(1L, project.id(), new CreateModuleRequest("Commerce"));
        var group = projectService.createGroup(1L, module.id(), new CreateGroupRequest("Order APIs"));
        var endpoint = projectService.createEndpoint(1L, group.id(), new CreateEndpointRequest("Create Order", "POST", "/orders", "Create a new order", true));
        projectService.replaceParameters(1L, endpoint.id(), List.of(
                new ParameterUpsertItem("body", "skuId", "string", true, "SKU id", "sku-1"),
                new ParameterUpsertItem("query", "preview", "boolean", false, "Preview only", "false")));
        projectService.replaceResponses(1L, endpoint.id(), List.of(
                new ResponseUpsertItem(200, "application/json", "orderId", "string", true, "Order id", "ord-1"),
                new ResponseUpsertItem(200, "application/json", "status", "string", true, "Order status", "created")));

        var openApi = projectExportService.exportOpenApi(1L, project.id());
        var markdown = projectExportService.exportMarkdown(1L, project.id());

        String openApiText = new String(openApi.content(), StandardCharsets.UTF_8);
        String markdownText = new String(markdown.content(), StandardCharsets.UTF_8);

        assertThat(openApi.fileName()).isEqualTo("export-target-openapi.json");
        assertThat(openApiText).contains("\"openapi\" : \"3.0.3\"");
        assertThat(openApiText).contains("/orders");
        assertThat(openApiText).contains("\"skuId\"");
        assertThat(openApiText).contains("https://qa.example.com");

        assertThat(markdown.fileName()).isEqualTo("export-target-docs.md");
        assertThat(markdownText).contains("# Export Target");
        assertThat(markdownText).contains("### Commerce");
        assertThat(markdownText).contains("#### Order APIs");
        assertThat(markdownText).contains("`POST /orders`");
        assertThat(markdownText).contains("SKU id");
        assertThat(markdownText).contains("orderId");
    }
}
