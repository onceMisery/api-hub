package com.apihub.testsuite.service;

import com.apihub.debug.model.DebugDtos.DebugHeader;
import com.apihub.debug.model.DebugDtos.ExecuteDebugResponse;
import com.apihub.debug.service.DebugService;
import com.apihub.doc.repository.EndpointRepository;
import com.apihub.project.repository.ProjectRepository;
import com.apihub.testsuite.model.TestSuiteDtos.CreateTriggerRequest;
import com.apihub.testsuite.model.TestSuiteDtos.TestExtractorItem;
import com.apihub.testsuite.model.TestSuiteDtos.TestAssertionItem;
import com.apihub.testsuite.model.TestSuiteDtos.UpsertTestSuiteScheduleRequest;
import com.apihub.testsuite.model.TestSuiteDtos.TestStepUpsertItem;
import com.apihub.testsuite.repository.TestSuiteRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@JdbcTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:test-suite-service;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
@Import({TestSuiteService.class, TestSuiteRepository.class, ProjectRepository.class, EndpointRepository.class})
@Sql(scripts = "/project-service-schema.sql")
@Sql(scripts = "/project-service-data.sql")
class TestSuiteServiceTest {

    @Autowired
    private TestSuiteService testSuiteService;

    @MockBean
    private DebugService debugService;

    @Test
    void shouldListSuitesForReadableProject() {
        assertThat(testSuiteService.listSuites(2L, 1L))
                .hasSize(1)
                .first()
                .satisfies(suite -> {
                    assertThat(suite.name()).isEqualTo("Smoke Suite");
                    assertThat(suite.lastExecutionStatus()).isEqualTo("passed");
                    assertThat(suite.lastExecutionSource()).isEqualTo("manual");
                    assertThat(suite.enabledSteps()).isEqualTo(1);
                });
    }

    @Test
    void shouldReturnProjectDashboard() {
        var dashboard = testSuiteService.getDashboard(2L, 1L);

        assertThat(dashboard.overview().totalSuites()).isEqualTo(1);
        assertThat(dashboard.overview().activeSuites()).isEqualTo(1);
        assertThat(dashboard.overview().totalExecutions()).isEqualTo(1);
        assertThat(dashboard.overview().passedExecutions()).isEqualTo(1);
        assertThat(dashboard.overview().passRate()).isEqualTo(100.0);
        assertThat(dashboard.recentExecutions()).hasSize(1);
        assertThat(dashboard.recentExecutions().getFirst().executionSource()).isEqualTo("manual");
        assertThat(dashboard.suiteHealth()).hasSize(1);
        assertThat(dashboard.suiteHealth().getFirst().suiteName()).isEqualTo("Smoke Suite");
    }

    @Test
    void shouldListTriggersForReadableProject() {
        assertThat(testSuiteService.listTriggers(2L, 1L, 1L))
                .hasSize(1)
                .first()
                .satisfies(trigger -> {
                    assertThat(trigger.name()).isEqualTo("CI Smoke");
                    assertThat(trigger.lastExecutionStatus()).isEqualTo("passed");
                });
    }

    @Test
    void shouldReturnSuiteScheduleForReadableProject() {
        var schedule = testSuiteService.getSchedule(2L, 1L, 1L);

        assertThat(schedule.enabled()).isTrue();
        assertThat(schedule.intervalMinutes()).isEqualTo(60);
        assertThat(schedule.nextRunAt()).isEqualTo(Instant.parse("2026-04-13T03:00:00Z"));
        assertThat(schedule.lastExecutionId()).isEqualTo(1L);
    }

    @Test
    void shouldUpdateSuiteScheduleForEditor() {
        var updated = testSuiteService.updateSchedule(3L, 1L, 1L, new UpsertTestSuiteScheduleRequest(true, 180));

        assertThat(updated.enabled()).isTrue();
        assertThat(updated.intervalMinutes()).isEqualTo(180);
        assertThat(updated.nextRunAt()).isNotNull();
    }

    @Test
    void shouldCreateTriggerForEditor() {
        var created = testSuiteService.createTrigger(3L, 1L, 1L, new CreateTriggerRequest("Nightly CI"));

        assertThat(created.token()).startsWith("ats_");
        assertThat(created.trigger().name()).isEqualTo("Nightly CI");
        assertThat(testSuiteService.listTriggers(3L, 1L, 1L)).hasSize(2);
    }

    @Test
    void shouldExecuteSuiteByTriggerToken() {
        var created = testSuiteService.createTrigger(3L, 1L, 1L, new CreateTriggerRequest("Webhook CI"));
        given(debugService.execute(org.mockito.ArgumentMatchers.eq(3L), any()))
                .willReturn(new ExecuteDebugResponse(
                        "GET",
                        "https://local.dev/users/1001",
                        200,
                        List.of(new DebugHeader("Content-Type", "application/json")),
                        "{\"ok\":true,\"id\":1001}",
                        18));

        var receipt = testSuiteService.executeByTriggerToken(created.token());

        assertThat(receipt.status()).isEqualTo("passed");
        assertThat(receipt.suiteName()).isEqualTo("Smoke Suite");
        assertThat(testSuiteService.getExecution(3L, 1L, receipt.executionId()).executionSource()).isEqualTo("trigger");
        assertThat(testSuiteService.listTriggers(3L, 1L, 1L))
                .filteredOn(trigger -> "Webhook CI".equals(trigger.name()))
                .singleElement()
                .satisfies(trigger -> {
                    assertThat(trigger.lastExecutionId()).isNotNull();
                    assertThat(trigger.lastExecutionStatus()).isEqualTo("passed");
                });
    }

