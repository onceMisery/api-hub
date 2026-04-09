package com.apihub.debug.service;

import com.apihub.debug.model.DebugDtos.DebugHeader;

import java.util.List;

public record DebugHttpResult(
        int statusCode,
        List<DebugHeader> headers,
        String responseBody,
        long durationMs
) {
}
