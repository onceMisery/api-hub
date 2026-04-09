package com.apihub.mock.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.mock.model.MockDtos.MockReleaseDetail;
import com.apihub.project.service.ProjectService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class ApiMockReleaseController {

    private final ProjectService projectService;

    public ApiMockReleaseController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping("/api/v1/endpoints/{endpointId}/mock-releases")
    public ApiResponse<List<MockReleaseDetail>> listMockReleases(@PathVariable Long endpointId) {
        return ApiResponse.success(projectService.listMockReleases(endpointId));
    }

    @PostMapping("/api/v1/endpoints/{endpointId}/mock-releases")
    public ApiResponse<MockReleaseDetail> publishMockRelease(@PathVariable Long endpointId) {
        return ApiResponse.success(projectService.publishMockRelease(endpointId));
    }
}
