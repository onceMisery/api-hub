package com.apihub.project.web;

import com.apihub.auth.repository.AuthUserRepository;
import com.apihub.auth.service.JwtTokenService;
import com.apihub.common.config.SecurityConfig;
import com.apihub.project.model.ProjectImportDtos.ImportProjectRequest;
import com.apihub.project.model.ProjectImportDtos.ImportResult;
import com.apihub.project.model.ProjectImportDtos.ImportSpecRequest;
import com.apihub.project.service.ProjectImportService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProjectImportController.class)
@Import(SecurityConfig.class)
class ProjectImportControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProjectImportService projectImportService;

    @MockBean
    private JwtTokenService jwtTokenService;

    @MockBean
    private AuthUserRepository authUserRepository;

    @Test
    void shouldImportOpenApiIntoExistingProject() throws Exception {
        given(projectImportService.importOpenApiToProject(1L, 9L, new ImportSpecRequest("Demo", "", "{\"openapi\":\"3.0.3\",\"paths\":{}}", true, false, true)))
                .willReturn(new ImportResult(9L, "Demo", "openapi", 1, 1, 1, 0, 1, 0, List.of()));

        mockMvc.perform(post("/api/v1/projects/9/imports/openapi")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of())))
                        .contentType("application/json")
                        .content("""
                                {
                                  "sourceName": "Demo",
                                  "sourceUrl": "",
                                  "content": "{\\"openapi\\":\\"3.0.3\\",\\"paths\\":{}}",
                                  "createVersionSnapshot": true,
                                  "bootstrapEnvironments": false,
                                  "enableMockByDefault": true
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sourceType").value("openapi"))
                .andExpect(jsonPath("$.data.createdEndpoints").value(1));

        verify(projectImportService).importOpenApiToProject(1L, 9L, new ImportSpecRequest("Demo", "", "{\"openapi\":\"3.0.3\",\"paths\":{}}", true, false, true));
    }

    @Test
    void shouldImportSmartDocAsNewProjectInSpace() throws Exception {
        given(projectImportService.importSmartDocAsProject(1L, 5L, new ImportProjectRequest(
                "Order Center",
                "order-center",
                "Commerce system",
                "Order Center",
                "",
                "[]",
                false,
                false,
                true)))
                .willReturn(new ImportResult(22L, "Order Center", "smartdoc", 1, 1, 1, 0, 0, 0, List.of()));

        mockMvc.perform(post("/api/v1/spaces/5/imports/smartdoc-project")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of())))
                        .contentType("application/json")
                        .content("""
                                {
                                  "projectName": "Order Center",
                                  "projectKey": "order-center",
                                  "description": "Commerce system",
                                  "sourceName": "Order Center",
                                  "sourceUrl": "",
                                  "content": "[]",
                                  "createVersionSnapshot": false,
                                  "bootstrapEnvironments": false,
                                  "enableMockByDefault": true
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.projectId").value(22))
                .andExpect(jsonPath("$.data.sourceType").value("smartdoc"));

        verify(projectImportService).importSmartDocAsProject(1L, 5L, new ImportProjectRequest(
                "Order Center",
                "order-center",
                "Commerce system",
                "Order Center",
                "",
                "[]",
                false,
                false,
                true));
    }

    @Test
    void shouldPreviewImportIntoExistingProject() throws Exception {
        given(projectImportService.previewOpenApiToProject(1L, 7L, new ImportSpecRequest("Demo", "https://example.com/openapi.json", "", true, false, true)))
                .willReturn(new com.apihub.project.model.ProjectImportDtos.ImportPreview(
                        "openapi",
                        "Demo",
                        12,
                        2,
                        4,
                        8,
                        4,
                        1,
                        List.of("Core", "Admin"),
                        List.of("User APIs", "Admin APIs"),
                        List.of("GET:/users", "POST:/users"),
                        List.of()));

        mockMvc.perform(post("/api/v1/projects/7/imports/openapi/preview")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of())))
                        .contentType("application/json")
                        .content("""
                                {
                                  "sourceName": "Demo",
                                  "sourceUrl": "https://example.com/openapi.json",
                                  "content": "",
                                  "createVersionSnapshot": true,
                                  "bootstrapEnvironments": false,
                                  "enableMockByDefault": true
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalEndpoints").value(12))
                .andExpect(jsonPath("$.data.createdEndpoints").value(8));
    }
}
