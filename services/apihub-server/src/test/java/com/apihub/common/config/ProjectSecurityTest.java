package com.apihub.common.config;

import com.apihub.auth.repository.AuthUserRepository;
import com.apihub.auth.service.JwtTokenService;
import com.apihub.debug.model.DebugDtos.DebugHeader;
import com.apihub.mock.web.MockController;
import com.apihub.project.model.ProjectDtos.ProjectDetail;
import com.apihub.project.model.ProjectDtos.ProjectTreeResponse;
import com.apihub.project.service.ProjectService;
import com.apihub.project.web.ProjectController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

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

    @MockBean
    private AuthUserRepository authUserRepository;

    @Test
    void shouldAllowBearerTokenForProtectedEndpoint() throws Exception {
        given(jwtTokenService.parseAccessTokenClaims("access-42")).willReturn(Optional.of(
                new JwtTokenService.AuthTokenClaims(42L, "admin", 3, "access")));
        given(authUserRepository.findActiveById(42L)).willReturn(Optional.of(
                new AuthUserRepository.UserCredential(42L, "admin", "Administrator", "hash", "active", 3)));
        given(projectService.listProjects(42L)).willReturn(List.of(
                new ProjectDetail(1L, "Default Project", "default", "Seed project", List.of())));

        mockMvc.perform(get("/api/v1/projects")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-42"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].projectKey").value("default"));
    }

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
    void shouldRejectProtectedEndpointWhenAccessTokenVersionIsStale() throws Exception {
        given(jwtTokenService.parseAccessTokenClaims("stale-access-42")).willReturn(Optional.of(
                new JwtTokenService.AuthTokenClaims(42L, "admin", 2, "access")));
        given(authUserRepository.findActiveById(42L)).willReturn(Optional.of(
                new AuthUserRepository.UserCredential(42L, "admin", "Administrator", "hash", "active", 3)));

        mockMvc.perform(get("/api/v1/projects")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer stale-access-42"))
                .andExpect(status().isUnauthorized());
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
