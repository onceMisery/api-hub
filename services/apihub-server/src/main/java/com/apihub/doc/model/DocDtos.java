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

    public record ParameterUpsertItem(
            String sectionType,
            String name,
            String dataType,
            boolean required,
            String description,
            String exampleValue
    ) {
    }

    public record ResponseUpsertItem(
            int httpStatusCode,
            String mediaType,
            String name,
            String dataType,
            boolean required,
            String description,
            String exampleValue
    ) {
    }
}
