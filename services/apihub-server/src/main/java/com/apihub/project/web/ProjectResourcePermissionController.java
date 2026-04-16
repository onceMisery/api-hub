package com.apihub.project.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.project.model.ProjectDtos.ProjectResourcePermissionDetail;
import com.apihub.project.model.ProjectDtos.UpsertProjectResourcePermissionRequest;
import com.apihub.project.service.ProjectService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/resource-permissions")
public class ProjectResourcePermissionController {

    private final ProjectService projectService;

    public ProjectResourcePermissionController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    public ApiResponse<List<ProjectResourcePermissionDetail>> listProjectResourcePermissions(@PathVariable Long projectId,
                                                                                              Authentication authentication) {
        return ApiResponse.success(projectService.listProjectResourcePermissions((Long) authentication.getPrincipal(), projectId));
    }

    @PostMapping
    public ApiResponse<ProjectResourcePermissionDetail> saveProjectResourcePermission(@PathVariable Long projectId,
                                                                                      @RequestBody UpsertProjectResourcePermissionRequest request,
                                                                                      Authentication authentication) {
        return ApiResponse.success(projectService.saveProjectResourcePermission((Long) authentication.getPrincipal(), projectId, request));
    }

    @DeleteMapping("/{permissionId}")
    public ApiResponse<Void> deleteProjectResourcePermission(@PathVariable Long projectId,
                                                             @PathVariable Long permissionId,
                                                             Authentication authentication) {
        projectService.deleteProjectResourcePermission((Long) authentication.getPrincipal(), projectId, permissionId);
        return ApiResponse.success(null);
    }
}
