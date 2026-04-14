package com.apihub.project.model;

import java.util.List;

public final class ProjectImportDtos {

    private ProjectImportDtos() {
    }

    public record ImportSpecRequest(
            String sourceName,
            String sourceUrl,
            String content,
            Boolean createVersionSnapshot,
            Boolean bootstrapEnvironments,
            Boolean enableMockByDefault
    ) {
    }

    public record ImportProjectRequest(
            String projectName,
            String projectKey,
            String description,
            String sourceName,
            String sourceUrl,
            String content,
            Boolean createVersionSnapshot,
            Boolean bootstrapEnvironments,
            Boolean enableMockByDefault
    ) {
    }

    public record ImportResult(
            Long projectId,
            String projectName,
            String sourceType,
            int createdModules,
            int createdGroups,
            int createdEndpoints,
            int updatedEndpoints,
            int createdVersions,
            int createdEnvironments,
            List<String> warnings
    ) {
    }

    public record ImportPreview(
            String sourceType,
            String resolvedName,
            int totalEndpoints,
            int createdModules,
            int createdGroups,
            int createdEndpoints,
            int updatedEndpoints,
            int detectedEnvironments,
            List<String> modules,
            List<String> groups,
            List<String> routes,
            List<String> warnings
    ) {
    }
}
