package com.apihub.project.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.project.model.ProjectDtos.AuditLogDetail;
import com.apihub.project.service.ProjectService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class AuditLogController {

    private final ProjectService projectService;

    public AuditLogController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping("/api/v1/projects/{projectId}/audit-logs")
    public ApiResponse<List<AuditLogDetail>> listAuditLogs(@PathVariable Long projectId,
                                                           @RequestParam(name = "limit", defaultValue = "80") int limit,
                                                           Authentication authentication) {
        return ApiResponse.success(projectService.listAuditLogs((Long) authentication.getPrincipal(), projectId, limit));
    }
}
