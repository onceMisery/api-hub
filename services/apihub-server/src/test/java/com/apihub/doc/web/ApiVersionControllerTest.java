package com.apihub.doc.web;

import com.apihub.auth.repository.AuthUserRepository;
import com.apihub.auth.service.JwtTokenService;
import com.apihub.common.config.SecurityConfig;
import com.apihub.doc.model.EndpointDetail;
import com.apihub.project.service.ProjectService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ApiVersionController.class)
@Import(SecurityConfig.class)
class ApiVersionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProjectService projectService;

    @MockBean
    private JwtTokenService jwtTokenService;

    @MockBean
    private AuthUserRepository authUserRepository;

    @Test
    void shouldReleaseEndpointVersion() throws Exception {
        given(projectService.releaseVersion(1L, 31L, 7L)).willReturn(
                new EndpointDetail(
                        31L,
                        21L,
                        "Get User",
                        "GET",
                        "/users/{id}",
                        "Load user",
                        false,
                        "released",
                        7L,
                        "v2",
                        Instant.parse("2026-04-11T10:00:00Z")));

        mockMvc.perform(post("/api/v1/endpoints/31/versions/7/release")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("released"))
                .andExpect(jsonPath("$.data.releasedVersionId").value(7))
                .andExpect(jsonPath("$.data.releasedVersionLabel").value("v2"));
    }

    @Test
    void shouldReturnEndpointToDraftLane() throws Exception {
        given(projectService.clearEndpointRelease(1L, 31L)).willReturn(
                new EndpointDetail(
                        31L,
                        21L,
                        "Get User",
                        "GET",
                        "/users/{id}",
                        "Load user",
                        false,
                        "draft",
                        null,
                        null,
                        null));

        mockMvc.perform(delete("/api/v1/endpoints/31/release")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("draft"))
                .andExpect(jsonPath("$.data.releasedVersionId").doesNotExist());
    }
}
