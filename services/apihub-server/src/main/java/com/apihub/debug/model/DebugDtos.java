package com.apihub.debug.model;

import java.util.List;

public final class DebugDtos {

    private DebugDtos() {
    }

    public record DebugHeader(String name, String value) {
    }

    public record ExecuteDebugRequest(
            Long environmentId,
            Long endpointId,
            String queryString,
            List<DebugHeader> headers,
            String body
    ) {
    }

    public record ExecuteDebugResponse(
            String method,
            String finalUrl,
            int statusCode,
            List<DebugHeader> responseHeaders,
            String responseBody,
            long durationMs
    ) {
    }
}
