package com.apihub.debug.service;

import com.apihub.debug.config.DebugSecurityProperties;
import com.apihub.debug.model.DebugDtos.DebugHeader;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayInputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpHeaders;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class JdkDebugHttpExecutorTest {

    @Mock
    private HttpClient httpClient;

    @Mock
    private HttpResponse<java.io.InputStream> httpResponse;

    @Test
    void shouldApplyConfiguredReadTimeoutAndReturnBody() throws Exception {
        DebugSecurityProperties properties = new DebugSecurityProperties();
        properties.setReadTimeoutMs(3210);
        properties.setMaxResponseBodyBytes(1024);
        JdkDebugHttpExecutor executor = new JdkDebugHttpExecutor(httpClient, properties);

        given(httpClient.send(any(HttpRequest.class), eq(HttpResponse.BodyHandlers.ofInputStream()))).willReturn(httpResponse);
        given(httpResponse.statusCode()).willReturn(200);
        given(httpResponse.headers()).willReturn(HttpHeaders.of(Map.of("content-type", List.of("application/json")), (left, right) -> true));
        given(httpResponse.body()).willReturn(new ByteArrayInputStream("{\"ok\":true}".getBytes()));

        DebugHttpResult result = executor.execute(new DebugHttpRequest(
                "GET",
                URI.create("https://local.dev/users/31"),
                List.of(new DebugHeader("X-App", "ApiHub")),
                ""));

        ArgumentCaptor<HttpRequest> requestCaptor = ArgumentCaptor.forClass(HttpRequest.class);
        org.mockito.Mockito.verify(httpClient).send(requestCaptor.capture(), eq(HttpResponse.BodyHandlers.ofInputStream()));
        assertThat(requestCaptor.getValue().timeout()).contains(Duration.ofMillis(3210));
        assertThat(result.responseBody()).isEqualTo("{\"ok\":true}");
    }

    @Test
    void shouldRejectResponseBodyExceedingConfiguredLimit() throws Exception {
        DebugSecurityProperties properties = new DebugSecurityProperties();
        properties.setReadTimeoutMs(1000);
        properties.setMaxResponseBodyBytes(4);
        JdkDebugHttpExecutor executor = new JdkDebugHttpExecutor(httpClient, properties);

        given(httpClient.send(any(HttpRequest.class), eq(HttpResponse.BodyHandlers.ofInputStream()))).willReturn(httpResponse);
        given(httpResponse.statusCode()).willReturn(200);
        given(httpResponse.headers()).willReturn(HttpHeaders.of(Map.of(), (left, right) -> true));
        given(httpResponse.body()).willReturn(new ByteArrayInputStream("too-large".getBytes()));

        assertThatThrownBy(() -> executor.execute(new DebugHttpRequest(
                "GET",
                URI.create("https://local.dev/users/31"),
                List.of(),
                "")))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode())
                .isEqualTo(HttpStatus.BAD_GATEWAY);
    }
}
