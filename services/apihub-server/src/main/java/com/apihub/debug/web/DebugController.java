package com.apihub.debug.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.debug.model.DebugDtos.ExecuteDebugRequest;
import com.apihub.debug.model.DebugDtos.ExecuteDebugResponse;
import com.apihub.debug.service.DebugService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/debug")
public class DebugController {

    private final DebugService debugService;

    public DebugController(DebugService debugService) {
        this.debugService = debugService;
    }

    @PostMapping("/execute")
    public ApiResponse<ExecuteDebugResponse> execute(@RequestBody ExecuteDebugRequest request,
                                                     Authentication authentication) {
        return ApiResponse.success(debugService.execute((Long) authentication.getPrincipal(), request));
    }
}
