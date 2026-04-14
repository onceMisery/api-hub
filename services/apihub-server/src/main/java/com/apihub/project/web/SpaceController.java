package com.apihub.project.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.project.model.ProjectDtos.CreateSpaceRequest;
import com.apihub.project.model.ProjectDtos.SpaceSummary;
import com.apihub.project.service.ProjectService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/spaces")
public class SpaceController {

    private final ProjectService projectService;

    public SpaceController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    public ApiResponse<List<SpaceSummary>> listSpaces(Authentication authentication) {
        return ApiResponse.success(projectService.listSpaces((Long) authentication.getPrincipal()));
    }

    @PostMapping
    public ApiResponse<SpaceSummary> createSpace(@RequestBody CreateSpaceRequest request,
                                                 Authentication authentication) {
        return ApiResponse.success(projectService.createSpace((Long) authentication.getPrincipal(), request));
    }
}
