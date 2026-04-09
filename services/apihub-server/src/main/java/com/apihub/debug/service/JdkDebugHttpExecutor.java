package com.apihub.debug.service;

import com.apihub.debug.model.DebugDtos.DebugHeader;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Component
public class JdkDebugHttpExecutor implements DebugHttpExecutor {

    private final HttpClient httpClient;

    public JdkDebugHttpExecutor() {
        this(HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build());
    }

    JdkDebugHttpExecutor(HttpClient httpClient) {
        this.httpClient = httpClient;
    }

    @Override
    public DebugHttpResult execute(DebugHttpRequest request) {
        HttpRequest.Builder builder = HttpRequest.newBuilder(request.uri())
                .timeout(Duration.ofSeconds(10));

        for (DebugHeader header : request.headers()) {
            builder.header(header.name(), header.value());
        }

        HttpRequest.BodyPublisher bodyPublisher = request.body() == null || request.body().isBlank()
                ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(request.body(), StandardCharsets.UTF_8);

        HttpRequest httpRequest = builder.method(request.method(), bodyPublisher).build();
        long startedAt = System.nanoTime();

        try {
            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            long durationMs = Duration.ofNanos(System.nanoTime() - startedAt).toMillis();

            return new DebugHttpResult(
                    response.statusCode(),
                    mapHeaders(response.headers().map()),
                    response.body(),
                    durationMs);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Debug request failed", exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Debug request interrupted", exception);
        }
    }

    private List<DebugHeader> mapHeaders(Map<String, List<String>> headers) {
        return headers.entrySet().stream()
                .flatMap(entry -> entry.getValue().stream().map(value -> new DebugHeader(entry.getKey(), value)))
                .toList();
    }
}
