package com.apihub.mock.web;

import com.apihub.auth.repository.AuthUserRepository;
import com.apihub.auth.service.JwtTokenService;
import com.apihub.common.config.SecurityConfig;
import com.apihub.mock.model.MockDtos.MockBodyConditionEntry;
import com.apihub.mock.model.MockDtos.MockConditionEntry;
import com.apihub.mock.model.MockDtos.MockRuleDetail;
import com.apihub.mock.model.MockDtos.MockRuleUpsertItem;
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

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ApiMockRuleController.class)
@Import(SecurityConfig.class)
class ApiMockRuleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProjectService projectService;

    @MockBean
    private JwtTokenService jwtTokenService;

    @MockBean
    private AuthUserRepository authUserRepository;

    @Test
    void shouldListEndpointMockRules() throws Exception {
        given(projectService.listMockRules(1L, 31L)).willReturn(List.of(
                new MockRuleDetail(
                        7L,
                        31L,
                        "unauthorized",
                        100,
                        true,
                        List.of(new MockConditionEntry("mode", "strict")),
                        List.of(new MockConditionEntry("x-scenario", "unauthorized")),
                        List.of(new MockBodyConditionEntry("$.user.id", "31")),
                        401,
                        "application/json",
                        "{\"error\":\"token expired\"}"
                )));

        mockMvc.perform(get("/api/v1/endpoints/31/mock-rules")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].ruleName").value("unauthorized"))
                .andExpect(jsonPath("$.data[0].bodyConditions[0].jsonPath").value("$.user.id"))
                .andExpect(jsonPath("$.data[0].bodyConditions[0].expectedValue").value("31"))
                .andExpect(jsonPath("$.data[0].statusCode").value(401));
    }

    @Test
    void shouldReplaceEndpointMockRules() throws Exception {
        mockMvc.perform(put("/api/v1/endpoints/31/mock-rules")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                [
                                  {
                                    "ruleName": "unauthorized",
                                    "priority": 100,
                                    "enabled": true,
                                    "queryConditions": [{ "name": "mode", "value": "strict" }],
                                    "headerConditions": [{ "name": "x-scenario", "value": "unauthorized" }],
                                    "bodyConditions": [{ "jsonPath": "$.user.id", "expectedValue": "31" }],
                                    "statusCode": 401,
                                    "mediaType": "application/json",
                                    "body": "{\\\"error\\\":\\\"token expired\\\"}"
                                  }
                                ]
                                """))
                .andExpect(status().isOk());

        then(projectService).should().replaceMockRules(eq(1L), eq(31L), eq(List.of(
                new MockRuleUpsertItem(
                        "unauthorized",
                        100,
                        true,
                        List.of(new MockConditionEntry("mode", "strict")),
                        List.of(new MockConditionEntry("x-scenario", "unauthorized")),
                        List.of(new MockBodyConditionEntry("$.user.id", "31")),
                        401,
                        "application/json",
                        "{\"error\":\"token expired\"}"
                ))));
    }
}
