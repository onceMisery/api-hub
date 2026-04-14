package com.apihub.doc.web;

import com.apihub.auth.repository.AuthUserRepository;
import com.apihub.auth.service.JwtTokenService;
import com.apihub.common.config.SecurityConfig;
import com.apihub.doc.service.ProjectExportService;
import com.apihub.doc.service.ProjectExportService.ExportedDocument;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProjectExportController.class)
@Import(SecurityConfig.class)
class ProjectExportControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProjectExportService projectExportService;

    @MockBean
    private JwtTokenService jwtTokenService;

    @MockBean
    private AuthUserRepository authUserRepository;

    @Test
    void shouldDownloadOpenApiExport() throws Exception {
        given(projectExportService.exportOpenApi(1L, 1L))
                .willReturn(new ExportedDocument("default-openapi.json", "application/json", "{\"openapi\":\"3.0.3\"}".getBytes(StandardCharsets.UTF_8)));

        mockMvc.perform(get("/api/v1/projects/1/exports/openapi")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of()))))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("default-openapi.json")))
                .andExpect(content().contentType("application/json"))
                .andExpect(content().json("{\"openapi\":\"3.0.3\"}"));
    }
}
