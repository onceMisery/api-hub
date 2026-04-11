package com.apihub.project.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.project.model.ProjectDtos.CreateGroupRequest;
import com.apihub.project.model.ProjectDtos.GroupDetail;
import com.apihub.project.service.ProjectService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/modules/{moduleId}/groups")
public class ApiGroupController {

    private final ProjectService projectService;

    public ApiGroupController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    public ApiResponse<List<GroupDetail>> listGroups(@PathVariable Long moduleId,
                                                     Authentication authentication) {
        return ApiResponse.success(projectService.listGroups((Long) authentication.getPrincipal(), moduleId));
    }

    @PostMapping
    public ApiResponse<GroupDetail> createGroup(@PathVariable Long moduleId,
                                                @RequestBody CreateGroupRequest request,
                                                Authentication authentication) {
        return ApiResponse.success(projectService.createGroup((Long) authentication.getPrincipal(), moduleId, request));
    }
}
