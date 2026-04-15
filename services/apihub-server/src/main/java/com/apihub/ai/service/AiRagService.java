package com.apihub.ai.service;

import com.apihub.ai.model.AiDtos.AiReferenceItem;
import com.apihub.ai.model.AiDtos.AskProjectQuestionRequest;
import com.apihub.ai.model.AiDtos.ProjectAiAnswerResult;
import com.apihub.ai.repository.AiKnowledgeChunkRepository;
import com.apihub.ai.repository.AiKnowledgeChunkRepository.KnowledgeChunkRecord;
import com.apihub.ai.repository.AiKnowledgeChunkRepository.KnowledgeChunkUpsertItem;
import com.apihub.ai.repository.AiSettingsRepository.ProjectAiSettingsRecord;
import com.apihub.doc.model.EndpointDetail;
import com.apihub.doc.model.ParameterDetail;
import com.apihub.doc.model.ResponseDetail;
import com.apihub.doc.repository.EndpointRepository;
import com.apihub.project.model.ProjectDtos.GroupDetail;
import com.apihub.project.model.ProjectDtos.ModuleDetail;
import com.apihub.project.model.ProjectDtos.ProjectDetail;
import com.apihub.project.repository.ProjectRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AiRagService {

    private static final int MAX_CONTEXT_CHUNKS = 6;
    private static final int MAX_CONTEXT_CHARS = 1000;
    private static final int MAX_SNIPPET_CHARS = 180;

    private final AiSettingsService aiSettingsService;
    private final AiGatewayService aiGatewayService;
    private final AiKnowledgeChunkRepository aiKnowledgeChunkRepository;
    private final EndpointRepository endpointRepository;
    private final ProjectRepository projectRepository;

    public AiRagService(AiSettingsService aiSettingsService,
                        AiGatewayService aiGatewayService,
                        AiKnowledgeChunkRepository aiKnowledgeChunkRepository,
                        EndpointRepository endpointRepository,
                        ProjectRepository projectRepository) {
        this.aiSettingsService = aiSettingsService;
        this.aiGatewayService = aiGatewayService;
        this.aiKnowledgeChunkRepository = aiKnowledgeChunkRepository;
        this.endpointRepository = endpointRepository;
        this.projectRepository = projectRepository;
    }

    @Transactional
    public void reindexEndpoint(Long endpointId) {
        endpointRepository.findEndpointReference(endpointId).ifPresentOrElse(reference -> {
            EndpointDetail endpoint = endpointRepository.findEndpoint(endpointId).orElse(null);
            if (endpoint == null) {
                aiKnowledgeChunkRepository.deleteByEndpoint(endpointId);
                return;
            }
            aiKnowledgeChunkRepository.replaceChunks(reference.projectId(), endpointId, buildEndpointChunks(reference, endpoint));
        }, () -> aiKnowledgeChunkRepository.deleteByEndpoint(endpointId));
    }

    @Transactional
    public void deleteEndpointIndex(Long endpointId) {
        aiKnowledgeChunkRepository.deleteByEndpoint(endpointId);
    }

    @Transactional
    public void reindexModule(Long moduleId) {
        // 当前 RAG 只索引接口级文档。
    }

    @Transactional
    public void deleteModuleIndex(Long moduleId) {
        // 当前 RAG 只索引接口级文档。
    }

    @Transactional
    public void reindexGroup(Long groupId) {
        // 当前 RAG 只索引接口级文档。
    }

    @Transactional
    public void deleteGroupIndex(Long groupId) {
        // 当前 RAG 只索引接口级文档。
    }

    @Transactional(readOnly = true)
    public ProjectAiAnswerResult answerQuestion(Long userId, Long projectId, AskProjectQuestionRequest request) {
        if (request == null || request.question() == null || request.question().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Question is required");
        }
        if (!projectRepository.canAccessProject(userId, projectId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Project read access is required");
        }

        ProjectAiSettingsRecord settings = aiSettingsService.requireActiveSettings(projectId);
        List<KnowledgeChunkRecord> allChunks = aiKnowledgeChunkRepository.listByProject(projectId);
        List<KnowledgeChunkRecord> scopedChunks = request.endpointId() == null
                ? allChunks
                : allChunks.stream().filter(chunk -> Objects.equals(chunk.endpointId(), request.endpointId())).toList();
        List<ScoredChunk> rankedChunks = rankChunks(request.question(), scopedChunks, request.endpointId(), MAX_CONTEXT_CHUNKS);

        if (rankedChunks.isEmpty() || rankedChunks.get(0).score() <= 0) {
            return new ProjectAiAnswerResult(
                    request.question().trim(),
                    "当前项目知识库中缺少足够相关的文档，暂时无法给出可靠答案。请先完善接口说明、参数和响应定义，或者换一个更具体的问题。",
                    false,
                    List.of(),
                    List.of());
        }

        String contextBundle = buildContextBundle(rankedChunks);
        String projectName = projectRepository.findProject(projectId)
                .map(ProjectDetail::name)
                .orElse("项目 #" + projectId);
        String rawAnswer = aiGatewayService.generateText(
                settings,
                settings.defaultModel(),
                AiPromptTemplates.assistantSystemPrompt(),
                AiPromptTemplates.buildAssistantPrompt(projectName, request.question(), normalizeScopeHint(request.scopeHint()), contextBundle),
                0.2d);
        String answer = rawAnswer == null ? "" : rawAnswer.trim();
        if (answer.isBlank()) {
            answer = "AI 未返回有效答案。";
        }
        List<AiReferenceItem> references = buildReferences(rankedChunks);
        List<Long> matchedEndpointIds = rankedChunks.stream()
                .map(scoredChunk -> scoredChunk.chunk().endpointId())
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        return new ProjectAiAnswerResult(request.question().trim(), answer, true, references, matchedEndpointIds);
    }

    private List<KnowledgeChunkUpsertItem> buildEndpointChunks(EndpointRepository.EndpointReference reference, EndpointDetail endpoint) {
        ModuleDetail module = projectRepository.findModule(reference.moduleId()).orElse(null);
        GroupDetail group = projectRepository.findGroup(reference.groupId()).orElse(null);
        String moduleName = module == null ? "未命名模块" : module.name();
        String groupName = group == null ? "未命名分组" : group.name();
        String titlePrefix = moduleName + " / " + groupName + " / " + safe(endpoint.name());

        List<KnowledgeChunkUpsertItem> chunks = new ArrayList<>();
        chunks.add(new KnowledgeChunkUpsertItem(
                "endpoint_summary",
                "endpoint:" + endpoint.id() + ":summary",
                0,
                titlePrefix + " - 接口概览",
                renderSummaryChunk(moduleName, groupName, endpoint)));
        chunks.add(new KnowledgeChunkUpsertItem(
                "endpoint_parameters",
                "endpoint:" + endpoint.id() + ":parameters",
                1,
                titlePrefix + " - 请求参数",
                renderParameterChunk(endpointRepository.listParameters(endpoint.id()))));
        chunks.add(new KnowledgeChunkUpsertItem(
                "endpoint_responses",
                "endpoint:" + endpoint.id() + ":responses",
                2,
                titlePrefix + " - 响应定义",
                renderResponseChunk(endpointRepository.listResponses(endpoint.id()))));
        return chunks;
    }

    private String renderSummaryChunk(String moduleName, String groupName, EndpointDetail endpoint) {
        return """
                接口概览
                - 名称: %s
                - 方法: %s
                - 路径: %s
                - 描述: %s
                - 模块: %s
                - 分组: %s
                - Mock: %s
                - 创建人: %s
                - 更新人: %s
                - 发布状态: %s
                """.formatted(
                safe(endpoint.name()),
                safe(endpoint.method()),
                safe(endpoint.path()),
                safe(endpoint.description()),
                safe(moduleName),
                safe(groupName),
                endpoint.mockEnabled() ? "已启用" : "未启用",
                safe(endpoint.createdByDisplayName()),
                safe(endpoint.updatedByDisplayName()),
                safe(endpoint.status()));
    }

    private String renderParameterChunk(List<ParameterDetail> parameters) {
        if (parameters.isEmpty()) {
            return "请求参数\n- 当前接口没有定义请求参数。";
        }
        return "请求参数\n" + parameters.stream()
                .map(parameter -> "- [%s] %s | %s | %s | 说明: %s | 示例: %s".formatted(
                        safe(parameter.sectionType()),
                        safe(parameter.name()),
                        safe(parameter.dataType()),
                        parameter.required() ? "必填" : "可选",
                        safe(parameter.description()),
                        safe(parameter.exampleValue())))
                .collect(Collectors.joining("\n"));
    }

    private String renderResponseChunk(List<ResponseDetail> responses) {
        if (responses.isEmpty()) {
            return "响应定义\n- 当前接口没有定义响应结构。";
        }
        return "响应定义\n" + responses.stream()
                .map(response -> "- [%s %s] %s | %s | %s | 说明: %s | 示例: %s".formatted(
                        response.httpStatusCode(),
                        safe(response.mediaType()),
                        safe(response.name()),
                        safe(response.dataType()),
                        response.required() ? "必填" : "可选",
                        safe(response.description()),
                        safe(response.exampleValue())))
                .collect(Collectors.joining("\n"));
    }

    private List<ScoredChunk> rankChunks(String question, List<KnowledgeChunkRecord> chunks, Long preferredEndpointId, int limit) {
        if (chunks.isEmpty()) {
            return List.of();
        }
        String normalizedQuestion = normalizeForSearch(question);
        Set<String> asciiTokens = extractAsciiTokens(question);
        String cjkQuestion = extractCjkText(question);

        List<ScoredChunk> scored = new ArrayList<>();
        for (KnowledgeChunkRecord chunk : chunks) {
            int score = scoreChunk(normalizedQuestion, asciiTokens, cjkQuestion, chunk, preferredEndpointId);
            if (score > 0) {
                scored.add(new ScoredChunk(chunk, score));
            }
        }

        scored.sort(Comparator
                .comparingInt(ScoredChunk::score).reversed()
                .thenComparing(scoredChunk -> scoredChunk.chunk().endpointId() == null ? Long.MAX_VALUE : scoredChunk.chunk().endpointId())
                .thenComparingInt(scoredChunk -> scoredChunk.chunk().chunkOrder())
                .thenComparing(scoredChunk -> scoredChunk.chunk().id() == null ? Long.MAX_VALUE : scoredChunk.chunk().id()));
        return scored.size() <= limit ? scored : scored.subList(0, limit);
    }

    private int scoreChunk(String normalizedQuestion,
                           Set<String> asciiTokens,
                           String cjkQuestion,
                           KnowledgeChunkRecord chunk,
                           Long preferredEndpointId) {
        String normalizedChunk = normalizeForSearch(chunk.title() + " " + chunk.content() + " " + chunk.sourceRef());
        int score = 0;
        if (!normalizedQuestion.isBlank() && normalizedChunk.contains(normalizedQuestion)) {
            score += 24;
        }
        if (preferredEndpointId != null && Objects.equals(preferredEndpointId, chunk.endpointId())) {
            score += 6;
        }
        for (String token : asciiTokens) {
            if (token.length() < 2) {
                continue;
            }
            if (normalizedChunk.contains(token)) {
                score += 4 + Math.min(token.length(), 6);
            }
        }
        for (int i = 0; i < cjkQuestion.length(); i++) {
            char ch = cjkQuestion.charAt(i);
            if (normalizedChunk.indexOf(ch) >= 0) {
                score += 1;
            }
        }
        for (String bigram : extractCjkBigrams(cjkQuestion)) {
            if (normalizedChunk.contains(bigram)) {
                score += 3;
            }
        }
        if (normalizedChunk.contains("参数") && normalizedQuestion.contains("参数")) {
            score += 2;
        }
        if (normalizedChunk.contains("响应") && (normalizedQuestion.contains("响应") || normalizedQuestion.contains("返回"))) {
            score += 2;
        }
        return score;
    }

    private List<AiReferenceItem> buildReferences(List<ScoredChunk> topChunks) {
        return topChunks.stream()
                .map(scoredChunk -> {
                    KnowledgeChunkRecord chunk = scoredChunk.chunk();
                    return new AiReferenceItem(
                            chunk.endpointId(),
                            chunk.title(),
                            guessMethod(chunk.content()),
                            guessPath(chunk.content()),
                            chunk.sourceType(),
                            trimSnippet(chunk.content()));
                })
                .toList();
    }

    private String buildContextBundle(List<ScoredChunk> topChunks) {
        StringBuilder builder = new StringBuilder();
        for (int index = 0; index < topChunks.size(); index++) {
            ScoredChunk scoredChunk = topChunks.get(index);
            KnowledgeChunkRecord chunk = scoredChunk.chunk();
            if (index > 0) {
                builder.append("\n\n");
            }
            builder.append("[").append(index + 1).append("] ")
                    .append(chunk.title())
                    .append(" | source=").append(chunk.sourceType())
                    .append(" | endpointId=").append(chunk.endpointId())
                    .append("\n")
                    .append(trimContext(chunk.content()));
        }
        return builder.toString();
    }

    private String normalizeForSearch(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < value.length(); i++) {
            char ch = Character.toLowerCase(value.charAt(i));
            if (Character.isLetterOrDigit(ch) || isCjk(ch)) {
                builder.append(ch);
            }
        }
        return builder.toString();
    }

    private Set<String> extractAsciiTokens(String value) {
        if (value == null || value.isBlank()) {
            return Set.of();
        }
        Set<String> tokens = new LinkedHashSet<>();
        for (String token : value.toLowerCase(Locale.ROOT).split("[^a-z0-9_]+")) {
            if (token != null && token.length() >= 2) {
                tokens.add(token);
            }
        }
        return tokens;
    }

    private String extractCjkText(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < value.length(); i++) {
            char ch = value.charAt(i);
            if (isCjk(ch)) {
                builder.append(ch);
            }
        }
        return builder.toString();
    }

    private List<String> extractCjkBigrams(String value) {
        if (value == null || value.length() < 2) {
            return List.of();
        }
        List<String> bigrams = new ArrayList<>();
        for (int i = 0; i < value.length() - 1; i++) {
            bigrams.add(value.substring(i, i + 2));
        }
        return bigrams;
    }

    private boolean isCjk(char ch) {
        return Character.UnicodeScript.of(ch) == Character.UnicodeScript.HAN;
    }

    private String trimContext(String content) {
        if (content == null) {
            return "";
        }
        String normalized = content.replaceAll("\\s+", " ").trim();
        return normalized.length() <= MAX_CONTEXT_CHARS ? normalized : normalized.substring(0, MAX_CONTEXT_CHARS) + "...";
    }

    private String trimSnippet(String content) {
        String normalized = trimContext(content);
        return normalized.length() <= MAX_SNIPPET_CHARS ? normalized : normalized.substring(0, MAX_SNIPPET_CHARS) + "...";
    }

    private String guessMethod(String content) {
        if (content == null) {
            return "";
        }
        String normalized = content.toUpperCase(Locale.ROOT);
        for (String method : List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD")) {
            if (normalized.contains("方法: " + method) || normalized.contains("METHOD: " + method) || normalized.contains(method + " ")) {
                return method;
            }
        }
        return "";
    }

    private String guessPath(String content) {
        if (content == null) {
            return "";
        }
        for (String line : content.split("\\R")) {
            String trimmed = line.trim();
            if (trimmed.startsWith("- 路径: ")) {
                return trimmed.substring("- 路径: ".length()).trim();
            }
        }
        return "";
    }

    private String normalizeScopeHint(String scopeHint) {
        return scopeHint == null || scopeHint.isBlank() ? "当前项目" : scopeHint.trim();
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "-" : value.trim();
    }

    private record ScoredChunk(KnowledgeChunkRecord chunk, int score) {
    }
}
