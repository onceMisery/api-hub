package com.apihub.ai.web;

import com.apihub.ai.model.AiDtos.AskProjectQuestionRequest;
import com.apihub.ai.model.AiDtos.ProjectAiAnswerResult;
import com.apihub.ai.service.AiRagService;
import com.apihub.common.model.ApiResponse;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ProjectAiAssistantController {

    private final AiRagService aiRagService;

    public ProjectAiAssistantController(AiRagService aiRagService) {
        this.aiRagService = aiRagService;
    }

    @PostMapping("/api/v1/projects/{projectId}/ai/ask")
    public ApiResponse<ProjectAiAnswerResult> askProjectQuestion(@PathVariable Long projectId,
                                                                 @RequestBody AskProjectQuestionRequest request,
                                                                 Authentication authentication) {
        return ApiResponse.success(aiRagService.answerQuestion((Long) authentication.getPrincipal(), projectId, request));
    }
}
