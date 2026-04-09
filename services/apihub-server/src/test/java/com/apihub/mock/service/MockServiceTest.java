package com.apihub.mock.service;

import com.apihub.debug.model.DebugDtos.DebugHeader;
import com.apihub.doc.model.EndpointDetail;
import com.apihub.doc.model.ResponseDetail;
import com.apihub.doc.model.VersionDetail;
import com.apihub.doc.repository.EndpointRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class MockServiceTest {

    @Mock
    private EndpointRepository endpointRepository;

    @InjectMocks
    private MockService mockService;

    @Test
    void shouldMatchTemplatePathAndRenderLatestSnapshotResponse() {
        given(endpointRepository.listMockEndpoints(1L, "GET")).willReturn(List.of(
                new EndpointDetail(31L, 21L, "Get User", "GET", "/users/{id}", "Load user", true)));
        given(endpointRepository.findLatestVersion(31L)).willReturn(Optional.of(
                new VersionDetail(
                        9L,
                        31L,
                        "v2",
                        "seed",
                        "{\"endpoint\":{\"path\":\"/users/{id}\"},\"responses\":[{\"httpStatusCode\":200,\"mediaType\":\"application/json\",\"name\":\"userId\",\"dataType\":\"string\",\"required\":true,\"description\":\"\",\"exampleValue\":\"u_1001\"}]}"
                )));

        MockService.MockResponse response = mockService.resolve(1L, "GET", "/users/31");

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.headers()).containsExactly(new DebugHeader("Content-Type", "application/json"));
        assertThat(response.body()).isEqualTo("{\"userId\":\"u_1001\"}");
    }

    @Test
    void shouldFallbackToResponseRowsWhenNoSnapshotExists() {
        given(endpointRepository.listMockEndpoints(1L, "GET")).willReturn(List.of(
                new EndpointDetail(31L, 21L, "Get User", "GET", "/users/{id}", "Load user", true)));
        given(endpointRepository.findLatestVersion(31L)).willReturn(Optional.empty());
        given(endpointRepository.listResponses(31L)).willReturn(List.of(
                new ResponseDetail(1L, 200, "application/json", "enabled", "boolean", true, "", "", 0),
                new ResponseDetail(2L, 200, "application/json", "count", "integer", true, "", "", 1)
        ));

        MockService.MockResponse response = mockService.resolve(1L, "GET", "/users/31");

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).isEqualTo("{\"enabled\":true,\"count\":0}");
    }

    @Test
    void shouldRejectUnknownMockRoute() {
        given(endpointRepository.listMockEndpoints(1L, "GET")).willReturn(List.of());

        assertThatThrownBy(() -> mockService.resolve(1L, "GET", "/missing"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }
}
