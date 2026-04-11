package com.apihub.share.web;

import com.apihub.auth.repository.AuthUserRepository;
import com.apihub.auth.service.JwtTokenService;
import com.apihub.common.config.SecurityConfig;
import com.apihub.mock.model.MockDtos.MockReleaseDetail;
import com.apihub.project.model.ProjectDtos.EndpointTreeItem;
import com.apihub.project.model.ProjectDtos.GroupTreeItem;
import com.apihub.project.model.ProjectDtos.ModuleTreeItem;
import com.apihub.project.model.ProjectDtos.ProjectTreeResponse;
import com.apihub.share.model.ProjectShareDtos.ProjectShareLinkDetail;
import com.apihub.share.model.ProjectShareDtos.PublicShareEndpointDetailResponse;
import com.apihub.share.model.ProjectShareDtos.PublicShareOverviewResponse;
import com.apihub.share.model.ProjectShareDtos.PublicSharedProjectSummary;
import com.apihub.share.service.PublicProjectShareService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PublicProjectShareController.class)
@Import(SecurityConfig.class)
class PublicProjectShareControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PublicProjectShareService publicProjectShareService;

    @MockBean
    private JwtTokenService jwtTokenService;

    @MockBean
    private AuthUserRepository authUserRepository;

    @Test
    void shouldReadShareOverviewWithoutAuthentication() throws Exception {
        given(publicProjectShareService.getShareOverview("active-share-code")).willReturn(
                new PublicShareOverviewResponse(
                        new ProjectShareLinkDetail(1L, 1L, "active-share-code", "Public Docs", "Seed active share", true,
                                Instant.parse("2099-01-01T00:00:00Z"), Instant.parse("2026-04-11T10:00:00Z"), Instant.parse("2026-04-11T10:00:00Z")),
                        new PublicSharedProjectSummary(1L, "Default Project", "default", "Seed project"),
                        new ProjectTreeResponse(List.of(
                                new ModuleTreeItem(1L, "Core", List.of(
                                        new GroupTreeItem(1L, "User APIs", List.of(
                                                new EndpointTreeItem(1L, "Get User", "GET", "/users/{id}")))))))));

        mockMvc.perform(get("/api/public/shares/active-share-code"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.project.projectKey").value("default"))
                .andExpect(jsonPath("$.data.tree.modules[0].groups[0].endpoints[0].path").value("/users/{id}"));
    }

    @Test
    void shouldReadSharedEndpointDetailWithoutAuthentication() throws Exception {
        given(publicProjectShareService.getShareEndpointDetail("active-share-code", 1L)).willReturn(
                new PublicShareEndpointDetailResponse(
                        new com.apihub.doc.model.EndpointDetail(1L, 1L, "Get User", "GET", "/users/{id}", "Seed endpoint", true),
                        List.of(),
                        List.of(),
                        List.of(),
                        List.of(new MockReleaseDetail(1L, 1L, 1, "[]", "[]", Instant.parse("2026-04-11T10:00:00Z")))));

        mockMvc.perform(get("/api/public/shares/active-share-code/endpoints/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.endpoint.name").value("Get User"))
                .andExpect(jsonPath("$.data.mockReleases[0].releaseNo").value(1));
    }
}
