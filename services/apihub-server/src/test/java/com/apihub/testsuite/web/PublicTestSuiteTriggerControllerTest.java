package com.apihub.testsuite.web;

import com.apihub.auth.repository.AuthUserRepository;
import com.apihub.auth.service.JwtTokenService;
import com.apihub.common.config.SecurityConfig;
import com.apihub.testsuite.model.TestSuiteDtos.TriggerExecutionReceipt;
import com.apihub.testsuite.service.TestSuiteService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PublicTestSuiteTriggerController.class)
@Import(SecurityConfig.class)
class PublicTestSuiteTriggerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TestSuiteService testSuiteService;

    @MockBean
    private JwtTokenService jwtTokenService;

    @MockBean
    private AuthUserRepository authUserRepository;

    @Test
    void shouldExecuteByTriggerTokenWithoutAuthentication() throws Exception {
        given(testSuiteService.executeByTriggerToken("ats_ci_token"))
                .willReturn(new TriggerExecutionReceipt(3L, 1L, "Smoke Suite", "passed", 2, 2, 0, 31, Instant.parse("2026-04-13T10:00:00Z")));

        mockMvc.perform(post("/api/public/test-suite-triggers/execute")
                        .header("X-ApiHub-Trigger-Token", "ats_ci_token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.executionId").value(3))
                .andExpect(jsonPath("$.data.status").value("passed"));
    }
}
