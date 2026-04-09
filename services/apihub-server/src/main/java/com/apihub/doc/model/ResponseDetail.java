package com.apihub.doc.model;

public record ResponseDetail(
        Long id,
        int httpStatusCode,
        String mediaType,
        String name,
        String dataType,
        boolean required,
        String description,
        String exampleValue,
        int sortOrder
) {
}
