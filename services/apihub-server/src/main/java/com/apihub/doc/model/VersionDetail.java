package com.apihub.doc.model;

public record VersionDetail(
        Long id,
        Long endpointId,
        String version,
        String changeSummary,
        String snapshotJson
) {
}
