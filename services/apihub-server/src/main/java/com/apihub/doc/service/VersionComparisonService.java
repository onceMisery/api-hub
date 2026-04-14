package com.apihub.doc.service;

import com.apihub.doc.model.EndpointDetail;
import com.apihub.doc.model.ParameterDetail;
import com.apihub.doc.model.ResponseDetail;
import com.apihub.doc.model.VersionComparisonResult;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeSet;
import java.util.stream.Stream;

@Service
public class VersionComparisonService {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    public String buildDraftSnapshotJson(EndpointDetail endpoint, List<ParameterDetail> parameters, List<ResponseDetail> responses) {
        try {
            return OBJECT_MAPPER.writeValueAsString(Map.of(
                    "endpoint", Map.of(
                            "name", nullSafe(endpoint.name()),
                            "method", nullSafe(endpoint.method()),
                            "path", nullSafe(endpoint.path()),
                            "description", nullSafe(endpoint.description()),
                            "mockEnabled", endpoint.mockEnabled()),
                    "parameters", parameters == null ? List.of() : parameters.stream()
                            .filter(parameter -> parameter != null)
                            .map(parameter -> Map.of(
                                    "sectionType", nullSafe(parameter.sectionType()),
                                    "name", nullSafe(parameter.name()),
                                    "dataType", nullSafe(parameter.dataType()),
                                    "required", parameter.required(),
                                    "description", nullSafe(parameter.description()),
                                    "exampleValue", nullSafe(parameter.exampleValue())))
                            .toList(),
                    "responses", responses == null ? List.of() : responses.stream()
                            .filter(response -> response != null)
                            .map(response -> Map.of(
                                    "httpStatusCode", response.httpStatusCode(),
                                    "mediaType", nullSafe(response.mediaType()),
                                    "name", nullSafe(response.name()),
                                    "dataType", nullSafe(response.dataType()),
                                    "required", response.required(),
                                    "description", nullSafe(response.description()),
                                    "exampleValue", nullSafe(response.exampleValue())))
                            .toList()));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to build endpoint draft snapshot", exception);
        }
    }

    public VersionComparisonResult compareSnapshots(Long endpointId,
                                                    SnapshotSide baseSide,
                                                    String baseSnapshotJson,
                                                    SnapshotSide targetSide,
                                                    String targetSnapshotJson) {
        Snapshot base = parseSnapshot(baseSnapshotJson);
        Snapshot target = parseSnapshot(targetSnapshotJson);

        List<VersionComparisonResult.FieldChange> endpointChanges = compareEndpoint(base.endpoint(), target.endpoint());
        List<VersionComparisonResult.ParameterChange> parameterChanges = compareParameters(base.parameters(), target.parameters());
        List<VersionComparisonResult.ResponseChange> responseChanges = compareResponses(base.responses(), target.responses());
        List<VersionComparisonResult.BreakingChange> breakingChanges = collectBreakingChanges(endpointChanges, parameterChanges, responseChanges);
        List<VersionComparisonResult.ChangelogEntry> changelog = buildChangelog(endpointChanges, parameterChanges, responseChanges);

        return new VersionComparisonResult(
                endpointId,
                new VersionComparisonResult.VersionDescriptor(
                        baseSide.versionId(),
                        baseSide.label(),
                        baseSide.changeSummary(),
                        baseSide.draft(),
                        baseSide.released(),
                        baseSide.releasedAt()),
                new VersionComparisonResult.VersionDescriptor(
                        targetSide.versionId(),
                        targetSide.label(),
                        targetSide.changeSummary(),
                        targetSide.draft(),
                        targetSide.released(),
                        targetSide.releasedAt()),
                new VersionComparisonResult.DiffSummary(
                        endpointChanges.size(),
                        countParameterChanges(parameterChanges, "added"),
                        countParameterChanges(parameterChanges, "removed"),
                        countParameterChanges(parameterChanges, "modified"),
                        countResponseChanges(responseChanges, "added"),
                        countResponseChanges(responseChanges, "removed"),
                        countResponseChanges(responseChanges, "modified"),
                        breakingChanges.size()),
                breakingChanges,
                changelog,
                endpointChanges,
                parameterChanges,
                responseChanges);
    }

    private List<VersionComparisonResult.FieldChange> compareEndpoint(SnapshotEndpoint base, SnapshotEndpoint target) {
        List<VersionComparisonResult.FieldChange> changes = new ArrayList<>();
        addFieldChange(changes, "name", base.name(), target.name());
        addFieldChange(changes, "method", base.method(), target.method());
        addFieldChange(changes, "path", base.path(), target.path());
        addFieldChange(changes, "description", base.description(), target.description());
        addFieldChange(changes, "mockEnabled", String.valueOf(base.mockEnabled()), String.valueOf(target.mockEnabled()));
        return changes;
    }

