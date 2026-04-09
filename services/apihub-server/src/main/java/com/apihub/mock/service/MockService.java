package com.apihub.mock.service;

import com.apihub.debug.model.DebugDtos.DebugHeader;
import com.apihub.doc.model.EndpointDetail;
import com.apihub.doc.model.ResponseDetail;
import com.apihub.doc.model.VersionDetail;
import com.apihub.doc.repository.EndpointRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class MockService {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final AntPathMatcher PATH_MATCHER = new AntPathMatcher();

    private final EndpointRepository endpointRepository;

    public MockService(EndpointRepository endpointRepository) {
        this.endpointRepository = endpointRepository;
    }

    public MockResponse resolve(Long projectId, String method, String path) {
        EndpointDetail endpoint = endpointRepository.listMockEndpoints(projectId, method).stream()
                .filter(candidate -> matches(candidate.path(), path))
                .min(Comparator
                        .comparingInt((EndpointDetail candidate) -> placeholderCount(candidate.path()))
                        .thenComparingInt(candidate -> -segmentCount(candidate.path())))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Mock endpoint not found"));

        Optional<MockDocument> fromSnapshot = endpointRepository.findLatestVersion(endpoint.id())
                .flatMap(this::mockDocumentFromVersion);

        MockDocument document = fromSnapshot.orElseGet(() -> mockDocumentFromResponses(endpoint.id()));
        return new MockResponse(
                document.statusCode(),
                List.of(new DebugHeader("Content-Type", document.mediaType())),
                document.body());
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

    private Optional<MockDocument> mockDocumentFromVersion(VersionDetail version) {
        if (version.snapshotJson() == null || version.snapshotJson().isBlank()) {
            return Optional.empty();
        }

        try {
            JsonNode root = OBJECT_MAPPER.readTree(version.snapshotJson());
            JsonNode responsesNode = root.path("responses");
            if (!responsesNode.isArray() || responsesNode.isEmpty()) {
                return Optional.empty();
            }

            List<ResponseField> responseFields = new ArrayList<>();
            int statusCode = 200;
            String mediaType = "application/json";
            Integer selectedStatus = null;
            String selectedMediaType = null;

            for (JsonNode responseNode : responsesNode) {
                int currentStatus = responseNode.path("httpStatusCode").asInt(200);
                String currentMediaType = responseNode.path("mediaType").asText("application/json");
                if (selectedStatus == null) {
                    selectedStatus = currentStatus;
                    selectedMediaType = currentMediaType;
                    statusCode = currentStatus;
                    mediaType = currentMediaType;
                }

                if (selectedStatus != currentStatus || !selectedMediaType.equals(currentMediaType)) {
                    continue;
                }

                responseFields.add(new ResponseField(
                        responseNode.path("name").asText(""),
                        responseNode.path("dataType").asText("string"),
                        responseNode.path("exampleValue").isMissingNode() ? null : responseNode.path("exampleValue").asText(null)));
            }

            return responseFields.isEmpty()
                    ? Optional.empty()
                    : Optional.of(new MockDocument(statusCode, mediaType, buildJsonBody(responseFields)));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to parse mock snapshot", exception);
        }
    }

    private MockDocument mockDocumentFromResponses(Long endpointId) {
        List<ResponseDetail> responses = endpointRepository.listResponses(endpointId);
        if (responses.isEmpty()) {
            return new MockDocument(200, "application/json", "{}");
        }

        ResponseDetail first = responses.get(0);
        List<ResponseField> responseFields = responses.stream()
                .filter(response -> response.httpStatusCode() == first.httpStatusCode())
                .filter(response -> response.mediaType().equals(first.mediaType()))
                .map(response -> new ResponseField(
                        response.name() == null ? "" : response.name(),
                        response.dataType(),
                        response.exampleValue()))
                .toList();

        return new MockDocument(first.httpStatusCode(), first.mediaType(), buildJsonBody(responseFields));
    }

    private String buildJsonBody(List<ResponseField> responseFields) {
        try {
            if (responseFields.size() == 1 && responseFields.get(0).name().isBlank()) {
                return OBJECT_MAPPER.writeValueAsString(defaultValue(responseFields.get(0)));
            }

            Map<String, Object> payload = new LinkedHashMap<>();
            for (ResponseField field : responseFields) {
                if (field.name().isBlank()) {
                    continue;
                }
                payload.put(field.name(), defaultValue(field));
            }
            return OBJECT_MAPPER.writeValueAsString(payload);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to render mock body", exception);
        }
    }

    private Object defaultValue(ResponseField field) {
        if (field.exampleValue() != null && !field.exampleValue().isBlank()) {
            return parseExampleValue(field.dataType(), field.exampleValue());
        }

        return defaultValueByType(field.dataType());
    }

    private Object defaultValueByType(String dataType) {
        return switch (dataType.toLowerCase()) {
            case "integer", "int", "long" -> 0;
            case "number", "float", "double", "decimal" -> 0;
            case "boolean" -> true;
            case "array" -> List.of();
            case "object" -> Map.of();
            default -> "";
        };
    }

    private Object parseExampleValue(String dataType, String exampleValue) {
        try {
            return switch (dataType.toLowerCase()) {
                case "integer", "int", "long" -> Integer.parseInt(exampleValue);
                case "number", "float", "double", "decimal" -> Double.parseDouble(exampleValue);
                case "boolean" -> Boolean.parseBoolean(exampleValue);
                case "array", "object" -> OBJECT_MAPPER.readValue(exampleValue, Object.class);
                default -> exampleValue;
            };
        } catch (Exception ignored) {
            return defaultValueByType(dataType);
        }
    }

    private record ResponseField(String name, String dataType, String exampleValue) {
    }

    private record MockDocument(int statusCode, String mediaType, String body) {
    }

    public record MockResponse(int statusCode, List<DebugHeader> headers, String body) {
    }
}
