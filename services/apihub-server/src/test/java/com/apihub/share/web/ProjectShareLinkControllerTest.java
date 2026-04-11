package com.apihub.share.web;

import com.apihub.auth.repository.AuthUserRepository;
import com.apihub.auth.service.JwtTokenService;
import com.apihub.common.config.SecurityConfig;
import com.apihub.share.model.ProjectShareDtos.ProjectShareLinkDetail;
import com.apihub.share.service.ProjectShareLinkService;
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

@WebMvcTest(ProjectShareLinkController.class)
@Import(SecurityConfig.class)
class ProjectShareLinkControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProjectShareLinkService projectShareLinkService;

    @MockBean
    private JwtTokenService jwtTokenService;

    @MockBean
    private AuthUserRepository authUserRepository;

    @Test
    void shouldListProjectShareLinks() throws Exception {
        given(projectShareLinkService.listShareLinks(3L, 1L)).willReturn(List.of(
                new ProjectShareLinkDetail(1L, 1L, "active-share-code", "Public Docs", "Seed active share", true,
                        Instant.parse("2099-01-01T00:00:00Z"), Instant.parse("2026-04-11T10:00:00Z"), Instant.parse("2026-04-11T10:00:00Z"))));

        mockMvc.perform(get("/api/v1/projects/1/share-links")
                        .with(authentication(new UsernamePasswordAuthenticationToken(3L, "token", List.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].shareCode").value("active-share-code"));
    }

    @Test
    void shouldCreateProjectShareLink() throws Exception {
        given(projectShareLinkService.createShareLink(eq(3L), eq(1L), any())).willReturn(
                new ProjectShareLinkDetail(4L, 1L, "new-share-code", "New Docs", "Created", true,
                        Instant.parse("2099-05-01T00:00:00Z"), Instant.parse("2026-04-11T10:10:00Z"), Instant.parse("2026-04-11T10:10:00Z")));

        mockMvc.perform(post("/api/v1/projects/1/share-links")
                        .with(authentication(new UsernamePasswordAuthenticationToken(3L, "token", List.of())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "New Docs",
                                  "description": "Created",
                                  "enabled": true,
                                  "expiresAt": "2099-05-01T00:00:00Z"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.shareCode").value("new-share-code"));
    }

    @Test
    void shouldUpdateProjectShareLink() throws Exception {
        given(projectShareLinkService.updateShareLink(eq(3L), eq(1L), eq(1L), any())).willReturn(
                new ProjectShareLinkDetail(1L, 1L, "active-share-code", "Renamed", "Updated", false,
                        Instant.parse("2099-06-01T00:00:00Z"), Instant.parse("2026-04-11T10:00:00Z"), Instant.parse("2026-04-11T10:20:00Z")));

        mockMvc.perform(patch("/api/v1/projects/1/share-links/1")
                        .with(authentication(new UsernamePasswordAuthenticationToken(3L, "token", List.of())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Renamed",
                                  "description": "Updated",
                                  "enabled": false,
                                  "expiresAt": "2099-06-01T00:00:00Z"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.enabled").value(false));
    }
}
