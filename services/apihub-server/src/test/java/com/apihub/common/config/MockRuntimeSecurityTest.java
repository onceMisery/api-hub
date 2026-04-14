package com.apihub.common.config;

import com.apihub.auth.repository.AuthUserRepository;
import com.apihub.auth.service.JwtTokenService;
import com.apihub.debug.model.DebugDtos.DebugHeader;
import com.apihub.mock.model.ProjectMockDtos.MockAccessMode;
import com.apihub.mock.model.ProjectMockDtos.MockAccessSettings;
import com.apihub.mock.repository.ProjectMockAccessRepository;
import com.apihub.mock.security.MockRuntimeAccessEvaluator;
import com.apihub.mock.security.MockRuntimeAuthorizationManager;
import com.apihub.mock.web.MockController;
import com.apihub.project.repository.ProjectRepository;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MockController.class)
@Import({SecurityConfig.class, MockRuntimeAuthorizationManager.class, MockRuntimeAccessEvaluator.class})
class MockRuntimeSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private com.apihub.mock.service.MockService mockService;

    @MockBean
    private JwtTokenService jwtTokenService;

    @MockBean
    private AuthUserRepository authUserRepository;

    @MockBean
    private ProjectMockAccessRepository projectMockAccessRepository;

    @MockBean
    private ProjectRepository projectRepository;

    @Test
    void shouldRequireBearerAccessForPrivateMode() throws Exception {
        given(projectMockAccessRepository.findByProjectId(1L)).willReturn(Optional.of(
                new MockAccessSettings(1L, MockAccessMode.PRIVATE, "private-token")));
        given(jwtTokenService.parseAccessTokenClaims("access-42")).willReturn(Optional.of(
                new JwtTokenService.AuthTokenClaims(42L, "admin", 3, "access")));
        given(authUserRepository.findActiveById(42L)).willReturn(Optional.of(
                new AuthUserRepository.UserCredential(42L, "admin", "Administrator", "hash", "active", 3)));
        given(projectRepository.canAccessProject(42L, 1L)).willReturn(true);
        given(mockService.resolve(1L, "GET", "/users/31", Map.of(), Map.of("authorization", "Bearer access-42"), ""))
                .willReturn(new com.apihub.mock.service.MockService.MockResponse(
                        200, List.of(new DebugHeader("Content-Type", "application/json")), "{\"ok\":true}", 0));

        mockMvc.perform(get("/mock/1/users/31"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/mock/1/users/31")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-42"))
                .andExpect(status().isOk());
    }

    @Test
    void shouldAllowTokenModeWithMockTokenHeader() throws Exception {
        given(projectMockAccessRepository.findByProjectId(1L)).willReturn(Optional.of(
                new MockAccessSettings(1L, MockAccessMode.TOKEN, "token-mode-secret")));
        given(mockService.resolve(1L, "GET", "/users/31", Map.of(), Map.of("x-apihub-mock-token", "token-mode-secret"), ""))
                .willReturn(new com.apihub.mock.service.MockService.MockResponse(
                        200, List.of(new DebugHeader("Content-Type", "application/json")), "{\"ok\":true}", 0));

        mockMvc.perform(get("/mock/1/users/31")
                        .header("X-ApiHub-Mock-Token", "token-mode-secret"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/mock/1/users/31")
                        .header("X-ApiHub-Mock-Token", "wrong-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldAllowAnonymousAccessForPublicMode() throws Exception {
        given(projectMockAccessRepository.findByProjectId(1L)).willReturn(Optional.of(
                new MockAccessSettings(1L, MockAccessMode.PUBLIC, "public-token")));
        given(mockService.resolve(1L, "GET", "/users/31", Map.of(), Map.of(), ""))
                .willReturn(new com.apihub.mock.service.MockService.MockResponse(
                        200, List.of(new DebugHeader("Content-Type", "application/json")), "{\"ok\":true}", 0));

        mockMvc.perform(get("/mock/1/users/31"))
                .andExpect(status().isOk());
    }

    @Test
    void shouldReturnUnauthorizedWhenBearerUserLacksProjectAccess() throws Exception {
        given(projectMockAccessRepository.findByProjectId(1L)).willReturn(Optional.of(
                new MockAccessSettings(1L, MockAccessMode.PRIVATE, "private-token")));
        given(jwtTokenService.parseAccessTokenClaims("access-77")).willReturn(Optional.of(
                new JwtTokenService.AuthTokenClaims(77L, "outsider", 1, "access")));
        given(authUserRepository.findActiveById(77L)).willReturn(Optional.of(
                new AuthUserRepository.UserCredential(77L, "outsider", "Outsider", "hash", "active", 1)));
        given(projectRepository.canAccessProject(77L, 1L)).willReturn(false);

        mockMvc.perform(get("/mock/1/users/31")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-77"))
                .andExpect(status().isUnauthorized());
    }
}
