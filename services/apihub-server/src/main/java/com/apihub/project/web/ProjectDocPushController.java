package com.apihub.project.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.project.model.ProjectDtos.ProjectDocPushSettings;
import com.apihub.project.model.ProjectDtos.UpdateProjectDocPushRequest;
import com.apihub.project.model.ProjectImportDtos.ImportResult;
import com.apihub.project.model.ProjectImportDtos.ImportSpecRequest;
import com.apihub.project.service.ProjectImportService;
import com.apihub.project.service.ProjectService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class ProjectDocPushController {

    private final ProjectService projectService;
    private final ProjectImportService projectImportService;

    public ProjectDocPushController(ProjectService projectService, ProjectImportService projectImportService) {
        this.projectService = projectService;
        this.projectImportService = projectImportService;
    }

    @GetMapping("/projects/{projectId}/doc-push")
    public ApiResponse<ProjectDocPushSettings> getProjectDocPushSettings(@PathVariable Long projectId,
                                                                         Authentication authentication) {
        return ApiResponse.success(projectService.getProjectDocPushSettings((Long) authentication.getPrincipal(), projectId));
    }

    @PutMapping("/projects/{projectId}/doc-push")
    public ApiResponse<ProjectDocPushSettings> updateProjectDocPushSettings(@PathVariable Long projectId,
                                                                            @RequestBody UpdateProjectDocPushRequest request,
                                                                            Authentication authentication) {
        return ApiResponse.success(projectService.updateProjectDocPushSettings((Long) authentication.getPrincipal(), projectId, request));
    }

    @PostMapping("/projects/{projectId}/doc-push/regenerate")
    public ApiResponse<ProjectDocPushSettings> regenerateProjectDocPushToken(@PathVariable Long projectId,
                                                                             Authentication authentication) {
        return ApiResponse.success(projectService.regenerateProjectDocPushToken((Long) authentication.getPrincipal(), projectId));
    }

    @PostMapping("/doc-push/openapi")
    public ApiResponse<ImportResult> pushOpenApi(@RequestParam String token,
                                                 @RequestBody ImportSpecRequest request) {
        return ApiResponse.success(projectImportService.importOpenApiByPush(token, request));
    }

    @PostMapping("/doc-push/smartdoc")
    public ApiResponse<ImportResult> pushSmartDoc(@RequestParam String token,
                                                  @RequestBody ImportSpecRequest request) {
        return ApiResponse.success(projectImportService.importSmartDocByPush(token, request));
    }

    @PostMapping("/doc-push/docforge")
    public ApiResponse<ImportResult> pushDocForge(@RequestParam String token,
                                                  @RequestBody ImportSpecRequest request) {
        return ApiResponse.success(projectImportService.importSmartDocByPush(token, request));
    }
}
