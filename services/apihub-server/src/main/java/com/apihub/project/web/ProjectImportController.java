package com.apihub.project.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.project.model.ProjectImportDtos.ImportProjectRequest;
import com.apihub.project.model.ProjectImportDtos.ImportPreview;
import com.apihub.project.model.ProjectImportDtos.ImportResult;
import com.apihub.project.model.ProjectImportDtos.ImportSpecRequest;
import com.apihub.project.service.ProjectImportService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class ProjectImportController {

    private final ProjectImportService projectImportService;

    public ProjectImportController(ProjectImportService projectImportService) {
        this.projectImportService = projectImportService;
    }

    @PostMapping("/projects/{projectId}/imports/openapi")
    public ApiResponse<ImportResult> importOpenApiToProject(@PathVariable Long projectId,
                                                            @RequestBody ImportSpecRequest request,
                                                            Authentication authentication) {
        return ApiResponse.success(projectImportService.importOpenApiToProject((Long) authentication.getPrincipal(), projectId, request));
    }

    @PostMapping("/projects/{projectId}/imports/smartdoc")
    public ApiResponse<ImportResult> importSmartDocToProject(@PathVariable Long projectId,
                                                             @RequestBody ImportSpecRequest request,
                                                             Authentication authentication) {
        return ApiResponse.success(projectImportService.importSmartDocToProject((Long) authentication.getPrincipal(), projectId, request));
    }

    @PostMapping("/projects/{projectId}/imports/openapi/preview")
    public ApiResponse<ImportPreview> previewOpenApiToProject(@PathVariable Long projectId,
                                                              @RequestBody ImportSpecRequest request,
                                                              Authentication authentication) {
        return ApiResponse.success(projectImportService.previewOpenApiToProject((Long) authentication.getPrincipal(), projectId, request));
    }

    @PostMapping("/projects/{projectId}/imports/smartdoc/preview")
    public ApiResponse<ImportPreview> previewSmartDocToProject(@PathVariable Long projectId,
                                                               @RequestBody ImportSpecRequest request,
                                                               Authentication authentication) {
        return ApiResponse.success(projectImportService.previewSmartDocToProject((Long) authentication.getPrincipal(), projectId, request));
    }

    @PostMapping("/spaces/{spaceId}/imports/openapi-project")
    public ApiResponse<ImportResult> importOpenApiAsProject(@PathVariable Long spaceId,
                                                            @RequestBody ImportProjectRequest request,
                                                            Authentication authentication) {
        return ApiResponse.success(projectImportService.importOpenApiAsProject((Long) authentication.getPrincipal(), spaceId, request));
    }

    @PostMapping("/spaces/{spaceId}/imports/smartdoc-project")
    public ApiResponse<ImportResult> importSmartDocAsProject(@PathVariable Long spaceId,
                                                             @RequestBody ImportProjectRequest request,
                                                             Authentication authentication) {
        return ApiResponse.success(projectImportService.importSmartDocAsProject((Long) authentication.getPrincipal(), spaceId, request));
    }

    @PostMapping("/spaces/{spaceId}/imports/openapi-project/preview")
    public ApiResponse<ImportPreview> previewOpenApiAsProject(@PathVariable Long spaceId,
                                                              @RequestBody ImportProjectRequest request,
                                                              Authentication authentication) {
        return ApiResponse.success(projectImportService.previewOpenApiAsProject((Long) authentication.getPrincipal(), spaceId, request));
    }

    @PostMapping("/spaces/{spaceId}/imports/smartdoc-project/preview")
    public ApiResponse<ImportPreview> previewSmartDocAsProject(@PathVariable Long spaceId,
                                                               @RequestBody ImportProjectRequest request,
                                                               Authentication authentication) {
        return ApiResponse.success(projectImportService.previewSmartDocAsProject((Long) authentication.getPrincipal(), spaceId, request));
    }
}
