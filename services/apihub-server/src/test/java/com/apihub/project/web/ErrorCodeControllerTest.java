package com.apihub.project.web;

import com.apihub.auth.repository.AuthUserRepository;
import com.apihub.auth.service.JwtTokenService;
import com.apihub.common.config.SecurityConfig;
import com.apihub.project.model.ProjectDtos.ErrorCodeDetail;
import com.apihub.project.model.ProjectDtos.ErrorCodeImportResult;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ErrorCodeController.class)
@Import(SecurityConfig.class)
class ErrorCodeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProjectService projectService;

    @MockBean
    private JwtTokenService jwtTokenService;

    @MockBean
    private AuthUserRepository authUserRepository;

    @Test
    void shouldListAndCreateErrorCodes() throws Exception {
        given(projectService.listErrorCodes(1L, 1L)).willReturn(List.of(
                new ErrorCodeDetail(1L, 1L, "USER_NOT_FOUND", "用户不存在", "根据用户 ID 未查询到记录", "检查用户 ID", 404)));
        given(projectService.createErrorCode(org.mockito.ArgumentMatchers.eq(1L), org.mockito.ArgumentMatchers.eq(1L), any()))
                .willReturn(new ErrorCodeDetail(2L, 1L, "ORDER_NOT_FOUND", "订单不存在", "根据订单号未查询到记录", "检查订单号", 404));

        mockMvc.perform(get("/api/v1/projects/1/error-codes")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].code").value("USER_NOT_FOUND"));

        mockMvc.perform(post("/api/v1/projects/1/error-codes")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of())))
                        .contentType("application/json")
                        .content("""
                                {"code":"ORDER_NOT_FOUND","name":"订单不存在","description":"根据订单号未查询到记录","solution":"检查订单号","httpStatus":404}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.code").value("ORDER_NOT_FOUND"));
    }

    @Test
    void shouldImportErrorCodes() throws Exception {
        given(projectService.importErrorCodes(org.mockito.ArgumentMatchers.eq(1L), org.mockito.ArgumentMatchers.eq(1L), any()))
                .willReturn(new ErrorCodeImportResult(1, 1));

        mockMvc.perform(post("/api/v1/projects/1/error-codes/import")
                        .with(authentication(new UsernamePasswordAuthenticationToken(1L, "token", List.of())))
                        .contentType("application/json")
                        .content("""
                                {
                                  "items": [
                                    {
                                      "code": "USER_NOT_FOUND",
                                      "name": "用户不存在",
                                      "description": "根据用户 ID 未查询到记录",
                                      "solution": "检查用户 ID",
                                      "httpStatus": 404
                                    }
                                  ]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.createdCount").value(1))
                .andExpect(jsonPath("$.data.updatedCount").value(1));
    }
}
