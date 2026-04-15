package com.apihub.project.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.project.model.ProjectDtos.CreateErrorCodeRequest;
import com.apihub.project.model.ProjectDtos.ErrorCodeImportResult;
import com.apihub.project.model.ProjectDtos.ErrorCodeDetail;
import com.apihub.project.model.ProjectDtos.ImportErrorCodeRequest;
import com.apihub.project.model.ProjectDtos.UpdateErrorCodeRequest;
import com.apihub.project.service.ProjectService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class ErrorCodeController {

    private final ProjectService projectService;

    public ErrorCodeController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping("/api/v1/projects/{projectId}/error-codes")
    public ApiResponse<List<ErrorCodeDetail>> listErrorCodes(@PathVariable Long projectId,
                                                             Authentication authentication) {
        return ApiResponse.success(projectService.listErrorCodes((Long) authentication.getPrincipal(), projectId));
    }

    @PostMapping("/api/v1/projects/{projectId}/error-codes")
    public ApiResponse<ErrorCodeDetail> createErrorCode(@PathVariable Long projectId,
                                                        @RequestBody CreateErrorCodeRequest request,
                                                        Authentication authentication) {
        return ApiResponse.success(projectService.createErrorCode((Long) authentication.getPrincipal(), projectId, request));
    }

    @PostMapping("/api/v1/projects/{projectId}/error-codes/import")
    public ApiResponse<ErrorCodeImportResult> importErrorCodes(@PathVariable Long projectId,
                                                               @RequestBody ImportErrorCodeRequest request,
                                                               Authentication authentication) {
        return ApiResponse.success(projectService.importErrorCodes((Long) authentication.getPrincipal(), projectId, request));
    }

    @PatchMapping("/api/v1/error-codes/{errorCodeId}")
    public ApiResponse<ErrorCodeDetail> updateErrorCode(@PathVariable Long errorCodeId,
                                                        @RequestBody UpdateErrorCodeRequest request,
                                                        Authentication authentication) {
        return ApiResponse.success(projectService.updateErrorCode((Long) authentication.getPrincipal(), errorCodeId, request));
    }

    @DeleteMapping("/api/v1/error-codes/{errorCodeId}")
    public ApiResponse<Void> deleteErrorCode(@PathVariable Long errorCodeId,
                                             Authentication authentication) {
        projectService.deleteErrorCode((Long) authentication.getPrincipal(), errorCodeId);
        return ApiResponse.success(null);
    }
}
