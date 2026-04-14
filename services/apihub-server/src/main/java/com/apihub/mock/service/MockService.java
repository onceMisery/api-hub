package com.apihub.mock.service;

import com.apihub.debug.model.DebugDtos.DebugHeader;
import com.apihub.doc.model.EndpointDetail;
import com.apihub.doc.repository.EndpointRepository;
import com.apihub.mock.model.MockDtos.MockConditionEntry;
import com.apihub.mock.model.MockDtos.MockReleaseDetail;
import com.apihub.mock.model.MockDtos.MockRuleUpsertItem;
import com.apihub.mock.model.MockDtos.MockSimulationRequest;
import com.apihub.mock.model.MockDtos.MockSimulationResponseItem;
import com.apihub.mock.model.MockDtos.MockSimulationResult;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class MockService {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final AntPathMatcher PATH_MATCHER = new AntPathMatcher();
    private static final TypeReference<List<MockRuleUpsertItem>> MOCK_RULE_UPSERT_LIST = new TypeReference<>() {
    };
    private static final TypeReference<List<MockSimulationResponseItem>> MOCK_RESPONSE_ITEM_LIST = new TypeReference<>() {
    };

    private final EndpointRepository endpointRepository;
    private final MockRuntimeResolver mockRuntimeResolver;

    public MockService(EndpointRepository endpointRepository, MockRuntimeResolver mockRuntimeResolver) {
        this.endpointRepository = endpointRepository;
        this.mockRuntimeResolver = mockRuntimeResolver;
    }

    public MockResponse resolve(Long projectId,
                                String method,
                                String path,
                                Map<String, List<String>> queryParameters,
                                Map<String, String> requestHeaders,
                                String requestBody) {
        EndpointDetail endpoint = endpointRepository.listMockEndpoints(projectId, method).stream()
                .filter(candidate -> matches(candidate.path(), path))
                .min(Comparator
                        .comparingInt((EndpointDetail candidate) -> placeholderCount(candidate.path()))
                        .thenComparingInt(candidate -> -segmentCount(candidate.path())))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Mock endpoint not found"));

        MockReleaseDetail release = endpointRepository.findLatestMockRelease(endpoint.id())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Mock release not published"));

        MockSimulationResult document = mockRuntimeResolver.resolveDraft(new MockSimulationRequest(
                readMockRules(release.rulesSnapshotJson()),
                readResponses(release.responseSnapshotJson()),
                toQueryConditionEntries(queryParameters),
                toHeaderConditionEntries(requestHeaders),
                requestBody
        ));
        return new MockResponse(
                document.statusCode(),
                List.of(new DebugHeader("Content-Type", document.mediaType())),
                document.body(),
                document.delayMs());
    }

    private boolean matches(String templatePath, String requestPath) {
        return PATH_MATCHER.match(normalizePath(templatePath), normalizePath(requestPath));
    }

    private int placeholderCount(String path) {
        int count = 0;
        for (int index = 0; index < path.length(); index++) {
            if (path.charAt(index) == '{') {
                count++;
            }
        }
        return count;
    }

    private int segmentCount(String path) {
        return (int) normalizePath(path).chars().filter(character -> character == '/').count();
    }

    private String normalizePath(String path) {
        if (path == null || path.isBlank()) {
            return "/";
        }

        String normalized = path.startsWith("/") ? path : "/" + path;
        if (normalized.length() > 1 && normalized.endsWith("/")) {
            return normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private List<MockRuleUpsertItem> readMockRules(String snapshotJson) {
        try {
            if (snapshotJson == null || snapshotJson.isBlank()) {
                return List.of();
            }
            return OBJECT_MAPPER.readValue(snapshotJson, MOCK_RULE_UPSERT_LIST);
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to parse released mock rules", exception);
        }
    }

    private List<MockSimulationResponseItem> readResponses(String snapshotJson) {
        try {
            if (snapshotJson == null || snapshotJson.isBlank()) {
                return List.of();
            }
            return OBJECT_MAPPER.readValue(snapshotJson, MOCK_RESPONSE_ITEM_LIST);
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to parse released mock responses", exception);
        }
    }

    private List<MockConditionEntry> toQueryConditionEntries(Map<String, List<String>> queryParameters) {
        List<MockConditionEntry> entries = new java.util.ArrayList<>();
        queryParameters.forEach((name, values) -> {
            for (String value : values) {
                entries.add(new MockConditionEntry(name, value));
            }
        });
        return entries;
    }

    private List<MockConditionEntry> toHeaderConditionEntries(Map<String, String> requestHeaders) {
        Map<String, String> normalizedHeaders = new LinkedHashMap<>();
        requestHeaders.forEach((name, value) -> normalizedHeaders.put(name.toLowerCase(java.util.Locale.ROOT), value));
        return normalizedHeaders.entrySet().stream()
                .map(entry -> new MockConditionEntry(entry.getKey(), entry.getValue()))
                .toList();
    }

    public record MockResponse(int statusCode, List<DebugHeader> headers, String body, int delayMs) {
    }
}
