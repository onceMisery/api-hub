package com.apihub.mock.service;

import com.apihub.debug.model.DebugDtos.DebugHeader;
import com.apihub.doc.model.EndpointDetail;
import com.apihub.doc.repository.EndpointRepository;
import com.apihub.mock.model.MockDtos.MockReleaseDetail;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class MockServiceTest {

    @Mock
    private EndpointRepository endpointRepository;

    private MockService mockService;

    @BeforeEach
    void setUp() {
        mockService = new MockService(endpointRepository, new MockRuntimeResolver());
    }

    @Test
    void shouldMatchTemplatePathAndRenderLatestReleasedResponse() {
        given(endpointRepository.listMockEndpoints(1L, "GET")).willReturn(List.of(
                new EndpointDetail(31L, 21L, "Get User", "GET", "/users/{id}", "Load user", true)));
        given(endpointRepository.findLatestMockRelease(31L)).willReturn(Optional.of(
                new MockReleaseDetail(
                        5L,
                        31L,
                        1,
                        """
                        [{"httpStatusCode":200,"mediaType":"application/json","name":"userId","dataType":"string","required":true,"description":"","exampleValue":"u_1001"}]
                        """,
                        "[]",
                        Instant.parse("2026-04-09T12:00:00Z")
                )));

        MockService.MockResponse response = mockService.resolve(1L, "GET", "/users/31", Map.of(), Map.of());

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.headers()).containsExactly(new DebugHeader("Content-Type", "application/json"));
        assertThat(response.body()).isEqualTo("{\"userId\":\"u_1001\"}");
    }

    @Test
    void shouldFallbackToPublishedDefaultResponseWhenNoRuleMatched() {
        given(endpointRepository.listMockEndpoints(1L, "GET")).willReturn(List.of(
                new EndpointDetail(31L, 21L, "Get User", "GET", "/users/{id}", "Load user", true)));
        given(endpointRepository.findLatestMockRelease(31L)).willReturn(Optional.of(
                new MockReleaseDetail(
                        5L,
                        31L,
                        1,
                        """
                        [{"httpStatusCode":200,"mediaType":"application/json","name":"enabled","dataType":"boolean","required":true,"description":"","exampleValue":""},
                         {"httpStatusCode":200,"mediaType":"application/json","name":"count","dataType":"integer","required":true,"description":"","exampleValue":""}]
                        """,
                        "[]",
                        Instant.parse("2026-04-09T12:00:00Z")
                )));

        MockService.MockResponse response = mockService.resolve(1L, "GET", "/users/31", Map.of(), Map.of());

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).isEqualTo("{\"enabled\":true,\"count\":0}");
    }

    @Test
    void shouldPreferMatchingReleasedRuleOverDefaultResponse() {
        given(endpointRepository.listMockEndpoints(1L, "GET")).willReturn(List.of(
                new EndpointDetail(31L, 21L, "Get User", "GET", "/users/{id}", "Load user", true)));
        given(endpointRepository.findLatestMockRelease(31L)).willReturn(Optional.of(
                new MockReleaseDetail(
                        5L,
                        31L,
                        1,
                        """
                        [{"httpStatusCode":200,"mediaType":"application/json","name":"userId","dataType":"string","required":true,"description":"","exampleValue":"u_1001"}]
                        """,
                        """
                        [{"ruleName":"unauthorized","priority":100,"enabled":true,"queryConditions":[{"name":"mode","value":"strict"}],"headerConditions":[{"name":"x-scenario","value":"unauthorized"}],"statusCode":401,"mediaType":"application/json","body":"{\\"error\\":\\"token expired\\"}"}]
                        """,
                        Instant.parse("2026-04-09T12:00:00Z")
                )));

        MockService.MockResponse response = mockService.resolve(
                1L,
                "GET",
                "/users/31",
                Map.of("mode", List.of("strict")),
                Map.of("x-scenario", "unauthorized"));

        assertThat(response.statusCode()).isEqualTo(401);
        assertThat(response.headers()).containsExactly(new DebugHeader("Content-Type", "application/json"));
        assertThat(response.body()).isEqualTo("{\"error\":\"token expired\"}");
    }

    @Test
    void shouldRejectUnknownMockRoute() {
        given(endpointRepository.listMockEndpoints(1L, "GET")).willReturn(List.of());

        assertThatThrownBy(() -> mockService.resolve(1L, "GET", "/missing", Map.of(), Map.of()))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void shouldRejectRuntimeRequestsWhenNoMockReleaseExists() {
        given(endpointRepository.listMockEndpoints(1L, "GET")).willReturn(List.of(
                new EndpointDetail(31L, 21L, "Get User", "GET", "/users/{id}", "Load user", true)));
        given(endpointRepository.findLatestMockRelease(31L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> mockService.resolve(1L, "GET", "/users/31", Map.of(), Map.of()))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }
}
