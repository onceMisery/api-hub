package com.apihub.testsuite.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.MissingNode;
import com.apihub.debug.model.DebugDtos.DebugHeader;
import com.apihub.debug.model.DebugDtos.ExecuteDebugRequest;
import com.apihub.debug.model.DebugDtos.ExecuteDebugResponse;
import com.apihub.debug.service.DebugService;
import com.apihub.doc.model.EndpointDetail;
import com.apihub.doc.repository.EndpointRepository;
import com.apihub.project.model.ProjectDtos.EnvironmentDetail;
import com.apihub.project.repository.ProjectRepository;
import com.apihub.testsuite.model.TestSuiteDtos.AssertionResult;
import com.apihub.testsuite.model.TestSuiteDtos.CreateTriggerRequest;
import com.apihub.testsuite.model.TestSuiteDtos.CreatedTestSuiteTrigger;
import com.apihub.testsuite.model.TestSuiteDtos.ExecutionReport;
import com.apihub.testsuite.model.TestSuiteDtos.TestAssertionItem;
import com.apihub.testsuite.model.TestSuiteDtos.TestDashboardDetail;
import com.apihub.testsuite.model.TestSuiteDtos.TestDashboardExecutionItem;
import com.apihub.testsuite.model.TestSuiteDtos.TestDashboardOverview;
import com.apihub.testsuite.model.TestSuiteDtos.TestDashboardSuiteHealthItem;
import com.apihub.testsuite.model.TestSuiteDtos.TestExecutionDetail;
import com.apihub.testsuite.model.TestSuiteDtos.TestExecutionStepResult;
import com.apihub.testsuite.model.TestSuiteDtos.TestExecutionSummary;
import com.apihub.testsuite.model.TestSuiteDtos.ExtractedVariableResult;
import com.apihub.testsuite.model.TestSuiteDtos.TestExtractorItem;
import com.apihub.testsuite.model.TestSuiteDtos.TestSuiteScheduleDetail;
import com.apihub.testsuite.model.TestSuiteDtos.TestStepDetail;
import com.apihub.testsuite.model.TestSuiteDtos.TestStepUpsertItem;
import com.apihub.testsuite.model.TestSuiteDtos.TestSuiteDetail;
import com.apihub.testsuite.model.TestSuiteDtos.TestSuiteSummary;
import com.apihub.testsuite.model.TestSuiteDtos.TestSuiteTriggerSummary;
import com.apihub.testsuite.model.TestSuiteDtos.TriggerExecutionReceipt;
import com.apihub.testsuite.model.TestSuiteDtos.UpsertTestSuiteScheduleRequest;
import com.apihub.testsuite.model.TestSuiteDtos.UpsertTestSuiteRequest;
import com.apihub.testsuite.repository.TestSuiteRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HexFormat;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Transactional
public class TestSuiteService {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final Pattern VARIABLE_PATTERN = Pattern.compile("\\{\\{\\s*([a-zA-Z0-9_.-]+)\\s*}}");
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final Logger log = LoggerFactory.getLogger(TestSuiteService.class);

    private final ProjectRepository projectRepository;
    private final EndpointRepository endpointRepository;
    private final DebugService debugService;
    private final TestSuiteRepository testSuiteRepository;
    private final TestStepScriptEngine testStepScriptEngine;

    public TestSuiteService(ProjectRepository projectRepository,
                            EndpointRepository endpointRepository,
                            DebugService debugService,
                            TestSuiteRepository testSuiteRepository,
                            TestStepScriptEngine testStepScriptEngine) {
        this.projectRepository = projectRepository;
        this.endpointRepository = endpointRepository;
        this.debugService = debugService;
        this.testSuiteRepository = testSuiteRepository;
        this.testStepScriptEngine = testStepScriptEngine;
    }

    @Transactional(readOnly = true)
    public List<TestSuiteSummary> listSuites(Long userId, Long projectId) {
        requireProjectReadAccess(userId, projectId);
        return testSuiteRepository.listSuites(projectId);
    }

