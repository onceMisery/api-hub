package com.apihub.testsuite.web;

import com.apihub.auth.repository.AuthUserRepository;
import com.apihub.auth.service.JwtTokenService;
import com.apihub.common.config.SecurityConfig;
import com.apihub.testsuite.model.TestSuiteDtos.CreateTriggerRequest;
import com.apihub.testsuite.model.TestSuiteDtos.CreatedTestSuiteTrigger;
import com.apihub.testsuite.model.TestSuiteDtos.TestDashboardDetail;
import com.apihub.testsuite.model.TestSuiteDtos.TestDashboardExecutionItem;
import com.apihub.testsuite.model.TestSuiteDtos.TestDashboardOverview;
import com.apihub.testsuite.model.TestSuiteDtos.TestDashboardSuiteHealthItem;
import com.apihub.testsuite.model.TestSuiteDtos.TestExecutionDetail;
import com.apihub.testsuite.model.TestSuiteDtos.TestExecutionStepResult;
import com.apihub.testsuite.model.TestSuiteDtos.TestSuiteScheduleDetail;
import com.apihub.testsuite.model.TestSuiteDtos.TestSuiteTriggerSummary;
import com.apihub.testsuite.model.TestSuiteDtos.TestSuiteSummary;
import com.apihub.testsuite.model.TestSuiteDtos.UpsertTestSuiteScheduleRequest;
import com.apihub.testsuite.service.TestSuiteService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TestSuiteController.class)
@Import(SecurityConfig.class)
class TestSuiteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TestSuiteService testSuiteService;

    @MockBean
    private JwtTokenService jwtTokenService;

    @MockBean
    private AuthUserRepository authUserRepository;

    @Test
    void shouldListProjectTestSuites() throws Exception {
        given(testSuiteService.listSuites(1L, 1L))
                .willReturn(List.of(new TestSuiteSummary(1L, 1L, "Smoke Suite", "Seed smoke suite", 1, 1, "passed", "manual", Instant.parse("2026-04-12T10:05:00Z"))));

        mockMvc.perform(get("/api/v1/projects/1/test-suites")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].name").value("Smoke Suite"))
                .andExpect(jsonPath("$.data[0].lastExecutionStatus").value("passed"))
                .andExpect(jsonPath("$.data[0].lastExecutionSource").value("manual"));
    }

    @Test
    void shouldGetDashboard() throws Exception {
        given(testSuiteService.getDashboard(1L, 1L))
                .willReturn(new TestDashboardDetail(
                        new TestDashboardOverview(2, 2, 6, 4, 1, 1, 37, 66.7),
                        List.of(new TestDashboardExecutionItem(9L, 1L, "Smoke Suite", "passed", "trigger", 2, 2, 0, 18, Instant.parse("2026-04-13T09:00:00Z"))),
                        List.of(new TestDashboardSuiteHealthItem(1L, "Smoke Suite", 3, 2, "passed", Instant.parse("2026-04-13T09:00:00Z"), 4, 75.0, 26))));

        mockMvc.perform(get("/api/v1/projects/1/test-suites/dashboard")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.overview.totalSuites").value(2))
                .andExpect(jsonPath("$.data.recentExecutions[0].suiteName").value("Smoke Suite"))
                .andExpect(jsonPath("$.data.recentExecutions[0].executionSource").value("trigger"))
                .andExpect(jsonPath("$.data.suiteHealth[0].passRate").value(75.0));
    }

    @Test
    void shouldListSuiteTriggers() throws Exception {
        given(testSuiteService.listTriggers(1L, 1L, 1L))
                .willReturn(List.of(new TestSuiteTriggerSummary(1L, 1L, "CI Smoke", "ats_seed", true, Instant.parse("2026-04-12T10:01:00Z"), Instant.parse("2026-04-12T10:05:00Z"), 1L, "passed", Instant.parse("2026-04-12T10:05:00Z"))));

        mockMvc.perform(get("/api/v1/projects/1/test-suites/1/triggers")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].name").value("CI Smoke"))
                .andExpect(jsonPath("$.data[0].tokenPrefix").value("ats_seed"));
    }

    @Test
    void shouldGetSuiteSchedule() throws Exception {
        given(testSuiteService.getSchedule(1L, 1L, 1L))
                .willReturn(new TestSuiteScheduleDetail(1L, 1L, true, 60, Instant.parse("2026-04-13T11:00:00Z"), Instant.parse("2026-04-13T10:00:00Z"), 1L, "passed", Instant.parse("2026-04-12T10:05:00Z")));

        mockMvc.perform(get("/api/v1/projects/1/test-suites/1/schedule")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.enabled").value(true))
                .andExpect(jsonPath("$.data.intervalMinutes").value(60));
    }

    @Test
    void shouldUpdateSuiteSchedule() throws Exception {
        given(testSuiteService.updateSchedule(org.mockito.ArgumentMatchers.eq(1L), org.mockito.ArgumentMatchers.eq(1L), org.mockito.ArgumentMatchers.eq(1L), org.mockito.ArgumentMatchers.any(UpsertTestSuiteScheduleRequest.class)))
                .willReturn(new TestSuiteScheduleDetail(1L, 1L, true, 180, Instant.parse("2026-04-13T12:00:00Z"), Instant.parse("2026-04-13T09:00:00Z"), 2L, "passed", Instant.parse("2026-04-13T09:10:00Z")));

        mockMvc.perform(put("/api/v1/projects/1/test-suites/1/schedule")
                        .contentType("application/json")
                        .content("{\"enabled\":true,\"intervalMinutes\":180}")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.enabled").value(true))
                .andExpect(jsonPath("$.data.intervalMinutes").value(180));
    }

    @Test
    void shouldCreateSuiteTrigger() throws Exception {
        given(testSuiteService.createTrigger(org.mockito.ArgumentMatchers.eq(1L), org.mockito.ArgumentMatchers.eq(1L), org.mockito.ArgumentMatchers.eq(1L), org.mockito.ArgumentMatchers.any(CreateTriggerRequest.class)))
                .willReturn(new CreatedTestSuiteTrigger(
                        new TestSuiteTriggerSummary(2L, 1L, "Nightly CI", "ats_live", true, Instant.parse("2026-04-13T09:00:00Z"), null, null, null, null),
                        "ats_live_token"));

        mockMvc.perform(post("/api/v1/projects/1/test-suites/1/triggers")
                        .contentType("application/json")
                        .content("{\"name\":\"Nightly CI\"}")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.trigger.name").value("Nightly CI"))
                .andExpect(jsonPath("$.data.token").value("ats_live_token"));
    }

    @Test
    void shouldExecuteSuite() throws Exception {
        given(testSuiteService.executeSuite(1L, 1L, 1L))
                .willReturn(new TestExecutionDetail(
                        2L,
                        1L,
                        "Smoke Suite",
                        "passed",
                        "manual",
                        1,
                        1,
                        0,
                        18,
                        Instant.parse("2026-04-13T09:00:00Z"),
                        List.of(new TestExecutionStepResult(
                                0,
                                "Get user smoke",
                                1L,
                                "Get User",
                                "GET",
                                "/users/{id}",
                                1L,
                                "Local",
                                "https://local.dev/users/1001",
                                "passed",
                                200,
                                18,
                                "{\"ok\":true}",
                                List.of(),
                                List.of(),
                                List.of(),
                                null))));

        mockMvc.perform(post("/api/v1/projects/1/test-suites/1/execute")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("passed"))
                .andExpect(jsonPath("$.data.executionSource").value("manual"))
                .andExpect(jsonPath("$.data.steps[0].stepName").value("Get user smoke"))
                .andExpect(jsonPath("$.data.steps[0].responseStatusCode").value(200));
    }
}
