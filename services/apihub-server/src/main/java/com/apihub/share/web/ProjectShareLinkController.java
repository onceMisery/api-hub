package com.apihub.share.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.share.model.ProjectShareDtos.CreateProjectShareLinkRequest;
import com.apihub.share.model.ProjectShareDtos.ProjectShareLinkDetail;
import com.apihub.share.model.ProjectShareDtos.UpdateProjectShareLinkRequest;
import com.apihub.share.service.ProjectShareLinkService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/share-links")
public class ProjectShareLinkController {

    private final ProjectShareLinkService projectShareLinkService;

    public ProjectShareLinkController(ProjectShareLinkService projectShareLinkService) {
        this.projectShareLinkService = projectShareLinkService;
    }

    @GetMapping
    public ApiResponse<List<ProjectShareLinkDetail>> listShareLinks(@PathVariable Long projectId,
                                                                    Authentication authentication) {
        return ApiResponse.success(projectShareLinkService.listShareLinks((Long) authentication.getPrincipal(), projectId));
    }

    @PostMapping
    public ApiResponse<ProjectShareLinkDetail> createShareLink(@PathVariable Long projectId,
                                                               @RequestBody CreateProjectShareLinkRequest request,
                                                               Authentication authentication) {
        return ApiResponse.success(projectShareLinkService.createShareLink((Long) authentication.getPrincipal(), projectId, request));
    }

    @PatchMapping("/{shareLinkId}")
    public ApiResponse<ProjectShareLinkDetail> updateShareLink(@PathVariable Long projectId,
                                                               @PathVariable Long shareLinkId,
                                                               @RequestBody UpdateProjectShareLinkRequest request,
                                                               Authentication authentication) {
        return ApiResponse.success(projectShareLinkService.updateShareLink(
                (Long) authentication.getPrincipal(),
                projectId,
                shareLinkId,
                request));
    }
}
