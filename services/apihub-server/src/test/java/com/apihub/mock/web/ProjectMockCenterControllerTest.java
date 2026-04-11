package com.apihub.mock.web;

import com.apihub.auth.repository.AuthUserRepository;
import com.apihub.auth.service.JwtTokenService;
import com.apihub.common.config.SecurityConfig;
import com.apihub.mock.model.ProjectMockDtos.MockAccessMode;
import com.apihub.mock.model.ProjectMockDtos.MockAccessSettings;
import com.apihub.mock.model.ProjectMockDtos.MockCenterItem;
import com.apihub.mock.model.ProjectMockDtos.ProjectMockCenterResponse;
import com.apihub.mock.service.ProjectMockCenterService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProjectMockCenterController.class)
@Import(SecurityConfig.class)
class ProjectMockCenterControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProjectMockCenterService projectMockCenterService;

    @MockBean
    private JwtTokenService jwtTokenService;

    @MockBean
    private AuthUserRepository authUserRepository;

    @Test
    void shouldGetProjectMockCenter() throws Exception {
        given(projectMockCenterService.getMockCenter(3L, 1L)).willReturn(new ProjectMockCenterResponse(
                new MockAccessSettings(1L, MockAccessMode.TOKEN, "mock-token"),
                List.of(new MockCenterItem(1L, "Get User", "GET", "/users/{id}", "Core", "User APIs",
                        true, 2, Instant.parse("2026-04-11T10:00:00Z"), false, 3, 2, 4))));

        mockMvc.perform(get("/api/v1/projects/1/mock-center")
                        .with(authentication(new UsernamePasswordAuthenticationToken(3L, "token", List.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.settings.mode").value("token"))
                .andExpect(jsonPath("$.data.items[0].latestReleaseNo").value(2));
    }

    @Test
    void shouldPatchProjectMockAccess() throws Exception {
        given(projectMockCenterService.updateMockAccess(eq(3L), eq(1L), any())).willReturn(
                new MockAccessSettings(1L, MockAccessMode.PUBLIC, "mock-token"));

        mockMvc.perform(patch("/api/v1/projects/1/mock-access")
                        .with(authentication(new UsernamePasswordAuthenticationToken(3L, "token", List.of())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "mode": "public",
                                  "token": "mock-token"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.mode").value("public"));
    }

    @Test
    void shouldPublishProjectMockCenterEndpoint() throws Exception {
        given(projectMockCenterService.publishEndpoint(3L, 1L, 1L)).willReturn(
                new com.apihub.mock.model.MockDtos.MockReleaseDetail(5L, 1L, 3, "[]", "[]", Instant.parse("2026-04-11T10:00:00Z")));

        mockMvc.perform(post("/api/v1/projects/1/mock-center/endpoints/1/publish")
                        .with(authentication(new UsernamePasswordAuthenticationToken(3L, "token", List.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.releaseNo").value(3));
    }
}
