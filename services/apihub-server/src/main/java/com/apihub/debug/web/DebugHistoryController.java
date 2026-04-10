package com.apihub.debug.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.debug.model.DebugDtos.DebugHistoryItem;
import com.apihub.debug.service.DebugService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/debug-history")
public class DebugHistoryController {

    private final DebugService debugService;

    public DebugHistoryController(DebugService debugService) {
        this.debugService = debugService;
    }

    @GetMapping
    public ApiResponse<List<DebugHistoryItem>> listHistory(@PathVariable Long projectId,
                                                           @RequestParam(required = false) Long endpointId,
                                                           @RequestParam(required = false) Long environmentId,
                                                           @RequestParam(required = false) Integer statusCode,
                                                           @RequestParam(required = false) Instant createdFrom,
                                                           @RequestParam(required = false) Instant createdTo,
                                                           @RequestParam(defaultValue = "10") int limit) {
        return ApiResponse.success(debugService.listHistory(projectId, endpointId, environmentId, statusCode, createdFrom, createdTo, limit));
    }

    @DeleteMapping
    public ApiResponse<Map<String, Integer>> clearHistory(@PathVariable Long projectId,
                                                          @RequestParam(required = false) Long endpointId,
                                                          @RequestParam(required = false) Long environmentId,
                                                          @RequestParam(required = false) Integer statusCode,
                                                          @RequestParam(required = false) Instant createdFrom,
                                                          @RequestParam(required = false) Instant createdTo) {
        int deletedCount = debugService.clearHistory(projectId, endpointId, environmentId, statusCode, createdFrom, createdTo);
        return ApiResponse.success(Map.of("deletedCount", deletedCount));
    }
}
