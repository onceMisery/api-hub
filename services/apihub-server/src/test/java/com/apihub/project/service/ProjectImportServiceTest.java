package com.apihub.project.service;

import com.apihub.doc.repository.EndpointRepository;
import com.apihub.project.model.ProjectDtos.ProjectDetail;
import com.apihub.project.model.ProjectImportDtos.ImportProjectRequest;
import com.apihub.project.model.ProjectImportDtos.ImportSpecRequest;
import com.apihub.project.repository.ProjectRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.jdbc.Sql;

import static org.assertj.core.api.Assertions.assertThat;

@JdbcTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:project-import-service;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
@Import({ProjectImportService.class, ProjectRepository.class, EndpointRepository.class})
@Sql(scripts = "/project-service-schema.sql")
@Sql(scripts = "/project-service-data.sql")
class ProjectImportServiceTest {

    private static final String OPENAPI_SAMPLE = """
            openapi: 3.0.3
            info:
              title: Pet Platform
              version: 1.0.0
            servers:
              - url: https://pet.local.dev/api
                description: Local Lab
            paths:
              /pets:
                get:
                  summary: List Pets
                  tags: [Pet APIs]
                  parameters:
                    - in: query
                      name: status
                      required: false
                      schema:
                        type: string
                  responses:
                    "200":
                      description: Pet list
                      content:
                        application/json:
                          schema:
                            type: object
                            properties:
                              items:
                                type: array
                              total:
                                type: integer
              /pets/{id}:
                get:
                  x-apihub-module: Animal Core
                  summary: Get Pet Detail
                  tags: [Pet APIs]
                  parameters:
                    - in: path
                      name: id
                      required: true
                      schema:
                        type: string
                  responses:
                    "200":
                      description: Pet detail
                      content:
                        application/json:
                          schema:
                            type: object
                            properties:
                              id:
                                type: string
                              nickname:
                                type: string
            """;

    private static final String OPENAPI_MERGE_SAMPLE = """
            {
              "openapi": "3.0.3",
              "info": { "title": "Default Project Merge", "version": "1.1.0" },
              "paths": {
                "/users/{id}": {
                  "get": {
                    "summary": "Get User Profile",
                    "tags": ["User APIs"],
                    "parameters": [
                      { "in": "path", "name": "id", "required": true, "schema": { "type": "string" } },
                      { "in": "query", "name": "verbose", "required": false, "schema": { "type": "boolean" } }
                    ],
                    "responses": {
                      "200": {
                        "description": "User detail",
                        "content": {
                          "application/json": {
                            "schema": {
                              "type": "object",
                              "properties": {
                                "userId": { "type": "string" },
                                "displayName": { "type": "string" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            """;

    private static final String SMARTDOC_SAMPLE = """
            [
              {
                "name": "Order Center",
                "module": "Commerce",
                "list": [
                  {
                    "name": "Create Order",
                    "url": "/orders",
                    "method": "POST",
                    "desc": "Create a new order",
                    "requestParams": [
                      { "field": "traceId", "type": "string", "required": false, "desc": "trace id" },
                      { "field": "customerId", "type": "string", "required": true, "desc": "customer id" }
                    ],
                    "responseParams": [
                      { "field": "orderId", "type": "string", "required": true, "desc": "order id" },
                      { "field": "status", "type": "string", "required": true, "desc": "status" }
                    ]
                  }
                ]
              }
            ]
            """;

    @Autowired
    private ProjectImportService projectImportService;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private EndpointRepository endpointRepository;

