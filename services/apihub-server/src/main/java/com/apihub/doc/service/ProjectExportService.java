package com.apihub.doc.service;

import com.apihub.doc.model.EndpointDetail;
import com.apihub.doc.model.ParameterDetail;
import com.apihub.doc.model.ResponseDetail;
import com.apihub.project.model.ProjectDtos.EnvironmentDetail;
import com.apihub.project.model.ProjectDtos.GroupDetail;
import com.apihub.project.model.ProjectDtos.ModuleDetail;
import com.apihub.project.model.ProjectDtos.ProjectDetail;
import com.apihub.project.service.ProjectService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.StringJoiner;

@Service
public class ProjectExportService {

    private final ObjectMapper objectMapper = new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT);
    private final ProjectService projectService;

    public ProjectExportService(ProjectService projectService) {
        this.projectService = projectService;
    }

    public ExportedDocument exportOpenApi(Long userId, Long projectId) {
        ExportProject project = loadProject(userId, projectId);

        Map<String, Object> root = new LinkedHashMap<>();
        root.put("openapi", "3.0.3");
        root.put("info", Map.of(
                "title", project.project().name(),
                "description", blankToEmpty(project.project().description()),
                "version", "draft"));

        if (!project.environments().isEmpty()) {
            root.put("servers", project.environments().stream()
                    .map(environment -> Map.of(
                            "url", environment.baseUrl(),
                            "description", environment.name()))
                    .toList());
        }

        Map<String, Object> paths = new LinkedHashMap<>();
        for (ExportModule module : project.modules()) {
            for (ExportGroup group : module.groups()) {
                for (ExportEndpoint endpoint : group.endpoints()) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> pathItem = (Map<String, Object>) paths.computeIfAbsent(endpoint.detail().path(), key -> new LinkedHashMap<>());
                    pathItem.put(endpoint.detail().method().toLowerCase(Locale.ROOT), buildOperation(module, group, endpoint));
                }
            }
        }
        root.put("paths", paths);

        try {
            byte[] payload = objectMapper.writeValueAsBytes(root);
            return new ExportedDocument(buildFileName(project.project(), "openapi.json"), "application/json", payload);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize OpenAPI export", exception);
        }
    }

    public ExportedDocument exportMarkdown(Long userId, Long projectId) {
        ExportProject project = loadProject(userId, projectId);
        StringBuilder markdown = new StringBuilder();

        markdown.append("# ").append(project.project().name()).append("\n\n");
        if (!blankToEmpty(project.project().description()).isBlank()) {
            markdown.append(project.project().description()).append("\n\n");
        }
        markdown.append("- Project Key: `").append(project.project().projectKey()).append("`\n");
        markdown.append("- Space: `").append(blankToEmpty(project.project().spaceName())).append("`\n\n");

        markdown.append("## Environments\n\n");
        if (project.environments().isEmpty()) {
            markdown.append("_No environments configured._\n\n");
        } else {
            for (EnvironmentDetail environment : project.environments()) {
                markdown.append("- **").append(environment.name()).append("**: `").append(environment.baseUrl()).append("`\n");
            }
            markdown.append("\n");
        }

        markdown.append("## API Modules\n\n");
        for (ExportModule module : project.modules()) {
            markdown.append("### ").append(module.detail().name()).append("\n\n");
            for (ExportGroup group : module.groups()) {
                markdown.append("#### ").append(group.detail().name()).append("\n\n");
                for (ExportEndpoint endpoint : group.endpoints()) {
                    markdown.append("##### ").append(endpoint.detail().name()).append("\n\n");
                    markdown.append("`").append(endpoint.detail().method()).append(" ").append(endpoint.detail().path()).append("`\n\n");
                    if (!blankToEmpty(endpoint.detail().description()).isBlank()) {
                        markdown.append(endpoint.detail().description()).append("\n\n");
                    }

                    markdown.append("Parameters\n\n");
                    appendParameterTable(markdown, endpoint.parameters());
                    markdown.append("\n");

                    markdown.append("Responses\n\n");
                    appendResponseTable(markdown, endpoint.responses());
                    markdown.append("\n");
                }
            }
        }

        return new ExportedDocument(
                buildFileName(project.project(), "docs.md"),
                "text/markdown; charset=UTF-8",
                markdown.toString().getBytes(StandardCharsets.UTF_8));
    }

    private Map<String, Object> buildOperation(ExportModule module, ExportGroup group, ExportEndpoint endpoint) {
        Map<String, Object> operation = new LinkedHashMap<>();
        operation.put("summary", endpoint.detail().name());
        operation.put("description", blankToEmpty(endpoint.detail().description()));
        operation.put("operationId", buildOperationId(endpoint.detail()));
        operation.put("tags", List.of(module.detail().name(), group.detail().name()));

        List<Map<String, Object>> parameters = endpoint.parameters().stream()
                .filter(parameter -> !"body".equalsIgnoreCase(parameter.sectionType()))
                .map(this::buildParameter)
                .toList();
        if (!parameters.isEmpty()) {
            operation.put("parameters", parameters);
        }

        List<ParameterDetail> bodyParameters = endpoint.parameters().stream()
                .filter(parameter -> "body".equalsIgnoreCase(parameter.sectionType()))
                .toList();
        if (!bodyParameters.isEmpty()) {
            operation.put("requestBody", buildRequestBody(bodyParameters));
        }

        operation.put("responses", buildResponses(endpoint.responses()));
        return operation;
    }

    private Map<String, Object> buildParameter(ParameterDetail parameter) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("name", parameter.name());
        value.put("in", normalizeParameterIn(parameter.sectionType()));
        value.put("required", "path".equalsIgnoreCase(parameter.sectionType()) || parameter.required());
        value.put("description", blankToEmpty(parameter.description()));
        value.put("schema", buildScalarSchema(parameter.dataType(), parameter.exampleValue()));
        return value;
    }

    private Map<String, Object> buildRequestBody(List<ParameterDetail> parameters) {
        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("required", parameters.stream().anyMatch(ParameterDetail::required));
        requestBody.put("content", Map.of(
                "application/json", Map.of(
                        "schema", buildObjectSchemaFromParameters(parameters))));
        return requestBody;
    }

    private Map<String, Object> buildResponses(List<ResponseDetail> responses) {
        Map<String, List<ResponseDetail>> grouped = new LinkedHashMap<>();
        for (ResponseDetail response : responses) {
            String key = response.httpStatusCode() + "|" + blankToEmpty(response.mediaType());
            grouped.computeIfAbsent(key, ignored -> new ArrayList<>()).add(response);
        }

        if (grouped.isEmpty()) {
            return Map.of("200", Map.of("description", "Success"));
        }

        Map<String, Map<String, Object>> result = new LinkedHashMap<>();
        for (Map.Entry<String, List<ResponseDetail>> entry : grouped.entrySet()) {
            List<ResponseDetail> items = entry.getValue();
            ResponseDetail first = items.get(0);
            String statusCode = String.valueOf(first.httpStatusCode());
            Map<String, Object> responseItem = result.computeIfAbsent(statusCode, ignored -> new LinkedHashMap<>());
            responseItem.putIfAbsent("description", buildResponseDescription(items));
            @SuppressWarnings("unchecked")
            Map<String, Object> content = (Map<String, Object>) responseItem.computeIfAbsent("content", ignored -> new LinkedHashMap<>());
            content.put(blankToEmpty(first.mediaType()).isBlank() ? "application/json" : first.mediaType(), Map.of("schema", buildResponseSchema(items)));
        }
        return new LinkedHashMap<>(result);
    }

    private Map<String, Object> buildResponseSchema(List<ResponseDetail> items) {
        if (items.size() == 1 && blankToEmpty(items.get(0).name()).isBlank()) {
            return buildScalarSchema(items.get(0).dataType(), items.get(0).exampleValue());
        }

        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        Map<String, Object> properties = new LinkedHashMap<>();
        List<String> requiredNames = new ArrayList<>();
        for (ResponseDetail item : items) {
            String name = blankToEmpty(item.name()).isBlank() ? "root" : item.name();
            properties.put(name, buildScalarSchema(item.dataType(), item.exampleValue(), item.description()));
            if (item.required() && !blankToEmpty(item.name()).isBlank()) {
                requiredNames.add(item.name());
            }
        }
        schema.put("properties", properties);
        if (!requiredNames.isEmpty()) {
            schema.put("required", requiredNames);
        }
        return schema;
    }

    private Map<String, Object> buildObjectSchemaFromParameters(List<ParameterDetail> parameters) {
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        Map<String, Object> properties = new LinkedHashMap<>();
        List<String> requiredNames = new ArrayList<>();
        for (ParameterDetail parameter : parameters) {
            properties.put(parameter.name(), buildScalarSchema(parameter.dataType(), parameter.exampleValue(), parameter.description()));
            if (parameter.required()) {
                requiredNames.add(parameter.name());
            }
        }
        schema.put("properties", properties);
        if (!requiredNames.isEmpty()) {
            schema.put("required", requiredNames);
        }
        return schema;
    }

    private Map<String, Object> buildScalarSchema(String dataType, String exampleValue) {
        return buildScalarSchema(dataType, exampleValue, null);
    }

    private Map<String, Object> buildScalarSchema(String dataType, String exampleValue, String description) {
        Map<String, Object> schema = new LinkedHashMap<>();
        String normalized = blankToEmpty(dataType).trim().toLowerCase(Locale.ROOT);
        switch (normalized) {
            case "integer", "int", "long" -> {
                schema.put("type", "integer");
                if ("long".equals(normalized)) {
                    schema.put("format", "int64");
                }
            }
            case "number", "double", "float", "decimal" -> schema.put("type", "number");
            case "boolean", "bool" -> schema.put("type", "boolean");
            case "array", "list" -> {
                schema.put("type", "array");
                schema.put("items", Map.of("type", "string"));
            }
            case "object", "map", "json" -> schema.put("type", "object");
            default -> schema.put("type", "string");
        }
        if (!blankToEmpty(description).isBlank()) {
            schema.put("description", description);
        }
        if (!blankToEmpty(exampleValue).isBlank()) {
            schema.put("example", exampleValue);
        }
        return schema;
    }

    private void appendParameterTable(StringBuilder markdown, List<ParameterDetail> parameters) {
        if (parameters.isEmpty()) {
            markdown.append("_No parameters._\n");
            return;
        }

        markdown.append("| Location | Name | Type | Required | Description | Example |\n");
        markdown.append("| --- | --- | --- | --- | --- | --- |\n");
        for (ParameterDetail parameter : parameters) {
            markdown.append("| ")
                    .append(escapeMarkdown(parameter.sectionType())).append(" | ")
                    .append(escapeMarkdown(parameter.name())).append(" | ")
                    .append(escapeMarkdown(parameter.dataType())).append(" | ")
                    .append(parameter.required() ? "Yes" : "No").append(" | ")
                    .append(escapeMarkdown(parameter.description())).append(" | ")
                    .append(escapeMarkdown(parameter.exampleValue())).append(" |\n");
        }
    }

    private void appendResponseTable(StringBuilder markdown, List<ResponseDetail> responses) {
        if (responses.isEmpty()) {
            markdown.append("_No responses defined._\n");
            return;
        }

        markdown.append("| Status | Media Type | Field | Type | Required | Description | Example |\n");
        markdown.append("| --- | --- | --- | --- | --- | --- | --- |\n");
        for (ResponseDetail response : responses) {
            markdown.append("| ")
                    .append(response.httpStatusCode()).append(" | ")
                    .append(escapeMarkdown(response.mediaType())).append(" | ")
                    .append(escapeMarkdown(blankToEmpty(response.name()).isBlank() ? "(root)" : response.name())).append(" | ")
                    .append(escapeMarkdown(response.dataType())).append(" | ")
                    .append(response.required() ? "Yes" : "No").append(" | ")
                    .append(escapeMarkdown(response.description())).append(" | ")
                    .append(escapeMarkdown(response.exampleValue())).append(" |\n");
        }
    }

    private String buildResponseDescription(List<ResponseDetail> items) {
        StringJoiner joiner = new StringJoiner(", ");
        for (ResponseDetail item : items) {
            if (!blankToEmpty(item.description()).isBlank()) {
                joiner.add(item.description());
            }
        }
        return joiner.length() == 0 ? "Response payload" : joiner.toString();
    }

    private ExportProject loadProject(Long userId, Long projectId) {
        ProjectDetail project = projectService.getProject(userId, projectId);
        List<EnvironmentDetail> environments = projectService.listEnvironments(userId, projectId);
        List<ExportModule> modules = new ArrayList<>();
        for (ModuleDetail module : projectService.listModules(userId, projectId)) {
            List<ExportGroup> groups = new ArrayList<>();
            for (GroupDetail group : projectService.listGroups(userId, module.id())) {
                List<ExportEndpoint> endpoints = new ArrayList<>();
                for (EndpointDetail endpoint : projectService.listEndpoints(userId, group.id())) {
                    endpoints.add(new ExportEndpoint(
                            endpoint,
                            projectService.listParameters(userId, endpoint.id()),
                            projectService.listResponses(userId, endpoint.id())));
                }
                groups.add(new ExportGroup(group, endpoints));
            }
            modules.add(new ExportModule(module, groups));
        }
        return new ExportProject(project, environments, modules);
    }

    private String normalizeParameterIn(String sectionType) {
        String normalized = blankToEmpty(sectionType).trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "path", "query", "header", "cookie" -> normalized;
            default -> "query";
        };
    }

    private String buildOperationId(EndpointDetail endpoint) {
        String seed = endpoint.method() + "_" + endpoint.path();
        StringBuilder value = new StringBuilder();
        for (char ch : seed.toCharArray()) {
            value.append(Character.isLetterOrDigit(ch) ? ch : '_');
        }
        return value.toString().replaceAll("_+", "_");
    }

    private String buildFileName(ProjectDetail project, String suffix) {
        String projectKey = blankToEmpty(project.projectKey()).isBlank() ? "project" : project.projectKey();
        return projectKey.replaceAll("[^a-zA-Z0-9_-]", "-") + "-" + suffix;
    }

    private String blankToEmpty(String value) {
        return value == null ? "" : value;
    }

    private String escapeMarkdown(String value) {
        return blankToEmpty(value)
                .replace("|", "\\|")
                .replace("\n", "<br/>");
    }

    public record ExportedDocument(String fileName, String contentType, byte[] content) {
    }

    private record ExportProject(ProjectDetail project, List<EnvironmentDetail> environments, List<ExportModule> modules) {
    }

    private record ExportModule(ModuleDetail detail, List<ExportGroup> groups) {
    }

    private record ExportGroup(GroupDetail detail, List<ExportEndpoint> endpoints) {
    }

    private record ExportEndpoint(EndpointDetail detail, List<ParameterDetail> parameters, List<ResponseDetail> responses) {
    }
}
