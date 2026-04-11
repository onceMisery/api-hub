package com.apihub.doc.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.doc.model.DocDtos.CreateVersionRequest;
import com.apihub.doc.model.VersionDetail;
import com.apihub.project.service.ProjectService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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

    @PostMapping("/api/v1/endpoints/{endpointId}/versions")
    public ApiResponse<VersionDetail> createVersion(@PathVariable Long endpointId,
                                                    @RequestBody CreateVersionRequest request,
                                                    Authentication authentication) {
        return ApiResponse.success(projectService.createVersion((Long) authentication.getPrincipal(), endpointId, request));
    }
}
