package com.apihub.project.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.project.model.ProjectDtos.CreateModuleVersionTagRequest;
import com.apihub.project.model.ProjectDtos.ModuleVersionTagDetail;
import com.apihub.project.service.ProjectService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/modules/{moduleId}/version-tags")
public class ModuleVersionTagController {

    private final ProjectService projectService;

    public ModuleVersionTagController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    public ApiResponse<List<ModuleVersionTagDetail>> listModuleVersionTags(@PathVariable Long moduleId,
                                                                           Authentication authentication) {
        return ApiResponse.success(projectService.listModuleVersionTags((Long) authentication.getPrincipal(), moduleId));
    }

    @PostMapping
    public ApiResponse<ModuleVersionTagDetail> createModuleVersionTag(@PathVariable Long moduleId,
                                                                      @RequestBody CreateModuleVersionTagRequest request,
                                                                      Authentication authentication) {
        return ApiResponse.success(projectService.createModuleVersionTag((Long) authentication.getPrincipal(), moduleId, request));
    }
}
