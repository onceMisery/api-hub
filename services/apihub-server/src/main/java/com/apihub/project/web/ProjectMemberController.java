package com.apihub.project.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.project.model.ProjectDtos.ProjectMemberDetail;
import com.apihub.project.model.ProjectDtos.UpsertProjectMemberRequest;
import com.apihub.project.service.ProjectService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/members")
public class ProjectMemberController {

    private final ProjectService projectService;

    public ProjectMemberController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    public ApiResponse<List<ProjectMemberDetail>> listMembers(@PathVariable Long projectId,
                                                              Authentication authentication) {
        return ApiResponse.success(projectService.listProjectMembers((Long) authentication.getPrincipal(), projectId));
    }

    @PutMapping
    public ApiResponse<ProjectMemberDetail> saveMember(@PathVariable Long projectId,
                                                       @RequestBody UpsertProjectMemberRequest request,
                                                       Authentication authentication) {
        return ApiResponse.success(projectService.saveProjectMember((Long) authentication.getPrincipal(), projectId, request));
    }

    @DeleteMapping("/{memberUserId}")
    public ApiResponse<Void> deleteMember(@PathVariable Long projectId,
                                          @PathVariable Long memberUserId,
                                          Authentication authentication) {
        projectService.deleteProjectMember((Long) authentication.getPrincipal(), projectId, memberUserId);
        return ApiResponse.success(null);
    }
}
