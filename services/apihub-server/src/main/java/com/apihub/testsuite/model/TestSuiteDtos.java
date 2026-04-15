package com.apihub.testsuite.model;

import com.apihub.debug.model.DebugDtos.DebugHeader;

import java.time.Instant;
import java.util.List;

public final class TestSuiteDtos {

    private TestSuiteDtos() {
    }

    public record UpsertTestSuiteRequest(String name, String description) {
    }

    public record TestAssertionItem(String type, String expression, String expectedValue) {
    }

    public record TestExtractorItem(String variableName, String sourceType, String expression) {
    }

    public record TestStepUpsertItem(
            Long endpointId,
            Long environmentId,
            String name,
            Boolean enabled,
            String queryString,
            List<DebugHeader> headers,
            String body,
            String preScript,
            String postScript,
            List<TestAssertionItem> assertions,
            List<TestExtractorItem> extractors
    ) {
    }

    public record TestSuiteSummary(
            Long id,
            Long projectId,
            String name,
            String description,
            int totalSteps,
            int enabledSteps,
            String lastExecutionStatus,
            String lastExecutionSource,
            Instant lastExecutedAt
    ) {
    }

    public record TestStepDetail(
            Long id,
            Long endpointId,
            Long environmentId,
            int stepOrder,
            String name,
            boolean enabled,
            String endpointName,
            String method,
            String path,
            String environmentName,
            String queryString,
            List<DebugHeader> headers,
            String body,
            String preScript,
            String postScript,
            List<TestAssertionItem> assertions,
            List<TestExtractorItem> extractors
    ) {
    }

    public record TestExecutionSummary(
            Long id,
            Long suiteId,
            String status,
            String executionSource,
            int totalSteps,
            int passedSteps,
            int failedSteps,
            long durationMs,
            Instant executedAt
    ) {
    }

    public record TestDashboardOverview(
            int totalSuites,
            int activeSuites,
            int totalExecutions,
            int passedExecutions,
            int failedExecutions,
            int errorExecutions,
            long averageDurationMs,
            double passRate
    ) {
    }

    public record TestDashboardExecutionItem(
            Long executionId,
            Long suiteId,
            String suiteName,
            String status,
            String executionSource,
            int totalSteps,
            int passedSteps,
            int failedSteps,
            long durationMs,
            Instant executedAt
    ) {
    }

    public record TestDashboardSuiteHealthItem(
            Long suiteId,
            String suiteName,
            int totalSteps,
            int enabledSteps,
            String lastExecutionStatus,
            Instant lastExecutedAt,
            int totalRuns,
            double passRate,
            long averageDurationMs
    ) {
    }

    public record TestDashboardDetail(
            TestDashboardOverview overview,
            List<TestDashboardExecutionItem> recentExecutions,
            List<TestDashboardSuiteHealthItem> suiteHealth
    ) {
    }

    public record CreateTriggerRequest(String name) {
    }

    public record UpsertTestSuiteScheduleRequest(Boolean enabled, Integer intervalMinutes) {
    }

    public record TestSuiteTriggerSummary(
            Long id,
            Long suiteId,
            String name,
            String tokenPrefix,
            boolean active,
            Instant createdAt,
            Instant lastTriggeredAt,
            Long lastExecutionId,
            String lastExecutionStatus,
            Instant lastExecutedAt
    ) {
    }

    public record CreatedTestSuiteTrigger(
            TestSuiteTriggerSummary trigger,
            String token
    ) {
    }

    public record TestSuiteScheduleDetail(
            Long id,
            Long suiteId,
            boolean enabled,
            int intervalMinutes,
            Instant nextRunAt,
            Instant lastRunAt,
            Long lastExecutionId,
            String lastExecutionStatus,
            Instant lastExecutedAt
    ) {
    }

    public record TriggerExecutionReceipt(
            Long executionId,
            Long suiteId,
            String suiteName,
            String status,
            int totalSteps,
            int passedSteps,
            int failedSteps,
            long durationMs,
            Instant executedAt
    ) {
    }

    public record AssertionResult(
            String type,
            String expression,
            String expectedValue,
            boolean passed,
            String actualValue,
            String message
    ) {
    }

    public record ExtractedVariableResult(
            String variableName,
            String sourceType,
            String expression,
            String value
    ) {
    }

    public record TestExecutionStepResult(
            int stepOrder,
            String stepName,
            Long endpointId,
            String endpointName,
            String method,
            String path,
            Long environmentId,
            String environmentName,
            String finalUrl,
            String status,
            Instant startedAt,
            Instant finishedAt,
            Integer responseStatusCode,
            long durationMs,
            String requestQueryString,
            List<DebugHeader> requestHeaders,
            String requestBody,
            String responseBody,
            List<DebugHeader> responseHeaders,
            List<AssertionResult> assertions,
            List<ExtractedVariableResult> extractedVariables,
            String errorMessage
    ) {
    }

    public record ExecutionReport(List<TestExecutionStepResult> steps) {
    }

    public record TestExecutionDetail(
            Long id,
            Long suiteId,
            String suiteName,
            String status,
            String executionSource,
            int totalSteps,
            int passedSteps,
            int failedSteps,
            long durationMs,
            Instant executedAt,
            List<TestExecutionStepResult> steps
    ) {
    }

    public record TestSuiteDetail(
            Long id,
            Long projectId,
            String name,
            String description,
            int totalSteps,
            int enabledSteps,
            Instant createdAt,
            Instant updatedAt,
            List<TestStepDetail> steps,
            List<TestExecutionSummary> recentExecutions
    ) {
    }
}
