package com.apihub.doc.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.doc.model.DocDtos.CreateEndpointRequest;
import com.apihub.doc.model.DocDtos.UpdateEndpointRequest;
import com.apihub.doc.model.EndpointDetail;
import com.apihub.project.service.ProjectService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class ApiEndpointController {

    private final ProjectService projectService;

    public ApiEndpointController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping("/api/v1/groups/{groupId}/endpoints")
    public ApiResponse<List<EndpointDetail>> listEndpoints(@PathVariable Long groupId) {
        return ApiResponse.success(projectService.listEndpoints(groupId));
    }

    @PostMapping("/api/v1/groups/{groupId}/endpoints")
    public ApiResponse<EndpointDetail> createEndpoint(@PathVariable Long groupId,
                                                      @RequestBody CreateEndpointRequest request) {
        return ApiResponse.success(projectService.createEndpoint(groupId, request));
    }

    @GetMapping("/api/v1/endpoints/{endpointId}")
    public ApiResponse<EndpointDetail> getEndpoint(@PathVariable Long endpointId) {
        return ApiResponse.success(projectService.getEndpoint(endpointId));
    }

    @PatchMapping("/api/v1/endpoints/{endpointId}")
    public ApiResponse<EndpointDetail> updateEndpoint(@PathVariable Long endpointId,
                                                      @RequestBody UpdateEndpointRequest request) {
        return ApiResponse.success(projectService.updateEndpoint(endpointId, request));
    }

    @DeleteMapping("/api/v1/endpoints/{endpointId}")
    public ApiResponse<Void> deleteEndpoint(@PathVariable Long endpointId) {
        projectService.deleteEndpoint(endpointId);
        return ApiResponse.success(null);
    }
}
