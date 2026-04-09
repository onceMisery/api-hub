package com.apihub.project.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.project.model.ProjectDtos.GroupDetail;
import com.apihub.project.model.ProjectDtos.UpdateGroupRequest;
import com.apihub.project.service.ProjectService;
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
                                                @RequestBody UpdateGroupRequest request) {
        return ApiResponse.success(projectService.updateGroup(groupId, request));
    }

    @DeleteMapping
    public ApiResponse<Void> deleteGroup(@PathVariable Long groupId) {
        projectService.deleteGroup(groupId);
        return ApiResponse.success(null);
    }
}
