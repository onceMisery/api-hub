package com.apihub.doc.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.doc.model.DocDtos.CreateEndpointRequest;
import com.apihub.doc.model.DocDtos.UpdateEndpointRequest;
import com.apihub.doc.model.EndpointDetail;
import com.apihub.project.service.ProjectService;
import org.springframework.security.core.Authentication;
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
    public ApiResponse<List<EndpointDetail>> listEndpoints(@PathVariable Long groupId,
                                                           Authentication authentication) {
        return ApiResponse.success(projectService.listEndpoints((Long) authentication.getPrincipal(), groupId));
    }

    @PostMapping("/api/v1/groups/{groupId}/endpoints")
    public ApiResponse<EndpointDetail> createEndpoint(@PathVariable Long groupId,
                                                      @RequestBody CreateEndpointRequest request,
                                                      Authentication authentication) {
        return ApiResponse.success(projectService.createEndpoint((Long) authentication.getPrincipal(), groupId, request));
    }

    @GetMapping("/api/v1/endpoints/{endpointId}")
    public ApiResponse<EndpointDetail> getEndpoint(@PathVariable Long endpointId,
                                                   Authentication authentication) {
        return ApiResponse.success(projectService.getEndpoint((Long) authentication.getPrincipal(), endpointId));
    }

    @PatchMapping("/api/v1/endpoints/{endpointId}")
    public ApiResponse<EndpointDetail> updateEndpoint(@PathVariable Long endpointId,
                                                      @RequestBody UpdateEndpointRequest request,
                                                      Authentication authentication) {
        return ApiResponse.success(projectService.updateEndpoint((Long) authentication.getPrincipal(), endpointId, request));
    }

    @DeleteMapping("/api/v1/endpoints/{endpointId}")
    public ApiResponse<Void> deleteEndpoint(@PathVariable Long endpointId,
                                            Authentication authentication) {
        projectService.deleteEndpoint((Long) authentication.getPrincipal(), endpointId);
        return ApiResponse.success(null);
    }
}
