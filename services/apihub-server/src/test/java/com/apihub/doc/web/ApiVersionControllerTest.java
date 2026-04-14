package com.apihub.doc.web;

import com.apihub.auth.repository.AuthUserRepository;
import com.apihub.auth.service.JwtTokenService;
import com.apihub.common.config.SecurityConfig;
import com.apihub.doc.model.EndpointDetail;
import com.apihub.doc.model.VersionComparisonResult;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
                        null,
                        null,
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
    void shouldCompareEndpointVersions() throws Exception {
        given(projectService.compareVersions(1L, 31L, 7L, null)).willReturn(
                new VersionComparisonResult(
                        31L,
                        new VersionComparisonResult.VersionDescriptor(7L, "v1.0.0", "initial", false, true, Instant.parse("2026-04-12T10:00:00Z")),
                        new VersionComparisonResult.VersionDescriptor(null, "Current Draft", "draft", true, false, null),
                        new VersionComparisonResult.DiffSummary(1, 1, 0, 0, 0, 0, 1, 0),
                        List.of(),
                        List.of(new VersionComparisonResult.ChangelogEntry("endpoint", "接口字段更新: description", "Load user -> Load current user")),
                        List.of(new VersionComparisonResult.FieldChange("description", "Load user", "Load current user")),
                        List.of(new VersionComparisonResult.ParameterChange("added", "query:verbose", "query", "verbose", null, "boolean", null, false, null, "Verbose flag", null, "true")),
                        List.of(new VersionComparisonResult.ResponseChange("modified", "200:application/json:id", 200, "application/json", "id", "long", "string", true, true, "User id", "User id string", "1", "u-1"))));

        mockMvc.perform(get("/api/v1/endpoints/31/versions/compare")
                        .param("baseVersionId", "7")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.base.versionId").value(7))
                .andExpect(jsonPath("$.data.target.draft").value(true))
                .andExpect(jsonPath("$.data.summary.addedParameters").value(1))
                .andExpect(jsonPath("$.data.endpointChanges[0].field").value("description"));
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
                        null,
                        null,
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
