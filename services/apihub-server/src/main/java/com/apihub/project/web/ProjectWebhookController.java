package com.apihub.project.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.project.model.ProjectDtos.CreateProjectWebhookRequest;
import com.apihub.project.model.ProjectDtos.ProjectWebhookDetail;
import com.apihub.project.model.ProjectDtos.UpdateProjectWebhookRequest;
import com.apihub.project.model.ProjectDtos.WebhookDeliveryDetail;
import com.apihub.project.service.ProjectService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class ProjectWebhookController {

    private final ProjectService projectService;

    public ProjectWebhookController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping("/api/v1/projects/{projectId}/webhooks")
    public ApiResponse<List<ProjectWebhookDetail>> listProjectWebhooks(@PathVariable Long projectId,
                                                                       Authentication authentication) {
        return ApiResponse.success(projectService.listProjectWebhooks((Long) authentication.getPrincipal(), projectId));
    }

    @PostMapping("/api/v1/projects/{projectId}/webhooks")
    public ApiResponse<ProjectWebhookDetail> createProjectWebhook(@PathVariable Long projectId,
                                                                  @RequestBody CreateProjectWebhookRequest request,
                                                                  Authentication authentication) {
        return ApiResponse.success(projectService.createProjectWebhook((Long) authentication.getPrincipal(), projectId, request));
    }

    @PatchMapping("/api/v1/webhooks/{webhookId}")
    public ApiResponse<ProjectWebhookDetail> updateProjectWebhook(@PathVariable Long webhookId,
                                                                  @RequestBody UpdateProjectWebhookRequest request,
                                                                  Authentication authentication) {
        return ApiResponse.success(projectService.updateProjectWebhook((Long) authentication.getPrincipal(), webhookId, request));
    }

    @DeleteMapping("/api/v1/webhooks/{webhookId}")
    public ApiResponse<Void> deleteProjectWebhook(@PathVariable Long webhookId,
                                                  Authentication authentication) {
        projectService.deleteProjectWebhook((Long) authentication.getPrincipal(), webhookId);
        return ApiResponse.success(null);
    }

    @GetMapping("/api/v1/projects/{projectId}/webhook-deliveries")
    public ApiResponse<List<WebhookDeliveryDetail>> listWebhookDeliveries(@PathVariable Long projectId,
                                                                          @RequestParam(name = "limit", defaultValue = "60") int limit,
                                                                          Authentication authentication) {
        return ApiResponse.success(projectService.listWebhookDeliveries((Long) authentication.getPrincipal(), projectId, limit));
    }

    @PostMapping("/api/v1/projects/{projectId}/webhooks/{webhookId}/test")
    public ApiResponse<WebhookDeliveryDetail> testProjectWebhook(@PathVariable Long projectId,
                                                                 @PathVariable Long webhookId,
                                                                 Authentication authentication) {
        return ApiResponse.success(projectService.testProjectWebhook((Long) authentication.getPrincipal(), projectId, webhookId));
    }
}
