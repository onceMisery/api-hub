package com.apihub.share.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.share.model.ProjectShareDtos.PublicShareEndpointDetailResponse;
import com.apihub.share.model.ProjectShareDtos.PublicShareOverviewResponse;
import com.apihub.share.service.PublicProjectShareService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/shares")
public class PublicProjectShareController {

    private final PublicProjectShareService publicProjectShareService;

    public PublicProjectShareController(PublicProjectShareService publicProjectShareService) {
        this.publicProjectShareService = publicProjectShareService;
    }

    @GetMapping("/{shareCode}")
    public ApiResponse<PublicShareOverviewResponse> getShareOverview(@PathVariable String shareCode) {
        return ApiResponse.success(publicProjectShareService.getShareOverview(shareCode));
    }

    @GetMapping("/{shareCode}/endpoints/{endpointId}")
    public ApiResponse<PublicShareEndpointDetailResponse> getShareEndpointDetail(@PathVariable String shareCode,
                                                                                 @PathVariable Long endpointId) {
        return ApiResponse.success(publicProjectShareService.getShareEndpointDetail(shareCode, endpointId));
    }
}
