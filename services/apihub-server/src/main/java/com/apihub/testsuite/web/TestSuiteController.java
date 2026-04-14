package com.apihub.testsuite.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.testsuite.model.TestSuiteDtos.TestDashboardDetail;
import com.apihub.testsuite.model.TestSuiteDtos.TestExecutionDetail;
import com.apihub.testsuite.model.TestSuiteDtos.TestExecutionSummary;
import com.apihub.testsuite.model.TestSuiteDtos.TestStepUpsertItem;
import com.apihub.testsuite.model.TestSuiteDtos.TestSuiteDetail;
import com.apihub.testsuite.model.TestSuiteDtos.TestSuiteScheduleDetail;
import com.apihub.testsuite.model.TestSuiteDtos.TestSuiteSummary;
import com.apihub.testsuite.model.TestSuiteDtos.CreateTriggerRequest;
import com.apihub.testsuite.model.TestSuiteDtos.CreatedTestSuiteTrigger;
import com.apihub.testsuite.model.TestSuiteDtos.TestSuiteTriggerSummary;
import com.apihub.testsuite.model.TestSuiteDtos.UpsertTestSuiteScheduleRequest;
import com.apihub.testsuite.model.TestSuiteDtos.UpsertTestSuiteRequest;
import com.apihub.testsuite.service.TestSuiteService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/test-suites")
public class TestSuiteController {

    private final TestSuiteService testSuiteService;

    public TestSuiteController(TestSuiteService testSuiteService) {
        this.testSuiteService = testSuiteService;
    }

    @GetMapping
    public ApiResponse<List<TestSuiteSummary>> listSuites(@PathVariable Long projectId, Authentication authentication) {
        return ApiResponse.success(testSuiteService.listSuites((Long) authentication.getPrincipal(), projectId));
    }

    @GetMapping("/dashboard")
    public ApiResponse<TestDashboardDetail> getDashboard(@PathVariable Long projectId, Authentication authentication) {
        return ApiResponse.success(testSuiteService.getDashboard((Long) authentication.getPrincipal(), projectId));
    }

    @PostMapping
    public ApiResponse<TestSuiteDetail> createSuite(@PathVariable Long projectId,
                                                    @RequestBody UpsertTestSuiteRequest request,
                                                    Authentication authentication) {
        return ApiResponse.success(testSuiteService.createSuite((Long) authentication.getPrincipal(), projectId, request));
    }

    @GetMapping("/{suiteId}")
    public ApiResponse<TestSuiteDetail> getSuite(@PathVariable Long projectId,
                                                 @PathVariable Long suiteId,
                                                 Authentication authentication) {
        return ApiResponse.success(testSuiteService.getSuite((Long) authentication.getPrincipal(), projectId, suiteId));
    }

    @PutMapping("/{suiteId}")
    public ApiResponse<TestSuiteDetail> updateSuite(@PathVariable Long projectId,
                                                    @PathVariable Long suiteId,
                                                    @RequestBody UpsertTestSuiteRequest request,
                                                    Authentication authentication) {
        return ApiResponse.success(testSuiteService.updateSuite((Long) authentication.getPrincipal(), projectId, suiteId, request));
    }

    @DeleteMapping("/{suiteId}")
    public ApiResponse<Void> deleteSuite(@PathVariable Long projectId,
                                         @PathVariable Long suiteId,
                                         Authentication authentication) {
        testSuiteService.deleteSuite((Long) authentication.getPrincipal(), projectId, suiteId);
        return ApiResponse.success(null);
    }

    @PutMapping("/{suiteId}/steps")
    public ApiResponse<TestSuiteDetail> replaceSteps(@PathVariable Long projectId,
                                                     @PathVariable Long suiteId,
                                                     @RequestBody List<TestStepUpsertItem> request,
                                                     Authentication authentication) {
        return ApiResponse.success(testSuiteService.replaceSteps((Long) authentication.getPrincipal(), projectId, suiteId, request));
    }

    @PostMapping("/{suiteId}/execute")
    public ApiResponse<TestExecutionDetail> executeSuite(@PathVariable Long projectId,
                                                         @PathVariable Long suiteId,
                                                         Authentication authentication) {
        return ApiResponse.success(testSuiteService.executeSuite((Long) authentication.getPrincipal(), projectId, suiteId));
    }

    @GetMapping("/{suiteId}/executions")
    public ApiResponse<List<TestExecutionSummary>> listExecutions(@PathVariable Long projectId,
                                                                  @PathVariable Long suiteId,
                                                                  Authentication authentication) {
        return ApiResponse.success(testSuiteService.listExecutions((Long) authentication.getPrincipal(), projectId, suiteId));
    }

    @GetMapping("/{suiteId}/triggers")
    public ApiResponse<List<TestSuiteTriggerSummary>> listTriggers(@PathVariable Long projectId,
                                                                   @PathVariable Long suiteId,
                                                                   Authentication authentication) {
        return ApiResponse.success(testSuiteService.listTriggers((Long) authentication.getPrincipal(), projectId, suiteId));
    }

    @PostMapping("/{suiteId}/triggers")
    public ApiResponse<CreatedTestSuiteTrigger> createTrigger(@PathVariable Long projectId,
                                                              @PathVariable Long suiteId,
                                                              @RequestBody CreateTriggerRequest request,
                                                              Authentication authentication) {
        return ApiResponse.success(testSuiteService.createTrigger((Long) authentication.getPrincipal(), projectId, suiteId, request));
    }

    @GetMapping("/{suiteId}/schedule")
    public ApiResponse<TestSuiteScheduleDetail> getSchedule(@PathVariable Long projectId,
                                                            @PathVariable Long suiteId,
                                                            Authentication authentication) {
        return ApiResponse.success(testSuiteService.getSchedule((Long) authentication.getPrincipal(), projectId, suiteId));
    }

    @PutMapping("/{suiteId}/schedule")
    public ApiResponse<TestSuiteScheduleDetail> updateSchedule(@PathVariable Long projectId,
                                                               @PathVariable Long suiteId,
                                                               @RequestBody UpsertTestSuiteScheduleRequest request,
                                                               Authentication authentication) {
        return ApiResponse.success(testSuiteService.updateSchedule((Long) authentication.getPrincipal(), projectId, suiteId, request));
    }

    @DeleteMapping("/{suiteId}/triggers/{triggerId}")
    public ApiResponse<Void> deleteTrigger(@PathVariable Long projectId,
                                           @PathVariable Long suiteId,
                                           @PathVariable Long triggerId,
                                           Authentication authentication) {
        testSuiteService.deleteTrigger((Long) authentication.getPrincipal(), projectId, suiteId, triggerId);
        return ApiResponse.success(null);
    }

    @GetMapping("/executions/{executionId}")
    public ApiResponse<TestExecutionDetail> getExecution(@PathVariable Long projectId,
                                                         @PathVariable Long executionId,
                                                         Authentication authentication) {
        return ApiResponse.success(testSuiteService.getExecution((Long) authentication.getPrincipal(), projectId, executionId));
    }
}
