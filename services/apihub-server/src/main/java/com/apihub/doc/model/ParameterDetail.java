package com.apihub.doc.model;

public record ParameterDetail(
        Long id,
        String sectionType,
        String name,
        String dataType,
        boolean required,
        String description,
        String exampleValue,
        int sortOrder
) {
}
