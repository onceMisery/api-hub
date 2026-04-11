package com.apihub.project.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.project.model.ProjectDtos.GroupDetail;
import com.apihub.project.model.ProjectDtos.UpdateGroupRequest;
import com.apihub.project.service.ProjectService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/groups/{groupId}")
public class ApiGroupMutationController {

    private final ProjectService projectService;

    public ApiGroupMutationController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @PatchMapping
    public ApiResponse<GroupDetail> updateGroup(@PathVariable Long groupId,
                                                @RequestBody UpdateGroupRequest request,
                                                Authentication authentication) {
        return ApiResponse.success(projectService.updateGroup((Long) authentication.getPrincipal(), groupId, request));
    }

    @DeleteMapping
    public ApiResponse<Void> deleteGroup(@PathVariable Long groupId,
                                         Authentication authentication) {
        projectService.deleteGroup((Long) authentication.getPrincipal(), groupId);
        return ApiResponse.success(null);
    }
}
