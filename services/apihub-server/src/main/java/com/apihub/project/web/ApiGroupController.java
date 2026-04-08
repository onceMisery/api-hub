package com.apihub.project.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.project.model.ProjectDtos.CreateGroupRequest;
import com.apihub.project.model.ProjectDtos.GroupDetail;
import com.apihub.project.service.ProjectService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/modules/{moduleId}/groups")
public class ApiGroupController {

    private final ProjectService projectService;

    public ApiGroupController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    public ApiResponse<List<GroupDetail>> listGroups(@PathVariable Long moduleId) {
        return ApiResponse.success(projectService.listGroups(moduleId));
    }

    @PostMapping
    public ApiResponse<GroupDetail> createGroup(@PathVariable Long moduleId,
                                                @RequestBody CreateGroupRequest request) {
        return ApiResponse.success(projectService.createGroup(moduleId, request));
    }
}
