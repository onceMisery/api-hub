package com.apihub.doc.model;

public final class DocDtos {

    private DocDtos() {
    }

    public record CreateEndpointRequest(String name, String method, String path, String description) {
    }

    public record UpdateEndpointRequest(String name, String method, String path, String description) {
    }

    public record CreateVersionRequest(String version, String changeSummary, String snapshotJson) {
    }
}
