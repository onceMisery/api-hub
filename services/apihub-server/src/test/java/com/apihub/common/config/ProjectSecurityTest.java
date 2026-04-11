package com.apihub.common.config;

import com.apihub.auth.service.JwtTokenService;
import com.apihub.debug.model.DebugDtos.DebugHeader;
import com.apihub.mock.web.MockController;
import com.apihub.project.model.ProjectDtos.ProjectDetail;
import com.apihub.project.service.ProjectService;
import com.apihub.project.web.ProjectController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({ProjectController.class, MockController.class})
@Import(SecurityConfig.class)
class ProjectSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProjectService projectService;

    @MockBean
    private com.apihub.mock.service.MockService mockService;

    @MockBean
    private JwtTokenService jwtTokenService;

    @Test
    void shouldAllowBearerTokenForProtectedEndpoint() throws Exception {
        given(jwtTokenService.parseAccessToken("access-42")).willReturn(Optional.of(42L));
        given(projectService.listProjects()).willReturn(List.of(
                new ProjectDetail(1L, "Default Project", "default", "Seed project", List.of())));

        mockMvc.perform(get("/api/v1/projects")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-42"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].projectKey").value("default"));
    }

    @Test
    void shouldRejectProtectedEndpointWithoutBearerToken() throws Exception {
        mockMvc.perform(get("/api/v1/projects"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldAllowPublicMockEndpointWithoutBearerToken() throws Exception {
        given(mockService.resolve(1L, "GET", "/users/31", Map.of(), Map.of(), ""))
                .willReturn(new com.apihub.mock.service.MockService.MockResponse(
                        200,
                        List.of(new DebugHeader("Content-Type", "application/json")),
                        "{\"ok\":true}"));

        mockMvc.perform(get("/mock/1/users/31"))
                .andExpect(status().isOk());
    }
}
