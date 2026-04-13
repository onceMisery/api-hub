package com.apihub.doc.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.doc.model.DocDtos.CreateVersionRequest;
import com.apihub.doc.model.EndpointDetail;
import com.apihub.doc.model.VersionComparisonResult;
import com.apihub.doc.model.VersionDetail;
import com.apihub.project.service.ProjectService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class ApiVersionController {

    private final ProjectService projectService;

    public ApiVersionController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping("/api/v1/endpoints/{endpointId}/versions")
    public ApiResponse<List<VersionDetail>> listVersions(@PathVariable Long endpointId,
                                                         Authentication authentication) {
        return ApiResponse.success(projectService.listVersions((Long) authentication.getPrincipal(), endpointId));
    }

    @GetMapping("/api/v1/endpoints/{endpointId}/versions/compare")
    public ApiResponse<VersionComparisonResult> compareVersions(@PathVariable Long endpointId,
                                                                @RequestParam Long baseVersionId,
                                                                @RequestParam(required = false) Long targetVersionId,
                                                                Authentication authentication) {
        return ApiResponse.success(projectService.compareVersions((Long) authentication.getPrincipal(), endpointId, baseVersionId, targetVersionId));
    }

    @PostMapping("/api/v1/endpoints/{endpointId}/versions")
    public ApiResponse<VersionDetail> createVersion(@PathVariable Long endpointId,
                                                    @RequestBody CreateVersionRequest request,
                                                    Authentication authentication) {
        return ApiResponse.success(projectService.createVersion((Long) authentication.getPrincipal(), endpointId, request));
    }

    @PostMapping("/api/v1/endpoints/{endpointId}/versions/{versionId}/release")
    public ApiResponse<EndpointDetail> releaseVersion(@PathVariable Long endpointId,
                                                      @PathVariable Long versionId,
                                                      Authentication authentication) {
        return ApiResponse.success(projectService.releaseVersion((Long) authentication.getPrincipal(), endpointId, versionId));
    }

    @DeleteMapping("/api/v1/endpoints/{endpointId}/release")
    public ApiResponse<EndpointDetail> clearEndpointRelease(@PathVariable Long endpointId,
                                                            Authentication authentication) {
        return ApiResponse.success(projectService.clearEndpointRelease((Long) authentication.getPrincipal(), endpointId));
    }
}
