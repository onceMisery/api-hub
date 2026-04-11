package com.apihub.mock.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.mock.model.MockDtos.MockReleaseDetail;
import com.apihub.mock.model.ProjectMockDtos.MockAccessSettings;
import com.apihub.mock.model.ProjectMockDtos.ProjectMockCenterResponse;
import com.apihub.mock.model.ProjectMockDtos.UpdateProjectMockAccessRequest;
import com.apihub.mock.service.ProjectMockCenterService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/projects/{projectId}")
public class ProjectMockCenterController {

    private final ProjectMockCenterService projectMockCenterService;

    public ProjectMockCenterController(ProjectMockCenterService projectMockCenterService) {
        this.projectMockCenterService = projectMockCenterService;
    }

    @GetMapping("/mock-center")
    public ApiResponse<ProjectMockCenterResponse> getMockCenter(@PathVariable Long projectId,
                                                                Authentication authentication) {
        return ApiResponse.success(projectMockCenterService.getMockCenter((Long) authentication.getPrincipal(), projectId));
    }

    @PatchMapping("/mock-access")
    public ApiResponse<MockAccessSettings> updateMockAccess(@PathVariable Long projectId,
                                                            @RequestBody UpdateProjectMockAccessRequest request,
                                                            Authentication authentication) {
        return ApiResponse.success(projectMockCenterService.updateMockAccess(
                (Long) authentication.getPrincipal(),
                projectId,
                request));
    }

    @PostMapping("/mock-center/endpoints/{endpointId}/publish")
    public ApiResponse<MockReleaseDetail> publishEndpoint(@PathVariable Long projectId,
                                                          @PathVariable Long endpointId,
                                                          Authentication authentication) {
        return ApiResponse.success(projectMockCenterService.publishEndpoint(
                (Long) authentication.getPrincipal(),
                projectId,
                endpointId));
    }
}