    @Test
    void shouldImportOpenApiAsProjectAndBootstrapEnvironment() {
        var result = projectImportService.importOpenApiAsProject(1L, 1L, new ImportProjectRequest(
                "pet-platform",
                "pet-platform",
                "Imported pet platform",
                "Pet Platform",
                "",
                OPENAPI_SAMPLE,
                true,
                true,
                true));

        assertThat(result.createdModules()).isEqualTo(2);
        assertThat(result.createdGroups()).isEqualTo(2);
        assertThat(result.createdEndpoints()).isEqualTo(2);
        assertThat(result.createdVersions()).isEqualTo(2);
        assertThat(result.createdEnvironments()).isEqualTo(1);

        ProjectDetail project = projectRepository.listProjects(1L).stream()
                .filter(item -> "pet-platform".equals(item.projectKey()))
                .findFirst()
                .orElseThrow();

        assertThat(project.id()).isEqualTo(result.projectId());
        assertThat(projectRepository.listModules(project.id())).extracting("name")
                .containsExactlyInAnyOrder("pets", "Animal Core");
        assertThat(projectRepository.listEnvironments(project.id())).extracting("name")
                .containsExactly("Local Lab");

        var petsModule = projectRepository.findModuleByProjectAndName(project.id(), "pets").orElseThrow();
        var petGroup = projectRepository.findGroupByModuleAndName(petsModule.id(), "Pet APIs").orElseThrow();
        var endpoint = endpointRepository.findEndpointByProjectAndRouteKey(project.id(), "GET:/pets").orElseThrow();

        assertThat(endpoint.name()).isEqualTo("List Pets");
        assertThat(endpoint.mockEnabled()).isTrue();
        assertThat(endpointRepository.listParameters(endpoint.id())).extracting("name").containsExactly("status");
        assertThat(endpointRepository.listResponses(endpoint.id())).extracting("name").containsExactly("items", "total");
        assertThat(endpointRepository.listEndpoints(petGroup.id())).extracting("name").contains("List Pets");
        assertThat(endpointRepository.listVersions(endpoint.id())).hasSize(1);
    }

    @Test
    void shouldMergeOpenApiIntoExistingProjectAndCreateNewVersion() {
        var result = projectImportService.importOpenApiToProject(1L, 1L, new ImportSpecRequest(
                "Default Project Merge",
                "",
                OPENAPI_MERGE_SAMPLE,
                true,
                false,
                true));

        var endpoint = endpointRepository.findEndpointByProjectAndRouteKey(1L, "GET:/users/{id}").orElseThrow();

        assertThat(result.updatedEndpoints()).isEqualTo(1);
        assertThat(result.createdEndpoints()).isZero();
        assertThat(result.createdVersions()).isEqualTo(1);
        assertThat(endpoint.name()).isEqualTo("Get User Profile");
        assertThat(endpoint.mockEnabled()).isTrue();
        assertThat(endpointRepository.listParameters(endpoint.id())).extracting("name").containsExactly("id", "verbose");
        assertThat(endpointRepository.listResponses(endpoint.id())).extracting("name").containsExactly("userId", "displayName");
        assertThat(endpointRepository.listVersions(endpoint.id())).hasSize(2);
    }

    @Test
    void shouldImportNativeSmartDocStructureIntoExistingProject() {
        var result = projectImportService.importSmartDocToProject(1L, 1L, new ImportSpecRequest(
                "Order Center",
                "",
                SMARTDOC_SAMPLE,
                false,
                false,
                true));

        var preview = projectImportService.previewSmartDocToProject(1L, 1L, new ImportSpecRequest(
                "Order Center",
                "",
                SMARTDOC_SAMPLE,
                false,
                false,
                true));

        var module = projectRepository.findModuleByProjectAndName(1L, "Commerce").orElseThrow();
        var group = projectRepository.findGroupByModuleAndName(module.id(), "Order Center").orElseThrow();
        var endpoint = endpointRepository.findEndpointByProjectAndRouteKey(1L, "POST:/orders").orElseThrow();

        assertThat(result.createdModules()).isEqualTo(1);
        assertThat(result.createdGroups()).isEqualTo(1);
        assertThat(result.createdEndpoints()).isEqualTo(1);
        assertThat(preview.totalEndpoints()).isEqualTo(1);
        assertThat(preview.routes()).containsExactly("POST:/orders");
        assertThat(endpointRepository.listEndpoints(group.id())).extracting("name").containsExactly("Create Order");
        assertThat(endpointRepository.listParameters(endpoint.id())).extracting("name").containsExactly("traceId", "customerId");
        assertThat(endpointRepository.listResponses(endpoint.id())).extracting("name").containsExactly("orderId", "status");
    }
}
