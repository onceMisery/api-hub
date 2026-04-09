package com.apihub.project.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.project.model.ProjectDtos.CreateEnvironmentRequest;
import com.apihub.project.model.ProjectDtos.EnvironmentDetail;
import com.apihub.project.service.ProjectService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/environments")
public class ProjectEnvironmentController {

    private final ProjectService projectService;

    public ProjectEnvironmentController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    public ApiResponse<List<EnvironmentDetail>> listEnvironments(@PathVariable Long projectId) {
        return ApiResponse.success(projectService.listEnvironments(projectId));
    }

    @PostMapping
    public ApiResponse<EnvironmentDetail> createEnvironment(@PathVariable Long projectId,
                                                            @RequestBody CreateEnvironmentRequest request) {
        return ApiResponse.success(projectService.createEnvironment(projectId, request));
    }
}
