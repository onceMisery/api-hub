package com.apihub.debug.service;

import com.apihub.debug.config.DebugSecurityProperties;
import com.apihub.debug.model.DebugDtos.DebugHeader;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
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
    private final DebugSecurityProperties debugSecurityProperties;

    @Autowired
    public JdkDebugHttpExecutor(DebugSecurityProperties debugSecurityProperties) {
        this(HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(debugSecurityProperties.getConnectTimeoutMs()))
                .followRedirects(HttpClient.Redirect.NEVER)
                .build(),
                debugSecurityProperties);
    }

    JdkDebugHttpExecutor(HttpClient httpClient, DebugSecurityProperties debugSecurityProperties) {
        this.httpClient = httpClient;
        this.debugSecurityProperties = debugSecurityProperties;
    }

    @Override
    public DebugHttpResult execute(DebugHttpRequest request) {
        HttpRequest.Builder builder = HttpRequest.newBuilder(request.uri())
                .timeout(Duration.ofMillis(debugSecurityProperties.getReadTimeoutMs()));

        for (DebugHeader header : request.headers()) {
            builder.header(header.name(), header.value());
        }

        HttpRequest.BodyPublisher bodyPublisher = request.body() == null || request.body().isBlank()
                ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(request.body(), StandardCharsets.UTF_8);

        HttpRequest httpRequest = builder.method(request.method(), bodyPublisher).build();
        long startedAt = System.nanoTime();

        try {
            HttpResponse<InputStream> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofInputStream());
            long durationMs = Duration.ofNanos(System.nanoTime() - startedAt).toMillis();

            return new DebugHttpResult(
                    response.statusCode(),
                    mapHeaders(response.headers().map()),
                    readResponseBody(response.body()),
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

    private String readResponseBody(InputStream bodyStream) throws IOException {
        int maxBytes = debugSecurityProperties.getMaxResponseBodyBytes();
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int totalBytes = 0;
        int bytesRead;
        while ((bytesRead = bodyStream.read(buffer)) != -1) {
            totalBytes += bytesRead;
            if (totalBytes > maxBytes) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Debug response exceeded configured size limit");
            }
            outputStream.write(buffer, 0, bytesRead);
        }
        return outputStream.toString(StandardCharsets.UTF_8);
    }
}
