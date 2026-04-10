package com.apihub.debug.service;

import com.apihub.debug.model.DebugDtos.DebugHeader;
import com.apihub.debug.model.DebugDtos.DebugHistoryItem;
import com.apihub.debug.model.DebugDtos.ExecuteDebugRequest;
import com.apihub.debug.model.DebugDtos.ExecuteDebugResponse;
import com.apihub.doc.model.EndpointDetail;
import com.apihub.doc.repository.EndpointRepository;
import com.apihub.project.model.ProjectDtos.EnvironmentEntry;
import com.apihub.project.model.ProjectDtos.EnvironmentDetail;
import com.apihub.project.model.ProjectDtos.ProjectDetail;
import com.apihub.project.repository.ProjectRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class DebugServiceTest {

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private EndpointRepository endpointRepository;

    @Mock
    private DebugHttpExecutor debugHttpExecutor;

    @Mock
    private DebugHistoryRepository debugHistoryRepository;

    @InjectMocks
    private DebugService debugService;

    @Test
    void shouldBuildRequestFromEnvironmentAndEndpoint() {
        given(projectRepository.findEnvironment(41L)).willReturn(Optional.of(
                new EnvironmentDetail(
                        41L,
                        1L,
                        "Local",
                        "https://local.dev/api",
                        true,
                        List.of(new EnvironmentEntry("userId", "31"), new EnvironmentEntry("include", "profile"), new EnvironmentEntry("token", "env-token")),
                        List.of(new EnvironmentEntry("Authorization", "Bearer {{token}}"), new EnvironmentEntry("X-App", "ApiHub")),
                        List.of(new EnvironmentEntry("locale", "zh-CN"), new EnvironmentEntry("include", "summary")),
                        "bearer",
                        "Authorization",
                        "env-token",
                        "inherit",
                        List.of())));
        given(endpointRepository.findEndpointReference(31L)).willReturn(Optional.of(
                new EndpointRepository.EndpointReference(31L, 21L, 1L)));
        given(endpointRepository.findEndpoint(31L)).willReturn(Optional.of(
                new EndpointDetail(31L, 21L, "Get User", "GET", "/users/{{userId}}", "Load user", false)));
        given(debugHttpExecutor.execute(any())).willReturn(new DebugHttpResult(
                200,
                List.of(new DebugHeader("Content-Type", "application/json")),
                "{\"ok\":true}",
                88));

        ExecuteDebugResponse response = debugService.execute(new ExecuteDebugRequest(
                41L,
                31L,
                "verbose=true&include={{include}}",
                List.of(new DebugHeader("X-Trace", "abc"), new DebugHeader("Authorization", "Bearer manual-token")),
                "{\"user\":\"{{userId}}\"}"));

        ArgumentCaptor<DebugHttpRequest> requestCaptor = ArgumentCaptor.forClass(DebugHttpRequest.class);
        verify(debugHttpExecutor).execute(requestCaptor.capture());

        DebugHttpRequest request = requestCaptor.getValue();
        assertThat(request.method()).isEqualTo("GET");
        assertThat(request.uri()).isEqualTo(URI.create("https://local.dev/api/users/31?locale=zh-CN&include=profile&verbose=true"));
        assertThat(request.headers()).containsExactly(
                new DebugHeader("Authorization", "Bearer manual-token"),
                new DebugHeader("X-App", "ApiHub"),
                new DebugHeader("X-Trace", "abc"));
        assertThat(request.body()).isEqualTo("{\"user\":\"31\"}");
        assertThat(response.finalUrl()).isEqualTo("https://local.dev/api/users/31?locale=zh-CN&include=profile&verbose=true");
        assertThat(response.statusCode()).isEqualTo(200);
        verify(debugHistoryRepository).saveHistory(
                1L,
                41L,
                31L,
                "GET",
                "https://local.dev/api/users/31?locale=zh-CN&include=profile&verbose=true",
                request.headers(),
                "{\"user\":\"31\"}",
                200,
                List.of(new DebugHeader("Content-Type", "application/json")),
                "{\"ok\":true}",
                88);
    }

    @Test
    void shouldInjectBearerAuthWhenRequestDoesNotOverrideAuthorization() {
        given(projectRepository.findEnvironment(41L)).willReturn(Optional.of(
                new EnvironmentDetail(
                        41L,
                        1L,
                        "Local",
                        "https://local.dev/api",
                        true,
                        List.of(),
                        List.of(new EnvironmentEntry("X-App", "ApiHub")),
                        List.of(),
                        "bearer",
                        "Authorization",
                        "env-token",
                        "inherit",
                        List.of())));
        given(endpointRepository.findEndpointReference(31L)).willReturn(Optional.of(
                new EndpointRepository.EndpointReference(31L, 21L, 1L)));
        given(endpointRepository.findEndpoint(31L)).willReturn(Optional.of(
                new EndpointDetail(31L, 21L, "Get User", "GET", "/users/31", "Load user", false)));
        given(debugHttpExecutor.execute(any())).willReturn(new DebugHttpResult(
                200,
                List.of(new DebugHeader("Content-Type", "application/json")),
                "{\"ok\":true}",
                20));

        debugService.execute(new ExecuteDebugRequest(41L, 31L, "", List.of(), ""));

        ArgumentCaptor<DebugHttpRequest> requestCaptor = ArgumentCaptor.forClass(DebugHttpRequest.class);
        verify(debugHttpExecutor).execute(requestCaptor.capture());
        assertThat(requestCaptor.getValue().headers()).containsExactly(
                new DebugHeader("X-App", "ApiHub"),
                new DebugHeader("Authorization", "Bearer env-token"));
    }

    @Test
    void shouldRejectUnsupportedBaseUrlScheme() {
        given(projectRepository.findEnvironment(41L)).willReturn(Optional.of(
                new EnvironmentDetail(41L, 1L, "Local", "ftp://local.dev/api", true, List.of(), List.of(), List.of(), "none", "", "", "inherit", List.of())));
        given(endpointRepository.findEndpointReference(31L)).willReturn(Optional.of(
                new EndpointRepository.EndpointReference(31L, 21L, 1L)));
        given(endpointRepository.findEndpoint(31L)).willReturn(Optional.of(
                new EndpointDetail(31L, 21L, "Get User", "GET", "/users/31", "Load user", false)));

        assertThatThrownBy(() -> debugService.execute(new ExecuteDebugRequest(
                41L,
                31L,
                "",
                List.of(),
                "")))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void shouldReturnProjectDebugHistory() {
        Instant createdAt = Instant.parse("2026-04-09T04:12:30Z");
        given(projectRepository.findProject(1L)).willReturn(Optional.of(new ProjectDetail(1L, "Default", "default", "Seed", List.of())));
        given(debugHistoryRepository.listHistory(1L, 31L, 10)).willReturn(List.of(
                new DebugHistoryItem(
                        101L,
                        1L,
                        41L,
                        31L,
                        "GET",
                        "https://local.dev/api/users/31",
                        List.of(new DebugHeader("X-App", "ApiHub")),
                        "",
                        200,
                        List.of(new DebugHeader("Content-Type", "application/json")),
                        "{\"ok\":true}",
                        35L,
                        createdAt)));

        List<DebugHistoryItem> history = debugService.listHistory(1L, 31L, 10);

        assertThat(history).hasSize(1);
        assertThat(history.getFirst().id()).isEqualTo(101L);
        verify(debugHistoryRepository).listHistory(1L, 31L, 10);
    }
}
