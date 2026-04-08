package com.apihub.project.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.project.model.ProjectDtos.CreateProjectRequest;
import com.apihub.project.model.ProjectDtos.ProjectDetail;
import com.apihub.project.model.ProjectDtos.ProjectTreeResponse;
import com.apihub.project.model.ProjectDtos.UpdateProjectRequest;
import com.apihub.project.service.ProjectService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    public ApiResponse<List<ProjectDetail>> listProjects() {
        return ApiResponse.success(projectService.listProjects());
    }

    @PostMapping
    public ApiResponse<ProjectDetail> createProject(@RequestBody CreateProjectRequest request) {
        return ApiResponse.success(projectService.createProject(request));
    }

    @GetMapping("/{projectId}")
    public ApiResponse<ProjectDetail> getProject(@PathVariable Long projectId) {
        return ApiResponse.success(projectService.getProject(projectId));
    }

    @PatchMapping("/{projectId}")
    public ApiResponse<ProjectDetail> updateProject(@PathVariable Long projectId,
                                                    @RequestBody UpdateProjectRequest request) {
        return ApiResponse.success(projectService.updateProject(projectId, request));
    }

    @GetMapping("/{projectId}/tree")
    public ApiResponse<ProjectTreeResponse> getProjectTree(@PathVariable Long projectId) {
        return ApiResponse.success(projectService.getProjectTree(projectId));
    }
}
