package com.apihub.mock.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.time.Instant;
import java.util.List;

public final class ProjectMockDtos {

    private ProjectMockDtos() {
    }

    public enum MockAccessMode {
        PRIVATE,
        TOKEN,
        PUBLIC;

        @JsonValue
        public String toJsonValue() {
            return toDatabaseValue();
        }

        @JsonCreator
        public static MockAccessMode fromJsonValue(String value) {
            return fromDatabaseValue(value);
        }

        public String toDatabaseValue() {
            return name().toLowerCase(java.util.Locale.ROOT);
        }

        public static MockAccessMode fromDatabaseValue(String value) {
            if (value == null || value.isBlank()) {
                return PRIVATE;
            }
            return MockAccessMode.valueOf(value.trim().toUpperCase(java.util.Locale.ROOT));
        }
    }

    public record MockAccessSettings(
            Long projectId,
            MockAccessMode mode,
            String token
    ) {
    }

    public record UpdateProjectMockAccessRequest(
            MockAccessMode mode,
            String token,
            Boolean regenerateToken
    ) {
    }

    public record MockCenterItem(
            Long endpointId,
            String endpointName,
            String method,
            String path,
            String moduleName,
            String groupName,
            boolean mockEnabled,
            Integer latestReleaseNo,
            Instant latestReleaseAt,
            boolean draftChanged,
            int totalRuleCount,
            int enabledRuleCount,
            int responseFieldCount
    ) {
    }

    public record ProjectMockCenterResponse(
            MockAccessSettings settings,
            List<MockCenterItem> items
    ) {
    }
}