    private void addFieldChange(List<VersionComparisonResult.FieldChange> changes, String field, String before, String after) {
        if (!Objects.equals(before, after)) {
            changes.add(new VersionComparisonResult.FieldChange(field, before, after));
        }
    }

    private List<VersionComparisonResult.ParameterChange> compareParameters(List<SnapshotParameter> baseItems, List<SnapshotParameter> targetItems) {
        Map<String, SnapshotParameter> baseByKey = toParameterMap(baseItems);
        Map<String, SnapshotParameter> targetByKey = toParameterMap(targetItems);
        TreeSet<String> keys = new TreeSet<>();
        keys.addAll(baseByKey.keySet());
        keys.addAll(targetByKey.keySet());

        List<VersionComparisonResult.ParameterChange> changes = new ArrayList<>();
        for (String key : keys) {
            SnapshotParameter base = baseByKey.get(key);
            SnapshotParameter target = targetByKey.get(key);
            if (base == null && target != null) {
                changes.add(new VersionComparisonResult.ParameterChange(
                        "added", key, target.sectionType(), target.name(), null, target.dataType(), null, target.required(), null, target.description(), null, target.exampleValue()));
                continue;
            }
            if (base != null && target == null) {
                changes.add(new VersionComparisonResult.ParameterChange(
                        "removed", key, base.sectionType(), base.name(), base.dataType(), null, base.required(), null, base.description(), null, base.exampleValue(), null));
                continue;
            }
            if (base != null && target != null && !base.sameContent(target)) {
                changes.add(new VersionComparisonResult.ParameterChange(
                        "modified", key, target.sectionType(), target.name(), base.dataType(), target.dataType(), base.required(), target.required(), base.description(), target.description(), base.exampleValue(), target.exampleValue()));
            }
        }
        return changes;
    }

    private List<VersionComparisonResult.ResponseChange> compareResponses(List<SnapshotResponse> baseItems, List<SnapshotResponse> targetItems) {
        Map<String, SnapshotResponse> baseByKey = toResponseMap(baseItems);
        Map<String, SnapshotResponse> targetByKey = toResponseMap(targetItems);
        TreeSet<String> keys = new TreeSet<>();
        keys.addAll(baseByKey.keySet());
        keys.addAll(targetByKey.keySet());

        List<VersionComparisonResult.ResponseChange> changes = new ArrayList<>();
        for (String key : keys) {
            SnapshotResponse base = baseByKey.get(key);
            SnapshotResponse target = targetByKey.get(key);
            if (base == null && target != null) {
                changes.add(new VersionComparisonResult.ResponseChange(
                        "added", key, target.httpStatusCode(), target.mediaType(), target.name(), null, target.dataType(), null, target.required(), null, target.description(), null, target.exampleValue()));
                continue;
            }
            if (base != null && target == null) {
                changes.add(new VersionComparisonResult.ResponseChange(
                        "removed", key, base.httpStatusCode(), base.mediaType(), base.name(), base.dataType(), null, base.required(), null, base.description(), null, base.exampleValue(), null));
                continue;
            }
            if (base != null && target != null && !base.sameContent(target)) {
                changes.add(new VersionComparisonResult.ResponseChange(
                        "modified", key, target.httpStatusCode(), target.mediaType(), target.name(), base.dataType(), target.dataType(), base.required(), target.required(), base.description(), target.description(), base.exampleValue(), target.exampleValue()));
            }
        }
        return changes;
    }

    private Snapshot parseSnapshot(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return Snapshot.empty();
        }