    @Transactional(readOnly = true)
    public TestDashboardDetail getDashboard(Long userId, Long projectId) {
        requireProjectReadAccess(userId, projectId);
        TestDashboardOverview overview = withOverviewPassRate(testSuiteRepository.getDashboardOverview(projectId));
        List<TestDashboardExecutionItem> recentExecutions = testSuiteRepository.listProjectExecutions(projectId, 10);
        List<TestDashboardSuiteHealthItem> suiteHealth = testSuiteRepository.listSuiteHealth(projectId, 8);
        return new TestDashboardDetail(overview, recentExecutions, suiteHealth);
    }

    @Transactional(readOnly = true)
    public TestSuiteDetail getSuite(Long userId, Long projectId, Long suiteId) {
        requireProjectReadAccess(userId, projectId);
        TestSuiteDetail suite = requireSuite(projectId, suiteId);
        return new TestSuiteDetail(
                suite.id(),
                suite.projectId(),
                suite.name(),
                suite.description(),
                suite.totalSteps(),
                suite.enabledSteps(),
                suite.createdAt(),
                suite.updatedAt(),
                testSuiteRepository.listSteps(suiteId),
                testSuiteRepository.listExecutionSummaries(suiteId, 8));
    }

    public TestSuiteDetail createSuite(Long userId, Long projectId, UpsertTestSuiteRequest request) {
        requireProjectWriteAccess(userId, projectId);
        TestSuiteDetail created = testSuiteRepository.createSuite(userId, projectId, normalizeSuiteRequest(request));
        return getSuite(userId, projectId, created.id());
    }

    public TestSuiteDetail updateSuite(Long userId, Long projectId, Long suiteId, UpsertTestSuiteRequest request) {
        requireProjectWriteAccess(userId, projectId);
        requireSuite(projectId, suiteId);
        testSuiteRepository.updateSuite(projectId, suiteId, normalizeSuiteRequest(request));
        return getSuite(userId, projectId, suiteId);
    }

    public void deleteSuite(Long userId, Long projectId, Long suiteId) {
        requireProjectWriteAccess(userId, projectId);
        requireSuite(projectId, suiteId);
        testSuiteRepository.deleteSuite(suiteId);
    }

    public TestSuiteDetail replaceSteps(Long userId, Long projectId, Long suiteId, List<TestStepUpsertItem> items) {
        requireProjectWriteAccess(userId, projectId);
        requireSuite(projectId, suiteId);
        testSuiteRepository.replaceSteps(userId, suiteId, normalizeSteps(projectId, items));
        return getSuite(userId, projectId, suiteId);
    }

    public TestExecutionDetail executeSuite(Long userId, Long projectId, Long suiteId) {
        requireProjectTestAccess(userId, projectId);
        return executeSuiteInternal(userId, projectId, suiteId, "manual", null, null);
    }

    @Transactional(readOnly = true)
    public List<TestSuiteTriggerSummary> listTriggers(Long userId, Long projectId, Long suiteId) {
        requireProjectReadAccess(userId, projectId);
        requireSuite(projectId, suiteId);
        return testSuiteRepository.listTriggers(suiteId);
    }

