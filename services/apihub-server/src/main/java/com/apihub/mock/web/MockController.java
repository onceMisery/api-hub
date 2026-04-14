package com.apihub.mock.web;

import com.apihub.mock.service.MockService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Arrays;
import java.util.Enumeration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
public class MockController {

    private final MockService mockService;

    public MockController(MockService mockService) {
        this.mockService = mockService;
    }

    @RequestMapping({
            "/mock/{projectId}",
            "/mock/{projectId}/**"
    })
    public ResponseEntity<String> handleMock(@PathVariable Long projectId, HttpServletRequest request) {
        String requestPath = extractPath(projectId, request.getRequestURI());
        MockService.MockResponse response = mockService.resolve(
                projectId,
                request.getMethod(),
                requestPath,
                extractQueryParameters(request),
                extractHeaders(request),
                extractRequestBody(request));
        applyDelay(response.delayMs());

        HttpHeaders headers = new HttpHeaders();
        response.headers().forEach(header -> headers.add(header.name(), header.value()));
        return ResponseEntity.status(response.statusCode())
                .headers(headers)
                .body(response.body());
    }

    private String extractPath(Long projectId, String requestUri) {
        String prefix = "/mock/" + projectId;
        if (requestUri.equals(prefix)) {
            return "/";
        }
        String path = requestUri.startsWith(prefix) ? requestUri.substring(prefix.length()) : requestUri;
        return path.isBlank() ? "/" : path;
    }

    private Map<String, List<String>> extractQueryParameters(HttpServletRequest request) {
        Map<String, List<String>> queryParameters = new LinkedHashMap<>();
        request.getParameterMap().forEach((name, values) -> queryParameters.put(name, Arrays.asList(values)));
        return queryParameters;
    }

    private Map<String, String> extractHeaders(HttpServletRequest request) {
        Map<String, String> headers = new LinkedHashMap<>();
        Enumeration<String> names = request.getHeaderNames();
        while (names.hasMoreElements()) {
            String name = names.nextElement();
            headers.put(name.toLowerCase(Locale.ROOT), request.getHeader(name));
        }
        return headers;
    }

    private String extractRequestBody(HttpServletRequest request) {
        try {
            return request.getReader().lines().reduce("", (current, line) -> current + line);
        } catch (IOException exception) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Failed to read mock request body", exception);
        }
    }

    private void applyDelay(int delayMs) {
        if (delayMs <= 0) {
            return;
        }
        try {
            Thread.sleep(delayMs);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, "Mock response interrupted", exception);
        }
    }
}
