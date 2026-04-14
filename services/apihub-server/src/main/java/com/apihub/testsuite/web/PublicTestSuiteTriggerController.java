package com.apihub.testsuite.web;

import com.apihub.common.model.ApiResponse;
import com.apihub.testsuite.model.TestSuiteDtos.TriggerExecutionReceipt;
import com.apihub.testsuite.service.TestSuiteService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/test-suite-triggers")
public class PublicTestSuiteTriggerController {

    private final TestSuiteService testSuiteService;

    public PublicTestSuiteTriggerController(TestSuiteService testSuiteService) {
        this.testSuiteService = testSuiteService;
    }

    @PostMapping("/execute")
    public ApiResponse<TriggerExecutionReceipt> execute(@RequestHeader(name = "X-ApiHub-Trigger-Token", required = false) String triggerToken) {
        return ApiResponse.success(testSuiteService.executeByTriggerToken(triggerToken));
    }
}
