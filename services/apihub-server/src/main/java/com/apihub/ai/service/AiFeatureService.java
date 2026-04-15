package com.apihub.ai.service;

import com.apihub.ai.model.AiDtos.AiCodeSnippet;
import com.apihub.ai.model.AiDtos.AiHeaderInput;
import com.apihub.ai.model.AiDtos.AiImpactAnalysisResult;
import com.apihub.ai.model.AiDtos.AiParameterInput;
import com.apihub.ai.model.AiDtos.AiResponseInput;
import com.apihub.ai.model.AiDtos.AiSuggestedTestCase;
import com.apihub.ai.model.AiDtos.EndpointDraftContext;
import com.apihub.ai.model.AiDtos.GenerateEndpointTestCasesRequest;
import com.apihub.ai.model.AiDtos.GenerateEndpointCodeSnippetsRequest;
import com.apihub.ai.model.AiDtos.GenerateEndpointDescriptionRequest;
import com.apihub.ai.model.AiDtos.GenerateEndpointMockRequest;
import com.apihub.ai.model.AiDtos.GenerateImpactAnalysisRequest;
import com.apihub.ai.model.AiDtos.GeneratedCodeSnippetsResult;
import com.apihub.ai.model.AiDtos.GeneratedDescriptionResult;
import com.apihub.ai.model.AiDtos.GeneratedMockResult;
import com.apihub.ai.model.AiDtos.GeneratedTestCasesResult;
import com.apihub.ai.repository.AiSettingsRepository.ProjectAiSettingsRecord;
import com.apihub.doc.model.EndpointDetail;
import com.apihub.doc.model.ParameterDetail;
import com.apihub.doc.model.ResponseDetail;
import com.apihub.doc.model.VersionComparisonResult;
import com.apihub.doc.model.VersionDetail;
import com.apihub.doc.repository.EndpointRepository;
import com.apihub.doc.service.VersionComparisonService;
import com.apihub.project.model.ProjectDtos.EnvironmentDetail;
import com.apihub.project.repository.ProjectRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class AiFeatureService {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final AiSettingsService aiSettingsService;
    private final AiGatewayService aiGatewayService;
    private final EndpointRepository endpointRepository;
    private final ProjectRepository projectRepository;
    private final VersionComparisonService versionComparisonService;

    public AiFeatureService(AiSettingsService aiSettingsService,
                            AiGatewayService aiGatewayService,
                            EndpointRepository endpointRepository,
                            ProjectRepository projectRepository,
                            VersionComparisonService versionComparisonService) {
        this.aiSettingsService = aiSettingsService;
        this.aiGatewayService = aiGatewayService;
        this.endpointRepository = endpointRepository;
        this.projectRepository = projectRepository;
        this.versionComparisonService = versionComparisonService;
    }

    public GeneratedDescriptionResult generateDescription(Long userId,
                                                          Long endpointId,
                                                          GenerateEndpointDescriptionRequest request) {
        ResolvedEndpointContext context = resolveContext(userId, endpointId, request == null ? null : request.draft());
        ProjectAiSettingsRecord settings = aiSettingsService.requireActiveSettings(context.projectId());
        String model = selectModel(settings.descriptionModel(), settings.defaultModel());
        String result = aiGatewayService.generateText(
                settings,
                model,
                AiPromptTemplates.descriptionSystemPrompt(),
                AiPromptTemplates.buildDescriptionPrompt(context, request == null ? null : request.instructions()),
                0.35d);
        return new GeneratedDescriptionResult(result.trim());
    }

    public GeneratedMockResult generateMock(Long userId,
                                            Long endpointId,
                                            GenerateEndpointMockRequest request) {
        ResolvedEndpointContext context = resolveContext(userId, endpointId, request == null ? null : request.draft());
        if (context.responses().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Endpoint response schema is empty");
        }
        ProjectAiSettingsRecord settings = aiSettingsService.requireActiveSettings(context.projectId());
        String model = selectModel(settings.mockModel(), settings.defaultModel());
        String raw = aiGatewayService.generateText(
                settings,
                model,
                AiPromptTemplates.mockSystemPrompt(),
                AiPromptTemplates.buildMockPrompt(context, request == null ? null : request.instructions()),
                0.55d);
        return new GeneratedMockResult("plain", normalizeJsonBody(raw));
    }

    public GeneratedCodeSnippetsResult generateCodeSnippets(Long userId,
                                                            Long endpointId,
                                                            GenerateEndpointCodeSnippetsRequest request) {
        ResolvedEndpointContext context = resolveContext(userId, endpointId, request == null ? null : request.draft());
        ProjectAiSettingsRecord settings = aiSettingsService.requireActiveSettings(context.projectId());
        String model = selectModel(settings.codeModel(), settings.defaultModel());
        List<String> languages = normalizeLanguages(request == null ? null : request.languages());
        String baseUrl = resolveBaseUrl(context.projectId());
        String raw = aiGatewayService.generateText(
                settings,
                model,
                AiPromptTemplates.codeSystemPrompt(),
                AiPromptTemplates.buildCodePrompt(context, baseUrl, languages, request == null ? null : request.instructions()),
                0.25d);
        return new GeneratedCodeSnippetsResult(parseSnippets(raw, languages));
    }

    public GeneratedTestCasesResult generateTestCases(Long userId,
                                                      Long endpointId,
                                                      GenerateEndpointTestCasesRequest request) {
        ResolvedEndpointContext context = resolveContext(userId, endpointId, request == null ? null : request.draft());
        ProjectAiSettingsRecord settings = aiSettingsService.requireActiveSettings(context.projectId());
        String raw = aiGatewayService.generateText(
                settings,
                settings.defaultModel(),
                AiPromptTemplates.testCaseSystemPrompt(),
                AiPromptTemplates.buildTestCasePrompt(context, normalizeCategories(request == null ? null : request.categories()), request == null ? null : request.instructions()),
                0.35d);
        return new GeneratedTestCasesResult(parseTestCases(raw));
    }

    public AiImpactAnalysisResult generateImpactAnalysis(Long userId,
                                                         Long endpointId,
                                                         GenerateImpactAnalysisRequest request) {
        VersionComparisonResult comparison = buildComparison(userId, endpointId, request);
        ProjectAiSettingsRecord settings = aiSettingsService.requireActiveSettings(requireEndpointReference(endpointId).projectId());
        String comparisonJson = writeJson(comparison);
        String raw = aiGatewayService.generateText(
                settings,
                settings.defaultModel(),
                AiPromptTemplates.impactSystemPrompt(),
                AiPromptTemplates.buildImpactPrompt(comparisonJson, request == null ? null : request.instructions()),
                0.2d);
        return parseImpactAnalysis(raw);
    }

    private ResolvedEndpointContext resolveContext(Long userId, Long endpointId, EndpointDraftContext draft) {
        EndpointRepository.EndpointReference reference = requireEndpointReference(endpointId);
        if (!projectRepository.canAccessProject(userId, reference.projectId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Project read access is required");
        }

        EndpointDetail endpoint = endpointRepository.findEndpoint(endpointId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Endpoint not found"));
        List<ResolvedParameter> parameters = draft != null && draft.parameters() != null
                ? draft.parameters().stream().map(this::toResolvedParameter).toList()
                : endpointRepository.listParameters(endpointId).stream().map(this::toResolvedParameter).toList();
        List<ResolvedResponse> responses = draft != null && draft.responses() != null
                ? draft.responses().stream().map(this::toResolvedResponse).toList()
                : endpointRepository.listResponses(endpointId).stream().map(this::toResolvedResponse).toList();

        return new ResolvedEndpointContext(
                reference.projectId(),
                normalizeDraftValue(draft == null ? null : draft.name(), endpoint.name()),
                normalizeDraftValue(draft == null ? null : draft.method(), endpoint.method()),
                normalizeDraftValue(draft == null ? null : draft.path(), endpoint.path()),
                normalizeDraftValue(draft == null ? null : draft.description(), endpoint.description()),
                parameters,
                responses);
    }

    private ResolvedParameter toResolvedParameter(ParameterDetail detail) {
        return new ResolvedParameter(detail.sectionType(), detail.name(), detail.dataType(), detail.required(), detail.description(), detail.exampleValue());
    }

    private ResolvedParameter toResolvedParameter(AiParameterInput input) {
        return new ResolvedParameter(input.sectionType(), input.name(), input.dataType(), Boolean.TRUE.equals(input.required()), input.description(), input.exampleValue());
    }

    private ResolvedResponse toResolvedResponse(ResponseDetail detail) {
        return new ResolvedResponse(detail.httpStatusCode(), detail.mediaType(), detail.name(), detail.dataType(), detail.required(), detail.description(), detail.exampleValue());
    }

    private ResolvedResponse toResolvedResponse(AiResponseInput input) {
        return new ResolvedResponse(input.httpStatusCode() == null ? 200 : input.httpStatusCode(), input.mediaType(), input.name(), input.dataType(), Boolean.TRUE.equals(input.required()), input.description(), input.exampleValue());
    }

    private String normalizeDraftValue(String draftValue, String persistedValue) {
        return draftValue == null || draftValue.isBlank() ? persistedValue : draftValue.trim();
    }

    private String selectModel(String specificModel, String defaultModel) {
        return specificModel == null || specificModel.isBlank() ? defaultModel : specificModel;
    }

    private String resolveBaseUrl(Long projectId) {
        List<EnvironmentDetail> environments = projectRepository.listEnvironments(projectId);
        return environments.stream()
                .filter(EnvironmentDetail::isDefault)
                .findFirst()
                .or(() -> environments.stream().findFirst())
                .map(EnvironmentDetail::baseUrl)
                .filter(value -> value != null && !value.isBlank())
                .orElse("https://api.example.com");
    }

    private List<String> normalizeLanguages(List<String> languages) {
        if (languages == null || languages.isEmpty()) {
            return List.of("curl", "typescript", "python", "java");
        }
        Set<String> ordered = new LinkedHashSet<>();
        for (String language : languages) {
            if (language != null && !language.isBlank()) {
                ordered.add(language.trim().toLowerCase(Locale.ROOT));
            }
        }
        return ordered.isEmpty() ? List.of("curl", "typescript", "python", "java") : List.copyOf(ordered);
    }

    private String normalizeJsonBody(String raw) {
        String extracted = extractJsonPayload(raw);
        try {
            JsonNode node = OBJECT_MAPPER.readTree(extracted);
            return OBJECT_MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(node);
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI did not return valid JSON");
        }
    }

    private List<AiSuggestedTestCase> parseTestCases(String raw) {
        String extracted = extractJsonPayload(raw);
        try {
          JsonNode root = OBJECT_MAPPER.readTree(extracted);
          JsonNode casesNode = root.path("cases");
          if (!casesNode.isArray()) {
              throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI did not return test case JSON");
          }
          List<AiSuggestedTestCase> cases = new ArrayList<>();
          for (JsonNode node : casesNode) {
              cases.add(new AiSuggestedTestCase(
                      text(node, "name"),
                      text(node, "category"),
                      text(node, "purpose"),
                      text(node, "queryString"),
                      parseHeaders(node.path("headers")),
                      text(node, "body"),
                      parseAssertions(node.path("assertions")),
                      parseExtractors(node.path("extractors"))));
          }
          return cases.stream().filter(item -> item.name() != null && !item.name().isBlank()).toList();
        } catch (JsonProcessingException exception) {
          throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI did not return valid test case JSON", exception);
        }
    }

    private List<AiCodeSnippet> parseSnippets(String raw, List<String> languages) {
        String extracted = extractJsonPayload(raw);
        try {
            JsonNode root = OBJECT_MAPPER.readTree(extracted);
            JsonNode snippetsNode = root.path("snippets");
            if (!snippetsNode.isArray()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI did not return snippet JSON");
            }
            List<AiCodeSnippet> snippets = new ArrayList<>();
            for (JsonNode node : snippetsNode) {
                String language = text(node, "language");
                String title = text(node, "title");
                String code = text(node, "code");
                if (!language.isBlank() && !code.isBlank()) {
                    snippets.add(new AiCodeSnippet(language, title.isBlank() ? language.toUpperCase(Locale.ROOT) : title, code));
                }
            }
            if (!snippets.isEmpty()) {
                return snippets;
            }
        } catch (JsonProcessingException ignored) {
        }
        return languages.stream()
                .map(language -> new AiCodeSnippet(language, language.toUpperCase(Locale.ROOT), raw.trim()))
                .toList();
    }

    private AiImpactAnalysisResult parseImpactAnalysis(String raw) {
        String extracted = extractJsonPayload(raw);
        try {
            JsonNode node = OBJECT_MAPPER.readTree(extracted);
            return new AiImpactAnalysisResult(
                    text(node, "level"),
                    text(node, "summary"),
                    readStringList(node.path("risks")),
                    readStringList(node.path("recommendations")),
                    text(node, "compatibilityAdvice"));
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI did not return valid impact analysis JSON", exception);
        }
    }

    private String extractJsonPayload(String raw) {
        String trimmed = raw == null ? "" : raw.trim();
        if (trimmed.startsWith("```")) {
            int firstNewline = trimmed.indexOf('\n');
            int lastFence = trimmed.lastIndexOf("```");
            if (firstNewline >= 0 && lastFence > firstNewline) {
                trimmed = trimmed.substring(firstNewline + 1, lastFence).trim();
            }
        }
        return trimmed;
    }

    private EndpointRepository.EndpointReference requireEndpointReference(Long endpointId) {
        return endpointRepository.findEndpointReference(endpointId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Endpoint not found"));
    }

    private VersionComparisonResult buildComparison(Long userId,
                                                    Long endpointId,
                                                    GenerateImpactAnalysisRequest request) {
        EndpointRepository.EndpointReference reference = requireEndpointReference(endpointId);
        if (!projectRepository.canAccessProject(userId, reference.projectId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Project read access is required");
        }
        if (request == null || request.baseVersionId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Base version is required");
        }
        VersionDetail baseVersion = endpointRepository.findVersion(request.baseVersionId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Base version not found"));
        if (!endpointId.equals(baseVersion.endpointId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Base version does not belong to current endpoint");
        }

        VersionComparisonService.SnapshotSide baseSide = new VersionComparisonService.SnapshotSide(
                baseVersion.id(),
                baseVersion.version(),
                baseVersion.changeSummary(),
                false,
                baseVersion.released(),
                baseVersion.releasedAt());

        VersionComparisonService.SnapshotSide targetSide;
        String targetSnapshotJson;
        if (request.targetVersionId() == null) {
            EndpointDetail endpoint = endpointRepository.findEndpoint(endpointId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Endpoint not found"));
            targetSnapshotJson = versionComparisonService.buildDraftSnapshotJson(
                    endpoint,
                    endpointRepository.listParameters(endpointId),
                    endpointRepository.listResponses(endpointId));
            targetSide = new VersionComparisonService.SnapshotSide(
                    null,
                    endpoint.releasedVersionLabel() == null ? "Current editable draft" : "Compare against current editable draft",
                    null,
                    true,
                    false,
                    null);
        } else {
            VersionDetail targetVersion = endpointRepository.findVersion(request.targetVersionId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Target version not found"));
            if (!endpointId.equals(targetVersion.endpointId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Target version does not belong to current endpoint");
            }
            targetSnapshotJson = targetVersion.snapshotJson();
            targetSide = new VersionComparisonService.SnapshotSide(
                    targetVersion.id(),
                    targetVersion.version(),
                    targetVersion.changeSummary(),
                    false,
                    targetVersion.released(),
                    targetVersion.releasedAt());
        }

        return versionComparisonService.compareSnapshots(
                endpointId,
                baseSide,
                baseVersion.snapshotJson(),
                targetSide,
                targetSnapshotJson);
    }

    private String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? "" : value.asText("");
    }

    private List<String> readStringList(JsonNode node) {
        if (!node.isArray()) {
            return List.of();
        }
        List<String> values = new ArrayList<>();
        for (JsonNode item : node) {
            if (item.isTextual() && !item.asText().isBlank()) {
                values.add(item.asText());
            }
        }
        return values;
    }

    private List<AiHeaderInput> parseHeaders(JsonNode node) {
        if (!node.isArray()) {
            return List.of();
        }
        List<AiHeaderInput> items = new ArrayList<>();
        for (JsonNode item : node) {
            String name = text(item, "name");
            if (!name.isBlank()) {
                items.add(new AiHeaderInput(name, text(item, "value")));
            }
        }
        return items;
    }

    private List<com.apihub.ai.model.AiDtos.AiAssertionInput> parseAssertions(JsonNode node) {
        if (!node.isArray()) {
            return List.of();
        }
        List<com.apihub.ai.model.AiDtos.AiAssertionInput> items = new ArrayList<>();
        for (JsonNode item : node) {
            String type = text(item, "type");
            if (!type.isBlank()) {
                items.add(new com.apihub.ai.model.AiDtos.AiAssertionInput(type, text(item, "expression"), text(item, "expectedValue")));
            }
        }
        return items;
    }

    private List<com.apihub.ai.model.AiDtos.AiExtractorInput> parseExtractors(JsonNode node) {
        if (!node.isArray()) {
            return List.of();
        }
        List<com.apihub.ai.model.AiDtos.AiExtractorInput> items = new ArrayList<>();
        for (JsonNode item : node) {
            String variableName = text(item, "variableName");
            String sourceType = text(item, "sourceType");
            String expression = text(item, "expression");
            if (!variableName.isBlank() && !sourceType.isBlank() && !expression.isBlank()) {
                items.add(new com.apihub.ai.model.AiDtos.AiExtractorInput(variableName, sourceType, expression));
            }
        }
        return items;
    }

    private List<String> normalizeCategories(List<String> categories) {
        if (categories == null || categories.isEmpty()) {
            return List.of("happy_path", "boundary", "invalid", "auth");
        }
        return categories.stream()
                .filter(item -> item != null && !item.isBlank())
                .map(String::trim)
                .distinct()
                .toList();
    }

    private String writeJson(Object value) {
        try {
            return OBJECT_MAPPER.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to serialize AI context", exception);
        }
    }

    public record ResolvedEndpointContext(
            Long projectId,
            String name,
            String method,
            String path,
            String description,
            List<ResolvedParameter> parameters,
            List<ResolvedResponse> responses
    ) {
    }

    public record ResolvedParameter(
            String sectionType,
            String name,
            String dataType,
            boolean required,
            String description,
            String exampleValue
    ) {
    }

    public record ResolvedResponse(
            int httpStatusCode,
            String mediaType,
            String name,
            String dataType,
            boolean required,
            String description,
            String exampleValue
    ) {
    }
}
