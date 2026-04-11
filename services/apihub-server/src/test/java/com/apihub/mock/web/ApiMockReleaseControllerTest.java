package com.apihub.mock.web;

import com.apihub.auth.repository.AuthUserRepository;
import com.apihub.auth.service.JwtTokenService;
import com.apihub.common.config.SecurityConfig;
import com.apihub.mock.model.MockDtos.MockReleaseDetail;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ApiMockReleaseController.class)
@Import(SecurityConfig.class)
class ApiMockReleaseControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProjectService projectService;

    @MockBean
    private JwtTokenService jwtTokenService;

    @MockBean
    private AuthUserRepository authUserRepository;

    @Test
    void shouldListEndpointMockReleases() throws Exception {
        given(projectService.listMockReleases(1L, 31L)).willReturn(List.of(
                new MockReleaseDetail(
                        5L,
                        31L,
                        2,
                        "[]",
                        "[]",
                        Instant.parse("2026-04-09T12:00:00Z")
                )));

        mockMvc.perform(get("/api/v1/endpoints/31/mock-releases")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].releaseNo").value(2));
    }

    @Test
    void shouldPublishMockRelease() throws Exception {
        given(projectService.publishMockRelease(1L, 31L)).willReturn(
                new MockReleaseDetail(
                        6L,
                        31L,
                        3,
                        "[]",
                        "[]",
                        Instant.parse("2026-04-09T12:05:00Z")
                ));

        mockMvc.perform(post("/api/v1/endpoints/31/mock-releases")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.releaseNo").value(3));
    }
}
