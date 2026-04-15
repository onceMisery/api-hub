package com.apihub.ai.service;

import com.apihub.ai.model.AiDtos.AiConnectionTestResult;
import com.apihub.ai.model.AiDtos.ProjectAiSettingsDetail;
import com.apihub.ai.model.AiDtos.UpdateProjectAiSettingsRequest;
import com.apihub.ai.repository.AiSettingsRepository;
import com.apihub.ai.repository.AiSettingsRepository.ProjectAiSettingsRecord;
import com.apihub.project.repository.ProjectRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class AiSettingsService {

    private static final String DEFAULT_PROVIDER_TYPE = "openai_compatible";
    private static final String DEFAULT_BASE_URL = "https://api.openai.com/v1";
    private static final String DEFAULT_MODEL = "gpt-4.1-mini";

    private final AiSettingsRepository aiSettingsRepository;
    private final ProjectRepository projectRepository;
    private final AiGatewayService aiGatewayService;

    public AiSettingsService(AiSettingsRepository aiSettingsRepository,
                             ProjectRepository projectRepository,
                             AiGatewayService aiGatewayService) {
        this.aiSettingsRepository = aiSettingsRepository;
        this.projectRepository = projectRepository;
        this.aiGatewayService = aiGatewayService;
    }

    @Transactional(readOnly = true)
    public ProjectAiSettingsDetail getProjectAiSettings(Long userId, Long projectId) {
        requireProjectWriteAccess(userId, projectId);
        return aiSettingsRepository.findByProjectId(projectId)
                .map(AiSettingsRepository::toDetail)
                .orElseGet(() -> defaultDetail(projectId));
    }

    public ProjectAiSettingsDetail updateProjectAiSettings(Long userId,
                                                           Long projectId,
                                                           UpdateProjectAiSettingsRequest request) {
        requireProjectWriteAccess(userId, projectId);
        ProjectAiSettingsRecord current = aiSettingsRepository.findByProjectId(projectId).orElse(null);
        UpdateProjectAiSettingsRequest normalized = normalizeForSave(request, current);
        validate(normalized, current != null && current.apiKey() != null && !current.apiKey().isBlank());
        ProjectAiSettingsRecord saved = aiSettingsRepository.save(userId, projectId, normalized, current);
        return AiSettingsRepository.toDetail(saved);
    }

    @Transactional(readOnly = true)
    public AiConnectionTestResult testProjectAiSettings(Long userId,
                                                        Long projectId,
                                                        UpdateProjectAiSettingsRequest request) {
        requireProjectWriteAccess(userId, projectId);
        ProjectAiSettingsRecord current = aiSettingsRepository.findByProjectId(projectId).orElse(null);
        UpdateProjectAiSettingsRequest normalized = normalizeForTest(request, current);
        validate(normalized, normalized.apiKey() != null && !normalized.apiKey().isBlank());
        if (normalized.apiKey() == null || normalized.apiKey().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "AI API key is required for connectivity test");
        }
        ProjectAiSettingsRecord effective = new ProjectAiSettingsRecord(
                0L,
                projectId,
                normalized.providerType(),
                normalized.baseUrl(),
                normalized.apiKey(),
                normalized.defaultModel(),
                normalized.descriptionModel(),
                normalized.mockModel(),
                normalized.codeModel(),
                normalized.timeoutMs(),
                Boolean.TRUE.equals(normalized.enabled()),
                null);
        aiGatewayService.ping(effective, effective.defaultModel());
        return new AiConnectionTestResult(true, "AI provider is reachable", effective.providerType(), effective.baseUrl(), effective.defaultModel());
    }

    @Transactional(readOnly = true)
    public ProjectAiSettingsRecord requireActiveSettings(Long projectId) {
        ProjectAiSettingsRecord settings = aiSettingsRepository.findByProjectId(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "AI settings are not configured"));
        if (!settings.enabled()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "AI settings are disabled");
        }
        if (settings.apiKey() == null || settings.apiKey().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "AI API key is not configured");
        }
        if (settings.defaultModel() == null || settings.defaultModel().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "AI default model is not configured");
        }
        return settings;
    }

    private ProjectAiSettingsDetail defaultDetail(Long projectId) {
        return new ProjectAiSettingsDetail(
                null,
                projectId,
                DEFAULT_PROVIDER_TYPE,
                DEFAULT_BASE_URL,
                DEFAULT_MODEL,
                null,
                null,
                null,
                30000,
                false,
                false,
                null);
    }

    private UpdateProjectAiSettingsRequest normalizeForSave(UpdateProjectAiSettingsRequest request, ProjectAiSettingsRecord current) {
        String apiKey = normalizeNullable(request.apiKey());
        if (apiKey.isBlank() && current != null && current.apiKey() != null && !current.apiKey().isBlank()) {
            apiKey = current.apiKey();
        }
        return new UpdateProjectAiSettingsRequest(
                normalizeProviderType(request.providerType()),
                normalizeBaseUrl(request.baseUrl()),
                apiKey,
                normalizeModel(request.defaultModel(), DEFAULT_MODEL),
                normalizeModel(request.descriptionModel(), ""),
                normalizeModel(request.mockModel(), ""),
                normalizeModel(request.codeModel(), ""),
                normalizeTimeout(request.timeoutMs()),
                request.enabled() != null ? request.enabled() : Boolean.FALSE);
    }

    private UpdateProjectAiSettingsRequest normalizeForTest(UpdateProjectAiSettingsRequest request, ProjectAiSettingsRecord current) {
        String apiKey = normalizeNullable(request.apiKey());
        if (apiKey.isBlank() && current != null && current.apiKey() != null && !current.apiKey().isBlank()) {
            apiKey = current.apiKey();
        }
        return new UpdateProjectAiSettingsRequest(
                normalizeProviderType(request.providerType() != null ? request.providerType() : current == null ? null : current.providerType()),
                normalizeBaseUrl(request.baseUrl() != null ? request.baseUrl() : current == null ? null : current.baseUrl()),
                apiKey,
                normalizeModel(request.defaultModel() != null ? request.defaultModel() : current == null ? null : current.defaultModel(), DEFAULT_MODEL),
                normalizeModel(request.descriptionModel() != null ? request.descriptionModel() : current == null ? null : current.descriptionModel(), ""),
                normalizeModel(request.mockModel() != null ? request.mockModel() : current == null ? null : current.mockModel(), ""),
                normalizeModel(request.codeModel() != null ? request.codeModel() : current == null ? null : current.codeModel(), ""),
                normalizeTimeout(request.timeoutMs() != null ? request.timeoutMs() : current == null ? null : current.timeoutMs()),
                request.enabled() != null ? request.enabled() : current == null || current.enabled());
    }

    private void validate(UpdateProjectAiSettingsRequest request, boolean apiKeyConfigured) {
        if (!DEFAULT_PROVIDER_TYPE.equals(request.providerType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported AI provider type");
        }
        if (request.baseUrl() == null || request.baseUrl().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "AI base URL is required");
        }
        if (request.defaultModel() == null || request.defaultModel().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "AI default model is required");
        }
        if (Boolean.TRUE.equals(request.enabled()) && !apiKeyConfigured) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "AI API key is required before enabling AI");
        }
    }

    private void requireProjectWriteAccess(Long userId, Long projectId) {
        if (!projectRepository.canWriteProject(userId, projectId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Project write access is required");
        }
    }

    private String normalizeProviderType(String value) {
        String normalized = normalizeNullable(value);
        return normalized.isBlank() ? DEFAULT_PROVIDER_TYPE : normalized.toLowerCase();
    }

    private String normalizeBaseUrl(String value) {
        String normalized = normalizeNullable(value);
        return normalized.isBlank() ? DEFAULT_BASE_URL : normalized;
    }

    private String normalizeModel(String value, String fallback) {
        String normalized = normalizeNullable(value);
        return normalized.isBlank() ? fallback : normalized;
    }

    private int normalizeTimeout(Integer value) {
        if (value == null) {
            return 30000;
        }
        return Math.max(3000, Math.min(value, 120000));
    }

    private String normalizeNullable(String value) {
        return value == null ? "" : value.trim();
    }
}
