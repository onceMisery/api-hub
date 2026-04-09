package com.apihub.doc.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.doc.model.DocDtos.ParameterUpsertItem;
import com.apihub.doc.model.DocDtos.ResponseUpsertItem;
import com.apihub.doc.model.ParameterDetail;
import com.apihub.doc.model.ResponseDetail;
import com.apihub.project.service.ProjectService;
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
    public ApiResponse<List<ParameterDetail>> listParameters(@PathVariable Long endpointId) {
        return ApiResponse.success(projectService.listParameters(endpointId));
    }

    @PutMapping("/api/v1/endpoints/{endpointId}/parameters")
    public ApiResponse<Void> replaceParameters(@PathVariable Long endpointId,
                                               @RequestBody List<ParameterUpsertItem> items) {
        projectService.replaceParameters(endpointId, items);
        return ApiResponse.success(null);
    }

    @GetMapping("/api/v1/endpoints/{endpointId}/responses")
    public ApiResponse<List<ResponseDetail>> listResponses(@PathVariable Long endpointId) {
        return ApiResponse.success(projectService.listResponses(endpointId));
    }

    @PutMapping("/api/v1/endpoints/{endpointId}/responses")
    public ApiResponse<Void> replaceResponses(@PathVariable Long endpointId,
                                              @RequestBody List<ResponseUpsertItem> items) {
        projectService.replaceResponses(endpointId, items);
        return ApiResponse.success(null);
    }
}
