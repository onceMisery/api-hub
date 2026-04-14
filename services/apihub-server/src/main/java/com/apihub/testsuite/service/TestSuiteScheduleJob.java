package com.apihub.testsuite.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class TestSuiteScheduleJob {

    private final TestSuiteService testSuiteService;

    public TestSuiteScheduleJob(TestSuiteService testSuiteService) {
        this.testSuiteService = testSuiteService;
    }

    @Scheduled(fixedDelayString = "${apihub.testsuite.schedule.poll-interval-ms:60000}")
    public void executeDueSchedules() {
        testSuiteService.runDueSchedules(Instant.now(), 8);
    }
}
