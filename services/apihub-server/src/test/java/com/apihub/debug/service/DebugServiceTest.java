package com.apihub.debug.service;

import com.apihub.debug.model.DebugDtos.DebugHeader;
import com.apihub.debug.model.DebugDtos.ExecuteDebugRequest;
import com.apihub.debug.model.DebugDtos.ExecuteDebugResponse;
import com.apihub.doc.model.EndpointDetail;
import com.apihub.doc.repository.EndpointRepository;
import com.apihub.project.model.ProjectDtos.EnvironmentDetail;
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

    @InjectMocks
    private DebugService debugService;

    @Test
    void shouldBuildRequestFromEnvironmentAndEndpoint() {
        given(projectRepository.findEnvironment(41L)).willReturn(Optional.of(
                new EnvironmentDetail(41L, 1L, "Local", "https://local.dev/api", true)));
        given(endpointRepository.findEndpointReference(31L)).willReturn(Optional.of(
                new EndpointRepository.EndpointReference(31L, 21L, 1L)));
        given(endpointRepository.findEndpoint(31L)).willReturn(Optional.of(
                new EndpointDetail(31L, 21L, "Get User", "GET", "/users/31", "Load user")));
        given(debugHttpExecutor.execute(any())).willReturn(new DebugHttpResult(
                200,
                List.of(new DebugHeader("Content-Type", "application/json")),
                "{\"ok\":true}",
                88));

        ExecuteDebugResponse response = debugService.execute(new ExecuteDebugRequest(
                41L,
                31L,
                "verbose=true",
                List.of(new DebugHeader("X-Trace", "abc")),
                ""));

        ArgumentCaptor<DebugHttpRequest> requestCaptor = ArgumentCaptor.forClass(DebugHttpRequest.class);
        verify(debugHttpExecutor).execute(requestCaptor.capture());

        DebugHttpRequest request = requestCaptor.getValue();
        assertThat(request.method()).isEqualTo("GET");
        assertThat(request.uri()).isEqualTo(URI.create("https://local.dev/api/users/31?verbose=true"));
        assertThat(request.headers()).containsExactly(new DebugHeader("X-Trace", "abc"));
        assertThat(response.finalUrl()).isEqualTo("https://local.dev/api/users/31?verbose=true");
        assertThat(response.statusCode()).isEqualTo(200);
    }

    @Test
    void shouldRejectUnsupportedBaseUrlScheme() {
        given(projectRepository.findEnvironment(41L)).willReturn(Optional.of(
                new EnvironmentDetail(41L, 1L, "Local", "ftp://local.dev/api", true)));
        given(endpointRepository.findEndpointReference(31L)).willReturn(Optional.of(
                new EndpointRepository.EndpointReference(31L, 21L, 1L)));
        given(endpointRepository.findEndpoint(31L)).willReturn(Optional.of(
                new EndpointDetail(31L, 21L, "Get User", "GET", "/users/31", "Load user")));

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
}
