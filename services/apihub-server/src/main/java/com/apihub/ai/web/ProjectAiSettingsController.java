package com.apihub.ai.web;

import com.apihub.ai.model.AiDtos.AiConnectionTestResult;
import com.apihub.ai.model.AiDtos.ProjectAiSettingsDetail;
import com.apihub.ai.model.AiDtos.UpdateProjectAiSettingsRequest;
import com.apihub.ai.service.AiSettingsService;
import com.apihub.common.model.ApiResponse;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ProjectAiSettingsController {

    private final AiSettingsService aiSettingsService;

    public ProjectAiSettingsController(AiSettingsService aiSettingsService) {
        this.aiSettingsService = aiSettingsService;
    }

    @GetMapping("/api/v1/projects/{projectId}/ai-settings")
    public ApiResponse<ProjectAiSettingsDetail> getProjectAiSettings(@PathVariable Long projectId,
                                                                     Authentication authentication) {
        return ApiResponse.success(aiSettingsService.getProjectAiSettings((Long) authentication.getPrincipal(), projectId));
    }

    @PutMapping("/api/v1/projects/{projectId}/ai-settings")
    public ApiResponse<ProjectAiSettingsDetail> updateProjectAiSettings(@PathVariable Long projectId,
                                                                        @RequestBody UpdateProjectAiSettingsRequest request,
                                                                        Authentication authentication) {
        return ApiResponse.success(aiSettingsService.updateProjectAiSettings((Long) authentication.getPrincipal(), projectId, request));
    }

    @PostMapping("/api/v1/projects/{projectId}/ai-settings/test")
    public ApiResponse<AiConnectionTestResult> testProjectAiSettings(@PathVariable Long projectId,
                                                                     @RequestBody UpdateProjectAiSettingsRequest request,
                                                                     Authentication authentication) {
        return ApiResponse.success(aiSettingsService.testProjectAiSettings((Long) authentication.getPrincipal(), projectId, request));
    }
}
