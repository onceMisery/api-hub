package com.apihub.project.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.project.model.ProjectDtos.CreateProjectRequest;
import com.apihub.project.model.ProjectDtos.ProjectDetail;
import com.apihub.project.model.ProjectDtos.ProjectTreeResponse;
import com.apihub.project.model.ProjectDtos.UpdateProjectRequest;
import com.apihub.project.service.ProjectService;
import org.springframework.security.core.Authentication;
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
    public ApiResponse<List<ProjectDetail>> listProjects(Authentication authentication) {
        return ApiResponse.success(projectService.listProjects((Long) authentication.getPrincipal()));
    }

    @PostMapping
    public ApiResponse<ProjectDetail> createProject(@RequestBody CreateProjectRequest request,
                                                    Authentication authentication) {
        return ApiResponse.success(projectService.createProject((Long) authentication.getPrincipal(), request));
    }

    @GetMapping("/{projectId}")
    public ApiResponse<ProjectDetail> getProject(@PathVariable Long projectId,
                                                 Authentication authentication) {
        return ApiResponse.success(projectService.getProject((Long) authentication.getPrincipal(), projectId));
    }

    @PatchMapping("/{projectId}")
    public ApiResponse<ProjectDetail> updateProject(@PathVariable Long projectId,
                                                    @RequestBody UpdateProjectRequest request,
                                                    Authentication authentication) {
        return ApiResponse.success(projectService.updateProject((Long) authentication.getPrincipal(), projectId, request));
    }

    @GetMapping("/{projectId}/tree")
    public ApiResponse<ProjectTreeResponse> getProjectTree(@PathVariable Long projectId,
                                                           Authentication authentication) {
        return ApiResponse.success(projectService.getProjectTree((Long) authentication.getPrincipal(), projectId));
    }
}
