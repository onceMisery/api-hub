package com.apihub.ai.model;

import java.time.Instant;
import java.util.List;

public final class AiDtos {

    private AiDtos() {
    }

    public record ProjectAiSettingsDetail(
            Long id,
            Long projectId,
            String providerType,
            String baseUrl,
            String defaultModel,
            String descriptionModel,
            String mockModel,
            String codeModel,
            int timeoutMs,
            boolean enabled,
            boolean apiKeyConfigured,
            boolean canManage,
            Instant updatedAt
    ) {
    }

    public record UpdateProjectAiSettingsRequest(
            String providerType,
            String baseUrl,
            String apiKey,
            String defaultModel,
            String descriptionModel,
            String mockModel,
            String codeModel,
            Integer timeoutMs,
            Boolean enabled
    ) {
    }

    public record AiConnectionTestResult(
            boolean success,
            String message,
            String providerType,
            String baseUrl,
            String model
    ) {
    }

    public record AiParameterInput(
            String sectionType,
            String name,
            String dataType,
            Boolean required,
            String description,
            String exampleValue
    ) {
    }

    public record AiResponseInput(
            Integer httpStatusCode,
            String mediaType,
            String name,
            String dataType,
            Boolean required,
            String description,
            String exampleValue
    ) {
    }

    public record EndpointDraftContext(
            String name,
            String method,
            String path,
            String description,
            List<AiParameterInput> parameters,
            List<AiResponseInput> responses
    ) {
    }

    public record GenerateEndpointDescriptionRequest(
            String instructions,
            EndpointDraftContext draft
    ) {
    }

    public record GeneratedDescriptionResult(String content) {
    }

    public record GenerateEndpointMockRequest(
            String instructions,
            EndpointDraftContext draft
    ) {
    }

    public record GeneratedMockResult(
            String templateMode,
            String body
    ) {
    }

    public record GenerateEndpointCodeSnippetsRequest(
            List<String> languages,
            String instructions,
            EndpointDraftContext draft
    ) {
    }

    public record AiCodeSnippet(
            String language,
            String title,
            String code
    ) {
    }

    public record GeneratedCodeSnippetsResult(List<AiCodeSnippet> snippets) {
    }

    public record AiHeaderInput(String name, String value) {
    }

    public record AiAssertionInput(
            String type,
            String expression,
            String expectedValue
    ) {
    }

    public record AiExtractorInput(
            String variableName,
            String sourceType,
            String expression
    ) {
    }

    public record AiSuggestedTestCase(
            String name,
            String category,
            String purpose,
            String queryString,
            List<AiHeaderInput> headers,
            String body,
            List<AiAssertionInput> assertions,
            List<AiExtractorInput> extractors
    ) {
    }

    public record GenerateEndpointTestCasesRequest(
            List<String> categories,
            String instructions,
            EndpointDraftContext draft
    ) {
    }

    public record GeneratedTestCasesResult(List<AiSuggestedTestCase> cases) {
    }

    public record GenerateImpactAnalysisRequest(
            Long baseVersionId,
            Long targetVersionId,
            String instructions
    ) {
    }

    public record AiImpactAnalysisResult(
            String level,
            String summary,
            List<String> risks,
            List<String> recommendations,
            String compatibilityAdvice
    ) {
    }

    public record AskProjectQuestionRequest(
            String question,
            Long endpointId,
            String scopeHint
    ) {
    }

    public record AiReferenceItem(
            Long endpointId,
            String title,
            String method,
            String path,
            String sourceType,
            String snippet
    ) {
    }

    public record ProjectAiAnswerResult(
            String question,
            String answer,
            boolean hasContext,
            List<AiReferenceItem> references,
            List<Long> matchedEndpointIds
    ) {
    }
}
