package com.apihub.mock.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.mock.model.MockDtos.MockRuleDetail;
import com.apihub.mock.model.MockDtos.MockRuleUpsertItem;
import com.apihub.project.service.ProjectService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class ApiMockRuleController {

    private final ProjectService projectService;

    public ApiMockRuleController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping("/api/v1/endpoints/{endpointId}/mock-rules")
    public ApiResponse<List<MockRuleDetail>> listMockRules(@PathVariable Long endpointId,
                                                           Authentication authentication) {
        return ApiResponse.success(projectService.listMockRules((Long) authentication.getPrincipal(), endpointId));
    }

    @PutMapping("/api/v1/endpoints/{endpointId}/mock-rules")
    public ApiResponse<Void> replaceMockRules(@PathVariable Long endpointId,
                                              @RequestBody List<MockRuleUpsertItem> items,
                                              Authentication authentication) {
        projectService.replaceMockRules((Long) authentication.getPrincipal(), endpointId, items);
        return ApiResponse.success(null);
    }
}
