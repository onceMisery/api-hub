package com.apihub.mock.web;

import com.apihub.auth.service.JwtTokenService;
import com.apihub.common.config.SecurityConfig;
import com.apihub.mock.model.MockDtos.MockSimulationResult;
import com.apihub.project.service.ProjectService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ApiMockSimulationController.class)
@Import(SecurityConfig.class)
class ApiMockSimulationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProjectService projectService;

    @MockBean
    private JwtTokenService jwtTokenService;

    @Test
    void shouldSimulateDraftMockRules() throws Exception {
        given(projectService.simulateMock(eq(31L), any())).willReturn(
                new MockSimulationResult(
                        "rule",
                        "Unauthorized",
                        100,
                        List.of("Matched query mode=strict"),
                        401,
                        "application/json",
                        "{\"error\":\"token expired\"}"
                ));

        mockMvc.perform(post("/api/v1/endpoints/31/mock-simulations")
                        .with(user("tester"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "draftRules": [],
                                  "draftResponses": [],
                                  "querySamples": [{"name":"mode","value":"strict"}],
                                  "headerSamples": []
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.source").value("rule"))
                .andExpect(jsonPath("$.data.statusCode").value(401));
    }
}
