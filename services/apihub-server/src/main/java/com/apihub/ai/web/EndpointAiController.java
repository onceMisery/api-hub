package com.apihub.ai.web;

import com.apihub.ai.model.AiDtos.GenerateEndpointCodeSnippetsRequest;
import com.apihub.ai.model.AiDtos.GenerateEndpointDescriptionRequest;
import com.apihub.ai.model.AiDtos.GenerateEndpointMockRequest;
import com.apihub.ai.model.AiDtos.GenerateEndpointTestCasesRequest;
import com.apihub.ai.model.AiDtos.GenerateImpactAnalysisRequest;
import com.apihub.ai.model.AiDtos.AiImpactAnalysisResult;
import com.apihub.ai.model.AiDtos.GeneratedCodeSnippetsResult;
import com.apihub.ai.model.AiDtos.GeneratedDescriptionResult;
import com.apihub.ai.model.AiDtos.GeneratedMockResult;
import com.apihub.ai.model.AiDtos.GeneratedTestCasesResult;
import com.apihub.ai.service.AiFeatureService;
import com.apihub.common.model.ApiResponse;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class EndpointAiController {

    private final AiFeatureService aiFeatureService;

    public EndpointAiController(AiFeatureService aiFeatureService) {
        this.aiFeatureService = aiFeatureService;
    }

    @PostMapping("/api/v1/endpoints/{endpointId}/ai/description")
    public ApiResponse<GeneratedDescriptionResult> generateDescription(@PathVariable Long endpointId,
                                                                       @RequestBody(required = false) GenerateEndpointDescriptionRequest request,
                                                                       Authentication authentication) {
        return ApiResponse.success(aiFeatureService.generateDescription((Long) authentication.getPrincipal(), endpointId, request));
    }

    @PostMapping("/api/v1/endpoints/{endpointId}/ai/mock")
    public ApiResponse<GeneratedMockResult> generateMock(@PathVariable Long endpointId,
                                                         @RequestBody(required = false) GenerateEndpointMockRequest request,
                                                         Authentication authentication) {
        return ApiResponse.success(aiFeatureService.generateMock((Long) authentication.getPrincipal(), endpointId, request));
    }

    @PostMapping("/api/v1/endpoints/{endpointId}/ai/code-snippets")
    public ApiResponse<GeneratedCodeSnippetsResult> generateCodeSnippets(@PathVariable Long endpointId,
                                                                         @RequestBody(required = false) GenerateEndpointCodeSnippetsRequest request,
                                                                         Authentication authentication) {
        return ApiResponse.success(aiFeatureService.generateCodeSnippets((Long) authentication.getPrincipal(), endpointId, request));
    }

    @PostMapping("/api/v1/endpoints/{endpointId}/ai/test-cases")
    public ApiResponse<GeneratedTestCasesResult> generateTestCases(@PathVariable Long endpointId,
                                                                   @RequestBody(required = false) GenerateEndpointTestCasesRequest request,
                                                                   Authentication authentication) {
        return ApiResponse.success(aiFeatureService.generateTestCases((Long) authentication.getPrincipal(), endpointId, request));
    }

    @PostMapping("/api/v1/endpoints/{endpointId}/ai/impact-analysis")
    public ApiResponse<AiImpactAnalysisResult> generateImpactAnalysis(@PathVariable Long endpointId,
                                                                      @RequestBody GenerateImpactAnalysisRequest request,
                                                                      Authentication authentication) {
        return ApiResponse.success(aiFeatureService.generateImpactAnalysis((Long) authentication.getPrincipal(), endpointId, request));
    }
}
