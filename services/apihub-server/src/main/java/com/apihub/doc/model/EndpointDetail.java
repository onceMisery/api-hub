package com.apihub.doc.model;

public record EndpointDetail(
        Long id,
        Long groupId,
        String name,
        String method,
        String path,
        String description
) {
}
