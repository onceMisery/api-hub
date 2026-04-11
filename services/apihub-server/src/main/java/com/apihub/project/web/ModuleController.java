package com.apihub.project.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.project.model.ProjectDtos.CreateModuleRequest;
import com.apihub.project.model.ProjectDtos.ModuleDetail;
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
@RequestMapping("/api/v1/projects/{projectId}/modules")
public class ModuleController {

    private final ProjectService projectService;

    public ModuleController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    public ApiResponse<List<ModuleDetail>> listModules(@PathVariable Long projectId,
                                                       Authentication authentication) {
        return ApiResponse.success(projectService.listModules((Long) authentication.getPrincipal(), projectId));
    }

    @PostMapping
    public ApiResponse<ModuleDetail> createModule(@PathVariable Long projectId,
                                                  @RequestBody CreateModuleRequest request,
                                                  Authentication authentication) {
        return ApiResponse.success(projectService.createModule((Long) authentication.getPrincipal(), projectId, request));
    }
}
