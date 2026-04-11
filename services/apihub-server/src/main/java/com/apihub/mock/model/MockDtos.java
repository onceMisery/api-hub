package com.apihub.mock.model;

import java.time.Instant;
import java.util.List;

public final class MockDtos {

    private MockDtos() {
    }

    public record MockConditionEntry(String name, String value) {
    }

    public record MockBodyConditionEntry(String jsonPath, String expectedValue) {
    }

    public record MockRuleDetail(
            Long id,
            Long endpointId,
            String ruleName,
            int priority,
            boolean enabled,
            List<MockConditionEntry> queryConditions,
            List<MockConditionEntry> headerConditions,
            List<MockBodyConditionEntry> bodyConditions,
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
            List<MockBodyConditionEntry> bodyConditions,
            int statusCode,
            String mediaType,
            String body
    ) {
    }

    public record MockReleaseDetail(
            Long id,
            Long endpointId,
            int releaseNo,
            String responseSnapshotJson,
            String rulesSnapshotJson,
            Instant createdAt
    ) {
    }

    public record MockSimulationResponseItem(
            int httpStatusCode,
            String mediaType,
            String name,
            String dataType,
            boolean required,
            String description,
            String exampleValue
    ) {
    }

    public record MockSimulationRequest(
            List<MockRuleUpsertItem> draftRules,
            List<MockSimulationResponseItem> draftResponses,
            List<MockConditionEntry> querySamples,
            List<MockConditionEntry> headerSamples,
            String bodySample
    ) {
    }

    public record MockRuleTraceItem(
            String ruleName,
            int priority,
            String status,
            List<String> checks,
            String summary
    ) {
    }

    public record MockSimulationResult(
            String source,
            String matchedRuleName,
            Integer matchedRulePriority,
            List<String> explanations,
            List<MockRuleTraceItem> ruleTraces,
            int statusCode,
            String mediaType,
            String body
    ) {
    }
}
