package com.apihub.mock.web;

import com.apihub.auth.repository.AuthUserRepository;
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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
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

    @MockBean
    private AuthUserRepository authUserRepository;

    @Test
    void shouldSimulateDraftMockRules() throws Exception {
        given(projectService.simulateMock(eq(1L), eq(31L), any())).willReturn(
                new MockSimulationResult(
                        "rule",
                        "Unauthorized",
                        100,
                        List.of("Matched query mode=strict"),
                        List.of(),
                        401,
                        "application/json",
                        "{\"error\":\"token expired\"}",
                        220
                ));

        mockMvc.perform(post("/api/v1/endpoints/31/mock-simulations")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "draftRules": [],
                                  "draftResponses": [],
                                  "querySamples": [{"name":"mode","value":"strict"}],
                                  "headerSamples": [],
                                  "bodySample": "{\\\"user\\\":{\\\"id\\\":31}}"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.source").value("rule"))
                .andExpect(jsonPath("$.data.statusCode").value(401))
                .andExpect(jsonPath("$.data.delayMs").value(220));

        then(projectService).should().simulateMock(eq(1L), eq(31L), argThat(request ->
                "{\"user\":{\"id\":31}}".equals(request.bodySample())));
    }
}
