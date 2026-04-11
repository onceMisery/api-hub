package com.apihub.doc.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.doc.model.DocDtos.ParameterUpsertItem;
import com.apihub.doc.model.DocDtos.ResponseUpsertItem;
import com.apihub.doc.model.ParameterDetail;
import com.apihub.doc.model.ResponseDetail;
import com.apihub.project.service.ProjectService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class ApiSchemaController {

    private final ProjectService projectService;

    public ApiSchemaController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping("/api/v1/endpoints/{endpointId}/parameters")
    public ApiResponse<List<ParameterDetail>> listParameters(@PathVariable Long endpointId,
                                                             Authentication authentication) {
        return ApiResponse.success(projectService.listParameters((Long) authentication.getPrincipal(), endpointId));
    }

    @PutMapping("/api/v1/endpoints/{endpointId}/parameters")
    public ApiResponse<Void> replaceParameters(@PathVariable Long endpointId,
                                               @RequestBody List<ParameterUpsertItem> items,
                                               Authentication authentication) {
        projectService.replaceParameters((Long) authentication.getPrincipal(), endpointId, items);
        return ApiResponse.success(null);
    }

    @GetMapping("/api/v1/endpoints/{endpointId}/responses")
    public ApiResponse<List<ResponseDetail>> listResponses(@PathVariable Long endpointId,
                                                           Authentication authentication) {
        return ApiResponse.success(projectService.listResponses((Long) authentication.getPrincipal(), endpointId));
    }

    @PutMapping("/api/v1/endpoints/{endpointId}/responses")
    public ApiResponse<Void> replaceResponses(@PathVariable Long endpointId,
                                              @RequestBody List<ResponseUpsertItem> items,
                                              Authentication authentication) {
        projectService.replaceResponses((Long) authentication.getPrincipal(), endpointId, items);
        return ApiResponse.success(null);
    }
}
