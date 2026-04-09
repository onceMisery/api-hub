package com.apihub.mock.web;

import com.apihub.mock.service.MockService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
        MockService.MockResponse response = mockService.resolve(projectId, request.getMethod(), requestPath);

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
}