    @Test
    void shouldAllowEditorToReplaceSteps() {
        var updated = testSuiteService.replaceSteps(3L, 1L, 1L, List.of(
                new TestStepUpsertItem(
                        1L,
                        1L,
                        "Editor updated step",
                        true,
                        "id=2002",
                        List.of(new DebugHeader("X-Trace-Id", "suite-run")),
                        "{\"trace\":true}",
                        List.of(
                                new TestAssertionItem("status_equals", "200"),
                                new TestAssertionItem("body_contains", "ok")),
                        List.of(new TestExtractorItem("traceId", "response_header", "X-Trace-Id")))));

        assertThat(updated.steps())
                .hasSize(1)
                .first()
                .satisfies(step -> {
                    assertThat(step.name()).isEqualTo("Editor updated step");
                    assertThat(step.queryString()).isEqualTo("id=2002");
                    assertThat(step.headers()).containsExactly(new DebugHeader("X-Trace-Id", "suite-run"));
                    assertThat(step.assertions()).extracting(TestAssertionItem::type).containsExactly("status_equals", "body_contains");
                    assertThat(step.extractors()).extracting(TestExtractorItem::variableName).containsExactly("traceId");
                });
    }

    @Test
    void shouldRejectViewerExecutingSuite() {
        assertThatThrownBy(() -> testSuiteService.executeSuite(2L, 1L, 1L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void shouldAllowTesterToExecuteSuiteAndPersistExecution() {
        given(debugService.execute(org.mockito.ArgumentMatchers.eq(4L), any()))
                .willReturn(new ExecuteDebugResponse(
                        "GET",
                        "https://local.dev/users/1001",
                        200,
                        List.of(new DebugHeader("Content-Type", "application/json")),
                        "{\"ok\":true,\"id\":1001}",
                        18));

        var execution = testSuiteService.executeSuite(4L, 1L, 1L);

        assertThat(execution.status()).isEqualTo("passed");
        assertThat(execution.totalSteps()).isEqualTo(1);
        assertThat(execution.passedSteps()).isEqualTo(1);
        assertThat(execution.steps()).hasSize(1);
        assertThat(execution.steps().getFirst().responseStatusCode()).isEqualTo(200);
        assertThat(execution.executionSource()).isEqualTo("manual");

        assertThat(testSuiteService.listExecutions(4L, 1L, 1L))
                .hasSize(2)
                .first()
                .satisfies(summary -> {
                    assertThat(summary.status()).isEqualTo("passed");
                    assertThat(summary.executionSource()).isEqualTo("manual");
                });
    }

    @Test
    void shouldSubstituteVariablesBetweenSteps() {
        testSuiteService.replaceSteps(3L, 1L, 1L, List.of(
                new TestStepUpsertItem(
                        1L,
                        1L,
                        "Extract token",
                        true,
                        "",
                        List.of(),
                        "{}",
                        List.of(new TestAssertionItem("status_equals", "200")),
                        List.of(new TestExtractorItem("token", "body_json_path", "$.data.token"))),
                new TestStepUpsertItem(
                        1L,
                        1L,
                        "Use token",
                        true,
                        "",
                        List.of(new DebugHeader("Authorization", "Bearer {{token}}")),
                        "{}",
                        List.of(new TestAssertionItem("status_equals", "200")),
                        List.of())));

        given(debugService.execute(org.mockito.ArgumentMatchers.eq(4L), any()))
                .willReturn(
                        new ExecuteDebugResponse("POST", "https://local.dev/login", 200, List.of(), "{\"data\":{\"token\":\"abc-123\"}}", 12),
                        new ExecuteDebugResponse("GET", "https://local.dev/users/me", 200, List.of(), "{\"ok\":true}", 8)
                );

        var execution = testSuiteService.executeSuite(4L, 1L, 1L);

        assertThat(execution.steps()).hasSize(2);
        assertThat(execution.steps().getFirst().extractedVariables())
                .extracting("variableName", "value")
                .containsExactly(org.assertj.core.groups.Tuple.tuple("token", "abc-123"));
    }

    @Test
    void shouldRunDueSchedulesAndAdvanceNextRunAt() {
        given(debugService.execute(org.mockito.ArgumentMatchers.eq(1L), any()))
                .willReturn(new ExecuteDebugResponse(
                        "GET",
                        "https://local.dev/users/1001",
                        200,
                        List.of(new DebugHeader("Content-Type", "application/json")),
                        "{\"ok\":true,\"id\":1001}",
                        18));

        int executedCount = testSuiteService.runDueSchedules(Instant.parse("2026-04-13T11:05:00Z"), 5);

        assertThat(executedCount).isEqualTo(1);
        assertThat(testSuiteService.listExecutions(1L, 1L, 1L)).hasSize(2);
        assertThat(testSuiteService.getSchedule(1L, 1L, 1L))
                .satisfies(schedule -> {
                    assertThat(schedule.lastExecutionId()).isNotNull();
                    assertThat(schedule.nextRunAt()).isEqualTo(Instant.parse("2026-04-13T12:05:00Z"));
                    assertThat(schedule.lastRunAt()).isEqualTo(Instant.parse("2026-04-13T11:05:00Z"));
                });
        assertThat(testSuiteService.listExecutions(1L, 1L, 1L).getFirst().executionSource()).isEqualTo("schedule");
    }
}
