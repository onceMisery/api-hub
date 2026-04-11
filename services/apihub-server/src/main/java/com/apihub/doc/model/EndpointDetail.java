package com.apihub.doc.model;

import java.time.Instant;

public record EndpointDetail(
        Long id,
        Long groupId,
        String name,
        String method,
        String path,
        String description,
        boolean mockEnabled,
        String status,
        Long releasedVersionId,
        String releasedVersionLabel,
        Instant releasedAt
) {
    public EndpointDetail(Long id,
                          Long groupId,
                          String name,
                          String method,
                          String path,
                          String description,
                          boolean mockEnabled) {
        this(id, groupId, name, method, path, description, mockEnabled, "draft", null, null, null);
    }
}
