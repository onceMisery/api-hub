package com.apihub.mock.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.mock.model.MockDtos.MockSimulationRequest;
import com.apihub.mock.model.MockDtos.MockSimulationResult;
import com.apihub.project.service.ProjectService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ApiMockSimulationController {

    private final ProjectService projectService;

    public ApiMockSimulationController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @PostMapping("/api/v1/endpoints/{endpointId}/mock-simulations")
    public ApiResponse<MockSimulationResult> simulate(@PathVariable Long endpointId,
                                                      @RequestBody MockSimulationRequest request,
                                                      Authentication authentication) {
        return ApiResponse.success(projectService.simulateMock((Long) authentication.getPrincipal(), endpointId, request));
    }
}
