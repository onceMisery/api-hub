package com.apihub.project.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.project.model.ProjectDtos.EnvironmentDetail;
import com.apihub.project.model.ProjectDtos.UpdateEnvironmentRequest;
import com.apihub.project.service.ProjectService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/environments/{environmentId}")
public class EnvironmentMutationController {

    private final ProjectService projectService;

    public EnvironmentMutationController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @PatchMapping
    public ApiResponse<EnvironmentDetail> updateEnvironment(@PathVariable Long environmentId,
                                                            @RequestBody UpdateEnvironmentRequest request) {
        return ApiResponse.success(projectService.updateEnvironment(environmentId, request));
    }

    @DeleteMapping
    public ApiResponse<Void> deleteEnvironment(@PathVariable Long environmentId) {
        projectService.deleteEnvironment(environmentId);
        return ApiResponse.success(null);
    }
}