    public CreatedTestSuiteTrigger createTrigger(Long userId, Long projectId, Long suiteId, CreateTriggerRequest request) {
        requireProjectWriteAccess(userId, projectId);
        requireSuite(projectId, suiteId);
        String name = request == null || request.name() == null ? "" : request.name().trim();
        if (name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trigger name is required");
        }
        String token = generateToken();
        long triggerId = testSuiteRepository.createTrigger(suiteId, name, hashToken(token), token.substring(0, Math.min(token.length(), 10)), userId);
        TestSuiteTriggerSummary trigger = testSuiteRepository.findTriggerSummary(triggerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trigger not found"));
        return new CreatedTestSuiteTrigger(trigger, token);
    }

    public void deleteTrigger(Long userId, Long projectId, Long suiteId, Long triggerId) {
        requireProjectWriteAccess(userId, projectId);
        requireSuite(projectId, suiteId);
        TestSuiteTriggerSummary trigger = testSuiteRepository.findTriggerSummary(triggerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trigger not found"));
        if (!suiteId.equals(trigger.suiteId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Trigger not found");
        }
        testSuiteRepository.deleteTrigger(triggerId);
    }

    public TriggerExecutionReceipt executeByTriggerToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Trigger token is required");
        }
        TestSuiteRepository.TriggerReference trigger = testSuiteRepository.findTriggerByTokenHash(hashToken(rawToken.trim()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid trigger token"));
        if (!trigger.active()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Trigger is inactive");
        }
        TestSuiteRepository.TestSuiteReference suite = testSuiteRepository.findSuiteReference(trigger.suiteId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Test suite not found"));
        TestExecutionDetail execution = executeSuiteInternal(trigger.createdBy(), suite.projectId(), suite.id(), "trigger", trigger.id(), null);
        testSuiteRepository.markTriggerExecuted(trigger.id(), execution.id());
        return new TriggerExecutionReceipt(
                execution.id(),
                execution.suiteId(),
                execution.suiteName(),
                execution.status(),
                execution.totalSteps(),
                execution.passedSteps(),
                execution.failedSteps(),
                execution.durationMs(),
                execution.executedAt());
    }

    @Transactional(readOnly = true)
    public TestSuiteScheduleDetail getSchedule(Long userId, Long projectId, Long suiteId) {
        requireProjectReadAccess(userId, projectId);
        requireSuite(projectId, suiteId);
        return testSuiteRepository.findSchedule(suiteId)
                .orElseGet(() -> new TestSuiteScheduleDetail(null, suiteId, false, 60, null, null, null, null, null));
    }

    public TestSuiteScheduleDetail updateSchedule(Long userId,
                                                  Long projectId,
                                                  Long suiteId,
                                                  UpsertTestSuiteScheduleRequest request) {
        requireProjectWriteAccess(userId, projectId);
        requireSuite(projectId, suiteId);
        UpsertTestSuiteScheduleRequest normalized = normalizeScheduleRequest(request);
        Instant nextRunAt = Boolean.TRUE.equals(normalized.enabled())
                ? computeNextRunAt(Instant.now(), normalized.intervalMinutes())
                : null;
        return testSuiteRepository.saveSchedule(
                suiteId,
                Boolean.TRUE.equals(normalized.enabled()),
                normalized.intervalMinutes(),
                nextRunAt,
                userId);
    }

    public int runDueSchedules(Instant now, int limit) {
        int executedCount = 0;
        for (TestSuiteRepository.DueScheduleReference schedule : testSuiteRepository.listDueSchedules(now, limit)) {
            Instant nextRunAt = computeNextRunAt(now, schedule.intervalMinutes());
            boolean claimed = testSuiteRepository.claimDueSchedule(
                    schedule.id(),
                    schedule.nextRunAt(),
                    now,
                    nextRunAt,
                    schedule.createdBy());
            if (!claimed) {
                continue;
            }
            try {
                TestExecutionDetail execution = executeSuiteInternal(schedule.createdBy(), schedule.projectId(), schedule.suiteId(), "schedule", null, schedule.id());
                testSuiteRepository.markScheduleExecution(schedule.id(), execution.id(), schedule.createdBy());
                executedCount++;
            } catch (RuntimeException exception) {
                log.warn("Failed to execute scheduled test suite {}", schedule.suiteId(), exception);
            }
        }
        return executedCount;
    }

    private TestExecutionDetail executeSuiteInternal(Long executorUserId,
                                                     Long projectId,
                                                     Long suiteId,
                                                     String executionSource,
                                                     Long triggerId,
                                                     Long scheduleId) {
        TestSuiteRepository.TestSuiteReference suite = requireSuiteReference(projectId, suiteId);
        List<TestStepDetail> steps = testSuiteRepository.listSteps(suiteId).stream()
                .filter(TestStepDetail::enabled)
                .toList();
        if (steps.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Test suite has no enabled steps");
        }

        long startedAt = System.nanoTime();
        List<TestExecutionStepResult> results = new ArrayList<>();
        int passedSteps = 0;
        int failedSteps = 0;
        boolean hasErrors = false;
        Map<String, String> variables = new HashMap<>();

        for (TestStepDetail step : steps) {
            try {
                Instant stepStartedAt = Instant.now();
                TestStepScriptEngine.MutableRequest mutableRequest = new TestStepScriptEngine.MutableRequest(
                        step.queryString(),
                        step.body(),
                        step.headers());
                testStepScriptEngine.runPreScript(
                        step.preScript(),
                        step.endpointId(),
                        step.environmentId(),
                        step.name(),
                        mutableRequest,
                        variables);
                String resolvedQueryString = substituteVariables(mutableRequest.getQueryString(), variables);
                List<DebugHeader> resolvedHeaders = substituteHeaders(mutableRequest.toHeaders(), variables);
                String resolvedBody = substituteVariables(mutableRequest.getBody(), variables);
                ExecuteDebugResponse response = debugService.execute(executorUserId, new ExecuteDebugRequest(
                        step.environmentId(),
                        step.endpointId(),
                        resolvedQueryString,
                        resolvedHeaders,
                        resolvedBody));
                List<AssertionResult> assertions = evaluateAssertions(step.assertions(), response);
                List<ExtractedVariableResult> extractedVariables = extractVariables(step.extractors(), response, variables);
                testStepScriptEngine.runPostScript(
                        step.postScript(),
                        step.endpointId(),
                        step.environmentId(),
                        step.name(),
                        mutableRequest,
                        response,
                        assertions,
                        extractedVariables,
                        variables);
                boolean stepPassed = assertions.stream().allMatch(AssertionResult::passed);
                Instant stepFinishedAt = Instant.now();
                if (stepPassed) {
                    passedSteps++;
                } else {
                    failedSteps++;
                }
                results.add(new TestExecutionStepResult(
                        step.stepOrder(),
                        step.name(),
                        step.endpointId(),
                        step.endpointName(),
                        step.method(),
                        step.path(),
                        step.environmentId(),
                        step.environmentName(),
                        response.finalUrl(),
                        stepPassed ? "passed" : "failed",
                        stepStartedAt,
                        stepFinishedAt,
                        response.statusCode(),
                        response.durationMs(),
                        resolvedQueryString,
                        resolvedHeaders,
                        resolvedBody,
                        response.responseBody(),
                        response.responseHeaders(),
                        assertions,
                        extractedVariables,
                        null));
            } catch (ResponseStatusException exception) {
                Instant stepFinishedAt = Instant.now();
                failedSteps++;
                hasErrors = true;
                results.add(new TestExecutionStepResult(
                        step.stepOrder(),
                        step.name(),
                        step.endpointId(),
                        step.endpointName(),
                        step.method(),
                        step.path(),
                        step.environmentId(),
                        step.environmentName(),
                        null,
                        "error",
                        stepFinishedAt,
                        stepFinishedAt,
                        null,
                        0,
                        null,
                        List.of(),
                        null,
                        null,
                        List.of(),
                        List.of(),
                        List.of(),
                        exception.getReason() == null ? exception.getMessage() : exception.getReason()));
            } catch (RuntimeException exception) {
                Instant stepFinishedAt = Instant.now();
                failedSteps++;
                hasErrors = true;
                results.add(new TestExecutionStepResult(
                        step.stepOrder(),
                        step.name(),
                        step.endpointId(),
                        step.endpointName(),
                        step.method(),
                        step.path(),
                        step.environmentId(),
                        step.environmentName(),
                        null,
                        "error",
                        stepFinishedAt,
                        stepFinishedAt,
                        null,
                        0,
                        null,
                        List.of(),
                        null,
                        null,
                        List.of(),
                        List.of(),
                        List.of(),
                        exception.getMessage()));
            }
        }

        String status = hasErrors ? "error" : failedSteps > 0 ? "failed" : "passed";
        long executionId = testSuiteRepository.createExecution(
                suiteId,
                status,
                executionSource,
                triggerId,
                scheduleId,
                steps.size(),
                passedSteps,
                failedSteps,
                (System.nanoTime() - startedAt) / 1_000_000,
                new ExecutionReport(results),
                executorUserId);
        return getExecution(executorUserId, projectId, executionId);
    }

    @Transactional(readOnly = true)
    public List<TestExecutionSummary> listExecutions(Long userId, Long projectId, Long suiteId) {
        requireProjectReadAccess(userId, projectId);
        requireSuite(projectId, suiteId);
        return testSuiteRepository.listExecutionSummaries(suiteId, 20);
    }

    @Transactional(readOnly = true)
    public TestExecutionDetail getExecution(Long userId, Long projectId, Long executionId) {
        requireProjectReadAccess(userId, projectId);
        return testSuiteRepository.findExecution(projectId, executionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Test execution not found"));
    }

    private UpsertTestSuiteRequest normalizeSuiteRequest(UpsertTestSuiteRequest request) {
        String name = request == null || request.name() == null ? "" : request.name().trim();
        if (name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Test suite name is required");
        }
        return new UpsertTestSuiteRequest(name, request == null || request.description() == null ? "" : request.description().trim());
    }

    private List<TestStepUpsertItem> normalizeSteps(Long projectId, List<TestStepUpsertItem> items) {
        if (items == null) {
            return List.of();
        }
        List<TestStepUpsertItem> normalized = new ArrayList<>();
        for (TestStepUpsertItem item : items) {
            if (item == null || item.endpointId() == null || item.environmentId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Each test step must bind one endpoint and one environment");
            }
            EndpointRepository.EndpointReference endpointReference = endpointRepository.findEndpointReference(item.endpointId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Endpoint not found"));
            if (!projectId.equals(endpointReference.projectId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Endpoint does not belong to the project");
            }
            EnvironmentDetail environment = projectRepository.findEnvironment(item.environmentId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Environment not found"));
            if (!projectId.equals(environment.projectId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Environment does not belong to the project");
            }
            EndpointDetail endpoint = endpointRepository.findEndpoint(item.endpointId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Endpoint not found"));
            String name = item.name() == null || item.name().trim().isBlank() ? endpoint.name() : item.name().trim();
            normalized.add(new TestStepUpsertItem(
                    item.endpointId(),
                    item.environmentId(),
                    name,
                    item.enabled() == null ? Boolean.TRUE : item.enabled(),
                    item.queryString() == null ? "" : item.queryString(),
                    normalizeHeaders(item.headers()),
                    item.body() == null ? "" : item.body(),
                    item.preScript() == null ? "" : item.preScript(),
                    item.postScript() == null ? "" : item.postScript(),
                    normalizeAssertions(item.assertions()),
                    normalizeExtractors(item.extractors())));
        }
        return normalized;
    }

    private List<DebugHeader> normalizeHeaders(List<DebugHeader> headers) {
        if (headers == null) {
            return List.of();
        }
        LinkedHashMap<String, DebugHeader> deduplicated = new LinkedHashMap<>();
        for (DebugHeader header : headers) {
            if (header == null || header.name() == null || header.name().trim().isBlank()) {
                continue;
            }
            deduplicated.put(header.name().trim().toLowerCase(), new DebugHeader(header.name().trim(), header.value() == null ? "" : header.value()));
        }
        return List.copyOf(deduplicated.values());
    }

    private List<TestAssertionItem> normalizeAssertions(List<TestAssertionItem> assertions) {
        if (assertions == null) {
            return List.of();
        }
        List<TestAssertionItem> normalized = new ArrayList<>();
        for (TestAssertionItem assertion : assertions) {
            if (assertion == null || assertion.type() == null || assertion.type().trim().isBlank()) {
                continue;
            }
            String type = assertion.type().trim().toLowerCase();
            String expression = assertion.expression() == null ? "" : assertion.expression().trim();
            String expectedValue = assertion.expectedValue() == null ? "" : assertion.expectedValue().trim();
            if (!List.of("status_equals", "status_not_equals", "body_contains", "body_not_contains", "response_time_lte", "json_path_equals", "json_path_exists", "json_path_not_empty").contains(type)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported test assertion type");
            }
            if (List.of("status_equals", "status_not_equals", "body_contains", "body_not_contains", "response_time_lte").contains(type) && expectedValue.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Test assertion expected value is required");
            }
            if (List.of("json_path_equals", "json_path_exists", "json_path_not_empty").contains(type) && expression.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Test assertion expression is required");
            }
            if ("json_path_equals".equals(type) && expectedValue.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Test assertion expected value is required");
            }
            normalized.add(new TestAssertionItem(type, expression, expectedValue));
        }
        return normalized;
    }

    private List<TestExtractorItem> normalizeExtractors(List<TestExtractorItem> extractors) {
        if (extractors == null) {
            return List.of();
        }
        List<TestExtractorItem> normalized = new ArrayList<>();
        for (TestExtractorItem extractor : extractors) {
            if (extractor == null) {
                continue;
            }
            String variableName = extractor.variableName() == null ? "" : extractor.variableName().trim();
            String sourceType = extractor.sourceType() == null ? "" : extractor.sourceType().trim().toLowerCase();
            String expression = extractor.expression() == null ? "" : extractor.expression().trim();
            if (variableName.isBlank() || sourceType.isBlank() || expression.isBlank()) {
                continue;
            }
            if (!List.of("body_json_path", "response_header", "response_status").contains(sourceType)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported test extractor type");
            }
            normalized.add(new TestExtractorItem(variableName, sourceType, expression));
        }
        return normalized;
    }

    private UpsertTestSuiteScheduleRequest normalizeScheduleRequest(UpsertTestSuiteScheduleRequest request) {
        boolean enabled = request != null && Boolean.TRUE.equals(request.enabled());
        int intervalMinutes = request == null || request.intervalMinutes() == null ? 60 : request.intervalMinutes();
        if (intervalMinutes < 5 || intervalMinutes > 10_080) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Schedule interval must be between 5 and 10080 minutes");
        }
        return new UpsertTestSuiteScheduleRequest(enabled, intervalMinutes);
    }

    private List<AssertionResult> evaluateAssertions(List<TestAssertionItem> assertions, ExecuteDebugResponse response) {
        if (assertions == null || assertions.isEmpty()) {
            return List.of();
        }
        List<AssertionResult> results = new ArrayList<>();
        for (TestAssertionItem assertion : assertions) {
            if ("status_equals".equals(assertion.type())) {
                String actual = String.valueOf(response.statusCode());
                boolean passed = actual.equals(assertion.expectedValue());
                results.add(new AssertionResult(assertion.type(), assertion.expression(), assertion.expectedValue(), passed, actual, passed ? "HTTP status matched" : "HTTP status mismatched"));
                continue;
            }
            if ("status_not_equals".equals(assertion.type())) {
                String actual = String.valueOf(response.statusCode());
                boolean passed = !actual.equals(assertion.expectedValue());
                results.add(new AssertionResult(assertion.type(), assertion.expression(), assertion.expectedValue(), passed, actual, passed ? "HTTP status is different as expected" : "HTTP status unexpectedly matched"));
                continue;
            }
            if ("response_time_lte".equals(assertion.type())) {
                long limit = Long.parseLong(assertion.expectedValue());
                String actual = String.valueOf(response.durationMs());
                boolean passed = response.durationMs() <= limit;
                results.add(new AssertionResult(assertion.type(), assertion.expression(), assertion.expectedValue(), passed, actual, passed ? "Response time within threshold" : "Response time exceeded threshold"));
                continue;
            }
            String body = response.responseBody() == null ? "" : response.responseBody();
            if ("body_contains".equals(assertion.type())) {
                boolean passed = body.contains(assertion.expectedValue());
                results.add(new AssertionResult(
                        assertion.type(),
                        assertion.expression(),
                        assertion.expectedValue(),
                        passed,
                        passed ? assertion.expectedValue() : abbreviate(body),
                        passed ? "Response body contains expected text" : "Response body does not contain expected text"));
                continue;
            }
            if ("body_not_contains".equals(assertion.type())) {
                boolean passed = !body.contains(assertion.expectedValue());
                results.add(new AssertionResult(
                        assertion.type(),
                        assertion.expression(),
                        assertion.expectedValue(),
                        passed,
                        abbreviate(body),
                        passed ? "Response body does not contain forbidden text" : "Response body contains forbidden text"));
                continue;
            }
            JsonNode bodyNode = readBodyNode(body);
            String actual = resolveJsonPath(bodyNode, assertion.expression());
            if ("json_path_exists".equals(assertion.type())) {
                boolean passed = actual != null;
                results.add(new AssertionResult(assertion.type(), assertion.expression(), assertion.expectedValue(), passed, actual == null ? "" : actual, passed ? "JSONPath value exists" : "JSONPath value not found"));
                continue;
            }
            if ("json_path_not_empty".equals(assertion.type())) {
                boolean passed = actual != null && !actual.isBlank() && !"null".equalsIgnoreCase(actual);
                results.add(new AssertionResult(assertion.type(), assertion.expression(), assertion.expectedValue(), passed, actual == null ? "" : actual, passed ? "JSONPath value is not empty" : "JSONPath value is empty"));
                continue;
            }
            results.add(new AssertionResult(
                    assertion.type(),
                    assertion.expression(),
                    assertion.expectedValue(),
                    actual != null && actual.equals(assertion.expectedValue()),
                    actual == null ? "" : actual,
                    actual != null && actual.equals(assertion.expectedValue()) ? "JSONPath value matched" : "JSONPath value mismatched"));
        }
        return results;
    }

    private String abbreviate(String value) {
        if (value == null) {
            return "";
        }
        String normalized = value.strip();
        return normalized.length() <= 140 ? normalized : normalized.substring(0, 140) + "...";
    }

    private String substituteVariables(String value, Map<String, String> variables) {
        if (value == null || value.isBlank() || variables.isEmpty()) {
            return value == null ? "" : value;
        }
        Matcher matcher = VARIABLE_PATTERN.matcher(value);
        StringBuilder builder = new StringBuilder();
        while (matcher.find()) {
            String replacement = variables.getOrDefault(matcher.group(1), matcher.group(0));
            matcher.appendReplacement(builder, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(builder);
        return builder.toString();
    }

    private List<DebugHeader> substituteHeaders(List<DebugHeader> headers, Map<String, String> variables) {
        if (headers == null || headers.isEmpty()) {
            return List.of();
        }
        return headers.stream()
                .map(header -> new DebugHeader(header.name(), substituteVariables(header.value(), variables)))
                .toList();
    }

    private List<ExtractedVariableResult> extractVariables(List<TestExtractorItem> extractors,
                                                           ExecuteDebugResponse response,
                                                           Map<String, String> variables) {
        if (extractors == null || extractors.isEmpty()) {
            return List.of();
        }
        JsonNode bodyNode = readBodyNode(response.responseBody());
        List<ExtractedVariableResult> extracted = new ArrayList<>();
        for (TestExtractorItem extractor : extractors) {
            String value = switch (extractor.sourceType()) {
                case "response_status" -> String.valueOf(response.statusCode());
                case "response_header" -> resolveHeader(response.responseHeaders(), extractor.expression());
                case "body_json_path" -> resolveJsonPath(bodyNode, extractor.expression());
                default -> null;
            };
            if (value == null) {
                continue;
            }
            variables.put(extractor.variableName(), value);
            extracted.add(new ExtractedVariableResult(extractor.variableName(), extractor.sourceType(), extractor.expression(), value));
        }
        return extracted;
    }

    private JsonNode readBodyNode(String body) {
        if (body == null || body.isBlank()) {
            return MissingNode.getInstance();
        }
        try {
            return OBJECT_MAPPER.readTree(body);
        } catch (JsonProcessingException exception) {
            return MissingNode.getInstance();
        }
    }

    private String resolveHeader(List<DebugHeader> headers, String headerName) {
        if (headers == null || headerName == null || headerName.isBlank()) {
            return null;
        }
        return headers.stream()
                .filter(header -> header.name() != null && header.name().equalsIgnoreCase(headerName))
                .map(DebugHeader::value)
                .findFirst()
                .orElse(null);
    }

    private String resolveJsonPath(JsonNode bodyNode, String jsonPath) {
        if (bodyNode == null || bodyNode.isMissingNode() || jsonPath == null || jsonPath.isBlank() || !jsonPath.startsWith("$")) {
            return null;
        }
        JsonNode current = bodyNode;
        int index = 1;
        while (index < jsonPath.length()) {
            char token = jsonPath.charAt(index);
            if (token == '.') {
                int nextBoundary = findNextBoundary(jsonPath, index + 1);
                String fieldName = jsonPath.substring(index + 1, nextBoundary);
                if (fieldName.isBlank() || current == null) {
                    return null;
                }
                current = current.get(fieldName);
                index = nextBoundary;
                continue;
            }
            if (token == '[') {
                int closingIndex = jsonPath.indexOf(']', index);
                if (closingIndex == -1 || current == null || !current.isArray()) {
                    return null;
                }
                String rawIndex = jsonPath.substring(index + 1, closingIndex).trim();
                int arrayIndex;
                try {
                    arrayIndex = Integer.parseInt(rawIndex);
                } catch (NumberFormatException exception) {
                    return null;
                }
                current = current.get(arrayIndex);
                index = closingIndex + 1;
                continue;
            }
            return null;
        }
        return normalizeResolvedBodyValue(current);
    }

    private int findNextBoundary(String jsonPath, int start) {
        int index = start;
        while (index < jsonPath.length()) {
            char token = jsonPath.charAt(index);
            if (token == '.' || token == '[') {
                break;
            }
            index++;
        }
        return index;
    }

    private String normalizeResolvedBodyValue(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        if (node.isContainerNode()) {
            try {
                return OBJECT_MAPPER.writeValueAsString(node);
            } catch (JsonProcessingException exception) {
                return null;
            }
        }
        return node.asText();
    }

    private TestDashboardOverview withOverviewPassRate(TestDashboardOverview overview) {
        return new TestDashboardOverview(
                overview.totalSuites(),
                overview.activeSuites(),
                overview.totalExecutions(),
                overview.passedExecutions(),
                overview.failedExecutions(),
                overview.errorExecutions(),
                overview.averageDurationMs(),
                calculatePassRate(overview.passedExecutions(), overview.totalExecutions()));
    }

    private double calculatePassRate(int passedCount, int totalCount) {
        if (totalCount <= 0) {
            return 0.0;
        }
        return Math.round((passedCount * 1000.0) / totalCount) / 10.0;
    }

    private Instant computeNextRunAt(Instant baseTime, int intervalMinutes) {
        return baseTime.plusSeconds(intervalMinutes * 60L);
    }

    private String generateToken() {
        byte[] bytes = new byte[24];
        SECURE_RANDOM.nextBytes(bytes);
        return "ats_" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 not available", exception);
        }
    }

    private void requireProjectReadAccess(Long userId, Long projectId) {
        projectRepository.findProject(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        if (!projectRepository.canAccessProject(userId, projectId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found");
        }
    }

    private void requireProjectWriteAccess(Long userId, Long projectId) {
        requireProjectReadAccess(userId, projectId);
        if (!projectRepository.canWriteProject(userId, projectId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Project write access denied");
        }
    }

    private void requireProjectTestAccess(Long userId, Long projectId) {
        requireProjectReadAccess(userId, projectId);
        if (!projectRepository.canTestProject(userId, projectId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Project test access denied");
        }
    }

    private TestSuiteDetail requireSuite(Long projectId, Long suiteId) {
        return testSuiteRepository.findSuite(projectId, suiteId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Test suite not found"));
    }

    private TestSuiteRepository.TestSuiteReference requireSuiteReference(Long projectId, Long suiteId) {
        TestSuiteRepository.TestSuiteReference suite = testSuiteRepository.findSuiteReference(suiteId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Test suite not found"));
        if (!projectId.equals(suite.projectId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Test suite not found");
        }
        return suite;
    }
}
