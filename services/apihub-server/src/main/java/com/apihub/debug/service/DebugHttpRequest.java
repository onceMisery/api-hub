package com.apihub.debug.service;

import com.apihub.debug.model.DebugDtos.DebugHeader;

import java.net.URI;
import java.util.List;

public record DebugHttpRequest(
        String method,
        URI uri,
        List<DebugHeader> headers,
        String body
) {
}
