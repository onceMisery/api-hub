package com.apihub.project.web;

import com.apihub.auth.repository.AuthUserRepository;
import com.apihub.auth.service.JwtTokenService;
import com.apihub.common.config.SecurityConfig;
import com.apihub.project.model.ProjectDtos.AuditLogDetail;
import com.apihub.project.service.ProjectService;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuditLogController.class)
@Import(SecurityConfig.class)
class AuditLogControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProjectService projectService;

    @MockBean
    private JwtTokenService jwtTokenService;

    @MockBean
    private AuthUserRepository authUserRepository;

    @Test
    void shouldListAuditLogs() throws Exception {
        given(projectService.listAuditLogs(1L, 1L, 80)).willReturn(List.of(
                new AuditLogDetail(1L, 1L, 1L, "管理员", "module.create", "module", 9L, "Audit Module", "{\"moduleId\":9}", Instant.parse("2026-04-15T04:00:00Z"))));

        mockMvc.perform(get("/api/v1/projects/1/audit-logs")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].actionType").value("module.create"))
                .andExpect(jsonPath("$.data[0].resourceName").value("Audit Module"));
    }
}
