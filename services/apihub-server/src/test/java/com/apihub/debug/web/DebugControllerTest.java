package com.apihub.debug.web;

import com.apihub.auth.repository.AuthUserRepository;
import com.apihub.auth.service.JwtTokenService;
import com.apihub.common.config.SecurityConfig;
import com.apihub.debug.model.DebugDtos.DebugHeader;
import com.apihub.debug.model.DebugDtos.ExecuteDebugResponse;
import com.apihub.debug.service.DebugSecurityException;
import com.apihub.debug.service.DebugService;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DebugController.class)
@Import(SecurityConfig.class)
class DebugControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DebugService debugService;

    @MockBean
    private JwtTokenService jwtTokenService;

    @MockBean
    private AuthUserRepository authUserRepository;

    @Test
    void shouldExecuteDebugRequest() throws Exception {
        given(debugService.execute(eq(1L), any())).willReturn(new ExecuteDebugResponse(
                "GET",
                "https://local.dev/api/users/31?verbose=true",
                200,
                List.of(new DebugHeader("Content-Type", "application/json")),
                "{\"ok\":true}",
                42));

        mockMvc.perform(post("/api/v1/debug/execute")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "environmentId": 41,
                                  "endpointId": 31,
                                  "queryString": "verbose=true",
                                  "headers": [{"name":"X-Trace","value":"abc"}],
                                  "body": ""
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.finalUrl").value("https://local.dev/api/users/31?verbose=true"))
                .andExpect(jsonPath("$.data.statusCode").value(200))
                .andExpect(jsonPath("$.data.responseHeaders[0].name").value("Content-Type"));
    }

    @Test
    void shouldReturnStructuredPolicyError() throws Exception {
        given(debugService.execute(eq(1L), any())).willThrow(DebugSecurityException.forbidden(
                "DEBUG_TARGET_NOT_ALLOWED",
                "鐩爣涓绘満 blocked.example.com 鏈湪璋冭瘯鐧藉悕鍗曚腑",
                "blocked.example.com",
                List.of()));

        mockMvc.perform(post("/api/v1/debug/execute")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "environmentId": 41,
                                  "endpointId": 31,
                                  "queryString": "",
                                  "headers": [],
                                  "body": ""
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("鐩爣涓绘満 blocked.example.com 鏈湪璋冭瘯鐧藉悕鍗曚腑"))
                .andExpect(jsonPath("$.data.errorCode").value("DEBUG_TARGET_NOT_ALLOWED"))
                .andExpect(jsonPath("$.data.host").value("blocked.example.com"));
    }
}
