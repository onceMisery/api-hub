package com.apihub.project.web;

import com.apihub.auth.repository.AuthUserRepository;
import com.apihub.common.config.SecurityConfig;
import com.apihub.auth.service.JwtTokenService;
import com.apihub.project.model.ProjectDtos.ProjectDetail;
import com.apihub.project.model.ProjectDtos.ProjectTreeResponse;
import com.apihub.project.service.ProjectService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProjectController.class)
@Import(SecurityConfig.class)
class ProjectTreeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProjectService projectService;

    @MockBean
    private JwtTokenService jwtTokenService;

    @MockBean
    private AuthUserRepository authUserRepository;

    @Test
    void shouldReturnProjectTree() throws Exception {
        given(projectService.getProjectTree(1L, 1L)).willReturn(new ProjectTreeResponse(List.of()));

        mockMvc.perform(get("/api/v1/projects/1/tree")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.modules").isArray());

        verify(projectService).getProjectTree(1L, 1L);
    }

    @Test
    void shouldReturnProjectList() throws Exception {
        given(projectService.listProjects(1L)).willReturn(List.of(
                new ProjectDetail(1L, "Default Project", "default", "Seed project", List.of())));

        mockMvc.perform(get("/api/v1/projects")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].projectKey").value("default"));

        verify(projectService).listProjects(1L);
    }
}
