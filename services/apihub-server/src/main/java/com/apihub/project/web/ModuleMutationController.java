package com.apihub.project.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.project.model.ProjectDtos.ModuleDetail;
import com.apihub.project.model.ProjectDtos.UpdateModuleRequest;
import com.apihub.project.service.ProjectService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/modules/{moduleId}")
public class ModuleMutationController {

    private final ProjectService projectService;

    public ModuleMutationController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @PatchMapping
    public ApiResponse<ModuleDetail> updateModule(@PathVariable Long moduleId,
                                                  @RequestBody UpdateModuleRequest request,
                                                  Authentication authentication) {
        return ApiResponse.success(projectService.updateModule((Long) authentication.getPrincipal(), moduleId, request));
    }

    @DeleteMapping
    public ApiResponse<Void> deleteModule(@PathVariable Long moduleId,
                                          Authentication authentication) {
        projectService.deleteModule((Long) authentication.getPrincipal(), moduleId);
        return ApiResponse.success(null);
    }
}
