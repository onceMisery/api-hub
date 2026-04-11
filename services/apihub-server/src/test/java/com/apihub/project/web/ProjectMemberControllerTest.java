package com.apihub.project.web;

import com.apihub.auth.repository.AuthUserRepository;
import com.apihub.auth.service.JwtTokenService;
import com.apihub.common.config.SecurityConfig;
import com.apihub.project.model.ProjectDtos.ProjectMemberDetail;
import com.apihub.project.model.ProjectDtos.UpsertProjectMemberRequest;
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

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProjectMemberController.class)
@Import(SecurityConfig.class)
class ProjectMemberControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProjectService projectService;

    @MockBean
    private JwtTokenService jwtTokenService;

    @MockBean
    private AuthUserRepository authUserRepository;

    @Test
    void shouldReturnProjectMembers() throws Exception {
        given(projectService.listProjectMembers(1L, 1L)).willReturn(List.of(
                new ProjectMemberDetail(1L, "admin", "Administrator", "admin@local.dev", "project_admin", true)));

        mockMvc.perform(get("/api/v1/projects/1/members")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].username").value("admin"))
                .andExpect(jsonPath("$.data[0].roleCode").value("project_admin"));

        verify(projectService).listProjectMembers(1L, 1L);
    }

    @Test
    void shouldUpsertProjectMember() throws Exception {
        given(projectService.saveProjectMember(1L, 1L, new UpsertProjectMemberRequest("viewer", "editor")))
                .willReturn(new ProjectMemberDetail(2L, "viewer", "Viewer User", "viewer@local.dev", "editor", false));

        mockMvc.perform(put("/api/v1/projects/1/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "viewer",
                                  "roleCode": "editor"
                                }
                                """)
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.roleCode").value("editor"));

        verify(projectService).saveProjectMember(1L, 1L, new UpsertProjectMemberRequest("viewer", "editor"));
    }

    @Test
    void shouldDeleteProjectMember() throws Exception {
        mockMvc.perform(delete("/api/v1/projects/1/members/2")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").doesNotExist());

        verify(projectService).deleteProjectMember(1L, 1L, 2L);
    }
}
