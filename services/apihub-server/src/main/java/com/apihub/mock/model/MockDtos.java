package com.apihub.mock.model;

import java.util.List;

public final class MockDtos {

    private MockDtos() {
    }

    public record MockConditionEntry(String name, String value) {
    }

    public record MockRuleDetail(
            Long id,
            Long endpointId,
            String ruleName,
            int priority,
            boolean enabled,
            List<MockConditionEntry> queryConditions,
            List<MockConditionEntry> headerConditions,
            int statusCode,
            String mediaType,
            String body
    ) {
    }

    public record MockRuleUpsertItem(
            String ruleName,
            int priority,
            boolean enabled,
            List<MockConditionEntry> queryConditions,
            List<MockConditionEntry> headerConditions,
            int statusCode,
            String mediaType,
            String body
    ) {
    }
}
