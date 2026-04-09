package com.apihub.debug.web;

import com.apihub.auth.service.JwtTokenService;
import com.apihub.common.config.SecurityConfig;
import com.apihub.debug.model.DebugDtos.DebugHeader;
import com.apihub.debug.model.DebugDtos.DebugHistoryItem;
import com.apihub.debug.service.DebugService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DebugHistoryController.class)
@Import(SecurityConfig.class)
class DebugHistoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DebugService debugService;

    @MockBean
    private JwtTokenService jwtTokenService;

    @Test
    void shouldReturnProjectDebugHistory() throws Exception {
        given(debugService.listHistory(1L, 31L, 5)).willReturn(List.of(
                new DebugHistoryItem(
                        101L,
                        1L,
                        41L,
                        31L,
                        "GET",
                        "https://local.dev/api/users/31",
                        List.of(new DebugHeader("X-App", "ApiHub")),
                        "",
                        200,
                        List.of(new DebugHeader("content-type", "application/json")),
                        "{\"ok\":true}",
                        35L,
                        Instant.parse("2026-04-09T04:12:30Z"))));

        mockMvc.perform(get("/api/v1/projects/1/debug-history")
                        .with(user("tester"))
                        .param("endpointId", "31")
                        .param("limit", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].statusCode").value(200))
                .andExpect(jsonPath("$.data[0].finalUrl").value("https://local.dev/api/users/31"));
    }
}
