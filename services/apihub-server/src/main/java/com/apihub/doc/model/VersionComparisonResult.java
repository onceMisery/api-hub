package com.apihub.doc.model;

import java.time.Instant;
import java.util.List;

public record VersionComparisonResult(
        Long endpointId,
        VersionDescriptor base,
        VersionDescriptor target,
        DiffSummary summary,
        List<BreakingChange> breakingChanges,
        List<ChangelogEntry> changelog,
        List<FieldChange> endpointChanges,
        List<ParameterChange> parameterChanges,
        List<ResponseChange> responseChanges
) {
    public record VersionDescriptor(
            Long versionId,
            String label,
            String changeSummary,
            boolean draft,
            boolean released,
            Instant releasedAt
    ) {
    }

    public record DiffSummary(
            int endpointFieldsChanged,
            int addedParameters,
            int removedParameters,
            int modifiedParameters,
            int addedResponses,
            int removedResponses,
            int modifiedResponses,
            int breakingChanges
    ) {
    }

    public record BreakingChange(
            String type,
            String level,
            String title,
            String detail
    ) {
    }

    public record ChangelogEntry(
            String category,
            String title,
            String detail
    ) {
    }

    public record FieldChange(
            String field,
            String beforeValue,
            String afterValue
    ) {
    }

    public record ParameterChange(
            String changeType,
            String key,
            String sectionType,
            String name,
            String beforeDataType,
            String afterDataType,
            Boolean beforeRequired,
            Boolean afterRequired,
            String beforeDescription,
            String afterDescription,
            String beforeExampleValue,
            String afterExampleValue
    ) {
    }

    public record ResponseChange(
            String changeType,
            String key,
            Integer httpStatusCode,
            String mediaType,
            String name,
            String beforeDataType,
            String afterDataType,
            Boolean beforeRequired,
            Boolean afterRequired,
            String beforeDescription,
            String afterDescription,
            String beforeExampleValue,
            String afterExampleValue
    ) {
    }
}
