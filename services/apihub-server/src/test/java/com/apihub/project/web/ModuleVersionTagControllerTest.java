package com.apihub.project.web;

import com.apihub.auth.repository.AuthUserRepository;
import com.apihub.auth.service.JwtTokenService;
import com.apihub.common.config.SecurityConfig;
import com.apihub.project.model.ProjectDtos.ModuleVersionTagDetail;
import com.apihub.project.model.ProjectDtos.ModuleVersionTagEndpointSnapshot;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ModuleVersionTagController.class)
@Import(SecurityConfig.class)
class ModuleVersionTagControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProjectService projectService;

    @MockBean
    private JwtTokenService jwtTokenService;

    @MockBean
    private AuthUserRepository authUserRepository;

    @Test
    void shouldListModuleVersionTags() throws Exception {
        given(projectService.listModuleVersionTags(1L, 8L)).willReturn(List.of(
                new ModuleVersionTagDetail(
                        3L,
                        8L,
                        "v2.0.0-release",
                        "Freeze module",
                        2,
                        1,
                        List.of(new ModuleVersionTagEndpointSnapshot(
                                31L,
                                "Get User",
                                "GET",
                                "/users/{id}",
                                "User APIs",
                                7L,
                                "v2",
                                Instant.parse("2026-04-15T10:00:00Z"))),
                        Instant.parse("2026-04-15T10:05:00Z"))));

        mockMvc.perform(get("/api/v1/modules/8/version-tags")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].tagName").value("v2.0.0-release"))
                .andExpect(jsonPath("$.data[0].endpointCount").value(2))
                .andExpect(jsonPath("$.data[0].endpoints[0].releasedVersionLabel").value("v2"));
    }

    @Test
    void shouldCreateModuleVersionTag() throws Exception {
        given(projectService.createModuleVersionTag(org.mockito.ArgumentMatchers.eq(1L), org.mockito.ArgumentMatchers.eq(8L), any()))
                .willReturn(new ModuleVersionTagDetail(
                        4L,
                        8L,
                        "v2.0.1-hotfix",
                        "Hotfix freeze",
                        1,
                        1,
                        List.of(),
                        Instant.parse("2026-04-15T11:00:00Z")));

        mockMvc.perform(post("/api/v1/modules/8/version-tags")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of())))
                        .contentType("application/json")
                        .content("""
                                {
                                  "tagName": "v2.0.1-hotfix",
                                  "description": "Hotfix freeze"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tagName").value("v2.0.1-hotfix"))
                .andExpect(jsonPath("$.data.releasedEndpointCount").value(1));
    }
}
