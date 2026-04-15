package com.apihub.project.web;

import com.apihub.auth.repository.AuthUserRepository;
import com.apihub.auth.service.JwtTokenService;
import com.apihub.common.config.SecurityConfig;
import com.apihub.project.model.ProjectDtos.DictionaryGroupDetail;
import com.apihub.project.model.ProjectDtos.DictionaryImportResult;
import com.apihub.project.model.ProjectDtos.DictionaryItemDetail;
import com.apihub.project.service.ProjectService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DictionaryController.class)
@Import(SecurityConfig.class)
class DictionaryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProjectService projectService;

    @MockBean
    private JwtTokenService jwtTokenService;

    @MockBean
    private AuthUserRepository authUserRepository;

    @Test
    void shouldListDictionaryGroups() throws Exception {
        given(projectService.listDictionaryGroups(1L, 1L)).willReturn(List.of(
                new DictionaryGroupDetail(1L, 1L, "UserStatus", "用户状态", 2)));

        mockMvc.perform(get("/api/v1/projects/1/dictionary-groups")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].name").value("UserStatus"))
                .andExpect(jsonPath("$.data[0].itemCount").value(2));
    }

    @Test
    void shouldCreateAndUpdateDictionaryItem() throws Exception {
        given(projectService.createDictionaryItem(org.mockito.ArgumentMatchers.eq(1L), org.mockito.ArgumentMatchers.eq(2L), any()))
                .willReturn(new DictionaryItemDetail(5L, 2L, "ACTIVE", "激活", "启用中", 0));
        given(projectService.updateDictionaryItem(org.mockito.ArgumentMatchers.eq(1L), org.mockito.ArgumentMatchers.eq(5L), any()))
                .willReturn(new DictionaryItemDetail(5L, 2L, "ACTIVE", "已激活", "启用中", 10));

        mockMvc.perform(post("/api/v1/dictionary-groups/2/items")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of())))
                        .contentType("application/json")
                        .content("""
                                {"code":"ACTIVE","value":"激活","description":"启用中","sortOrder":0}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.code").value("ACTIVE"));

        mockMvc.perform(patch("/api/v1/dictionary-items/5")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of())))
                        .contentType("application/json")
                        .content("""
                                {"code":"ACTIVE","value":"已激活","description":"启用中","sortOrder":10}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.value").value("已激活"));
    }

    @Test
    void shouldImportDictionaryGroups() throws Exception {
        given(projectService.importDictionaryGroups(org.mockito.ArgumentMatchers.eq(1L), org.mockito.ArgumentMatchers.eq(1L), any()))
                .willReturn(new DictionaryImportResult(1, 1, 2, 1));

        mockMvc.perform(post("/api/v1/projects/1/dictionary-groups/import")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of())))
                        .contentType("application/json")
                        .content("""
                                {
                                  "groups": [
                                    {
                                      "name": "UserStatus",
                                      "description": "用户状态",
                                      "items": [
                                        {"code":"ACTIVE","value":"激活","description":"启用","sortOrder":0}
                                      ]
                                    }
                                  ]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.createdGroups").value(1))
                .andExpect(jsonPath("$.data.updatedItems").value(1));
    }
}