        try {
            JsonNode root = OBJECT_MAPPER.readTree(rawJson);
            return new Snapshot(
                    readEndpoint(root.path("endpoint")),
                    readParameters(root.path("parameters")),
                    readResponses(root.path("responses")));
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Failed to parse version snapshot", exception);
        }
    }

    private SnapshotEndpoint readEndpoint(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return SnapshotEndpoint.empty();
        }
        return new SnapshotEndpoint(
                text(node, "name"),
                text(node, "method"),
                text(node, "path"),
                text(node, "description"),
                bool(node, "mockEnabled"));
    }

    private List<SnapshotParameter> readParameters(JsonNode arrayNode) {
        if (arrayNode == null || !arrayNode.isArray()) {
            return List.of();
        }
        List<SnapshotParameter> items = new ArrayList<>();
        for (JsonNode item : arrayNode) {
            SnapshotParameter parameter = new SnapshotParameter(
                    text(item, "sectionType"),
                    text(item, "name"),
                    text(item, "dataType"),
                    bool(item, "required"),
                    text(item, "description"),
                    text(item, "exampleValue"));
            if (!parameter.name().isBlank()) {
                items.add(parameter);
            }
        }
        items.sort(Comparator.comparing(SnapshotParameter::sectionType).thenComparing(SnapshotParameter::name));
        return items;
    }

    private List<SnapshotResponse> readResponses(JsonNode arrayNode) {
        if (arrayNode == null || !arrayNode.isArray()) {
            return List.of();
        }
        List<SnapshotResponse> items = new ArrayList<>();
        int index = 0;
        for (JsonNode item : arrayNode) {
            SnapshotResponse response = new SnapshotResponse(
                    item.path("httpStatusCode").asInt(200),
                    text(item, "mediaType"),
                    text(item, "name"),
                    text(item, "dataType"),
                    bool(item, "required"),
                    text(item, "description"),
                    text(item, "exampleValue"),
                    index++);
            if (!response.name().isBlank() || !response.dataType().isBlank()) {
                items.add(response);
            }
        }
        items.sort(Comparator.comparingInt(SnapshotResponse::httpStatusCode)
                .thenComparing(SnapshotResponse::mediaType)
                .thenComparing(SnapshotResponse::responseKey));
        return items;
    }

    private Map<String, SnapshotParameter> toParameterMap(List<SnapshotParameter> items) {
        Map<String, SnapshotParameter> result = new LinkedHashMap<>();
        for (SnapshotParameter item : items) {
            result.putIfAbsent(item.parameterKey(), item);
        }
        return result;
    }

    private Map<String, SnapshotResponse> toResponseMap(List<SnapshotResponse> items) {
        Map<String, SnapshotResponse> result = new LinkedHashMap<>();
        for (SnapshotResponse item : items) {
            result.putIfAbsent(item.responseKey(), item);
        }
        return result;
    }

    private int countParameterChanges(List<VersionComparisonResult.ParameterChange> items, String changeType) {
        return (int) items.stream().filter(item -> changeType.equals(item.changeType())).count();
    }

    private int countResponseChanges(List<VersionComparisonResult.ResponseChange> items, String changeType) {
        return (int) items.stream().filter(item -> changeType.equals(item.changeType())).count();
    }

    private List<VersionComparisonResult.BreakingChange> collectBreakingChanges(List<VersionComparisonResult.FieldChange> endpointChanges,
                                                                                List<VersionComparisonResult.ParameterChange> parameterChanges,
                                                                                List<VersionComparisonResult.ResponseChange> responseChanges) {
        List<VersionComparisonResult.BreakingChange> items = new ArrayList<>();

        for (VersionComparisonResult.FieldChange change : endpointChanges) {
            if ("method".equals(change.field()) || "path".equals(change.field())) {
                items.add(new VersionComparisonResult.BreakingChange(
                        "endpoint",
                        "high",
                        "接口路由发生破坏性调整",
                        change.field() + " 从 " + printable(change.beforeValue()) + " 变为 " + printable(change.afterValue())));
            }
        }

        for (VersionComparisonResult.ParameterChange change : parameterChanges) {
            if ("removed".equals(change.changeType())) {
                items.add(new VersionComparisonResult.BreakingChange(
                        "parameter",
                        "high",
                        "请求参数被删除",
                        "参数 " + change.name() + " 已被移除"));
                continue;
            }
            if ("added".equals(change.changeType()) && Boolean.TRUE.equals(change.afterRequired())) {
                items.add(new VersionComparisonResult.BreakingChange(
                        "parameter",
                        "high",
                        "新增必填请求参数",
                        "参数 " + change.name() + " 新增且为必填"));
                continue;
            }
            if ("modified".equals(change.changeType()) && !Objects.equals(change.beforeDataType(), change.afterDataType())) {
                items.add(new VersionComparisonResult.BreakingChange(
                        "parameter",
                        "high",
                        "请求参数类型发生变化",
                        "参数 " + change.name() + " 类型从 " + printable(change.beforeDataType()) + " 变为 " + printable(change.afterDataType())));
                continue;
            }
            if ("modified".equals(change.changeType()) && Boolean.FALSE.equals(change.beforeRequired()) && Boolean.TRUE.equals(change.afterRequired())) {
                items.add(new VersionComparisonResult.BreakingChange(
                        "parameter",
                        "high",
                        "请求参数要求收紧",
                        "参数 " + change.name() + " 从可选变为必填"));
            }
        }

        for (VersionComparisonResult.ResponseChange change : responseChanges) {
            if ("removed".equals(change.changeType())) {
                items.add(new VersionComparisonResult.BreakingChange(
                        "response",
                        "high",
                        "响应字段被删除",
                        "响应字段 " + safeFieldName(change.name()) + " 已被移除"));
                continue;
            }
            if ("modified".equals(change.changeType()) && !Objects.equals(change.beforeDataType(), change.afterDataType())) {
                items.add(new VersionComparisonResult.BreakingChange(
                        "response",
                        "high",
                        "响应字段类型发生变化",
                        "响应字段 " + safeFieldName(change.name()) + " 类型从 " + printable(change.beforeDataType()) + " 变为 " + printable(change.afterDataType())));
            }
        }

        return List.copyOf(items);
    }

    private List<VersionComparisonResult.ChangelogEntry> buildChangelog(List<VersionComparisonResult.FieldChange> endpointChanges,
                                                                        List<VersionComparisonResult.ParameterChange> parameterChanges,
                                                                        List<VersionComparisonResult.ResponseChange> responseChanges) {
        List<VersionComparisonResult.ChangelogEntry> entries = new ArrayList<>();

        endpointChanges.forEach(change -> entries.add(new VersionComparisonResult.ChangelogEntry(
                "endpoint",
                "接口字段更新: " + change.field(),
                printable(change.beforeValue()) + " -> " + printable(change.afterValue()))));

        parameterChanges.forEach(change -> entries.add(new VersionComparisonResult.ChangelogEntry(
                "parameter",
                "请求参数" + changeTypeLabel(change.changeType()) + ": " + change.name(),
                Stream.of(
                                "位置 " + printable(change.sectionType()),
                                "类型 " + printable(change.beforeDataType()) + " -> " + printable(change.afterDataType()))
                        .reduce((left, right) -> left + "，" + right)
                        .orElse("参数定义发生变化"))));

        responseChanges.forEach(change -> entries.add(new VersionComparisonResult.ChangelogEntry(
                "response",
                "响应字段" + changeTypeLabel(change.changeType()) + ": " + safeFieldName(change.name()),
                change.httpStatusCode() + " " + printable(change.mediaType()) + "，类型 " + printable(change.beforeDataType()) + " -> " + printable(change.afterDataType()))));

        return List.copyOf(entries);
    }

    private String changeTypeLabel(String changeType) {
        return switch (changeType) {
            case "added" -> "新增";
            case "removed" -> "删除";
            default -> "修改";
        };
    }

    private String printable(String value) {
        return value == null || value.isBlank() ? "空" : value;
    }

    private String safeFieldName(String name) {
        return name == null || name.isBlank() ? "body" : name;
    }

    private String text(JsonNode node, String fieldName) {
        JsonNode value = node == null ? null : node.get(fieldName);
        if (value == null || value.isNull() || value.isMissingNode()) {
            return "";
        }
        return value.asText("");
    }

    private boolean bool(JsonNode node, String fieldName) {
        JsonNode value = node == null ? null : node.get(fieldName);
        return value != null && !value.isNull() && value.asBoolean(false);
    }

    private String nullSafe(String value) {
        return value == null ? "" : value;
    }

    public record SnapshotSide(
            Long versionId,
            String label,
            String changeSummary,
            boolean draft,
            boolean released,
            Instant releasedAt
    ) {
    }

    private record Snapshot(
            SnapshotEndpoint endpoint,
            List<SnapshotParameter> parameters,
            List<SnapshotResponse> responses
    ) {
        private static Snapshot empty() {
            return new Snapshot(SnapshotEndpoint.empty(), List.of(), List.of());
        }
    }

    private record SnapshotEndpoint(
            String name,
            String method,
            String path,
            String description,
            boolean mockEnabled
    ) {
        private static SnapshotEndpoint empty() {
            return new SnapshotEndpoint("", "", "", "", false);
        }
    }

    private record SnapshotParameter(
            String sectionType,
            String name,
            String dataType,
            boolean required,
            String description,
            String exampleValue
    ) {
        private String parameterKey() {
            return sectionType + ":" + name;
        }

        private boolean sameContent(SnapshotParameter target) {
            return Objects.equals(dataType, target.dataType)
                    && required == target.required
                    && Objects.equals(description, target.description)
                    && Objects.equals(exampleValue, target.exampleValue);
        }
    }

    private record SnapshotResponse(
            int httpStatusCode,
            String mediaType,
            String name,
            String dataType,
            boolean required,
            String description,
            String exampleValue,
            int index
    ) {
        private String responseKey() {
            String nameKey = name.isBlank() ? "$root-" + index : name;
            return httpStatusCode + ":" + mediaType + ":" + nameKey;
        }

        private boolean sameContent(SnapshotResponse target) {
            return Objects.equals(dataType, target.dataType)
                    && required == target.required
                    && Objects.equals(description, target.description)
                    && Objects.equals(exampleValue, target.exampleValue);
        }
    }
}
