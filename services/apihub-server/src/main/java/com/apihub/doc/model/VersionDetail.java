package com.apihub.doc.model;

import java.time.Instant;

public record VersionDetail(
        Long id,
        Long endpointId,
        String version,
        String changeSummary,
        String snapshotJson,
        boolean released,
        Instant releasedAt
) {
    public VersionDetail(Long id,
                         Long endpointId,
                         String version,
                         String changeSummary,
                         String snapshotJson) {
        this(id, endpointId, version, changeSummary, snapshotJson, false, null);
    }
}
