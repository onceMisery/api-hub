package com.apihub.auth.web;

import com.apihub.auth.model.AuthMeResponse;
import com.apihub.auth.model.LoginResponse;
import com.apihub.auth.model.RefreshTokenRequest;
import com.apihub.auth.service.AuthService;
import com.apihub.auth.service.JwtTokenService;
import com.apihub.common.config.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import(SecurityConfig.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthService authService;

    @MockBean
    private JwtTokenService jwtTokenService;

    @Test
    void shouldLoginSuccessfully() throws Exception {
        given(authService.login(any())).willReturn(new LoginResponse("access", "refresh"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"admin","password":"123456"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").value("access"));
    }

    @Test
    void shouldRefreshTokens() throws Exception {
        given(authService.refresh(any(RefreshTokenRequest.class))).willReturn(new LoginResponse("new-access", "new-refresh"));

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"refreshToken":"refresh.jwt.token"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").value("new-access"))
                .andExpect(jsonPath("$.data.refreshToken").value("new-refresh"));
    }

    @Test
    void shouldReturnCurrentUserProfile() throws Exception {
        given(jwtTokenService.parseAccessToken("access.jwt.token")).willReturn(java.util.Optional.of(1L));
        given(authService.me(1L)).willReturn(new AuthMeResponse(1L, "admin", "Administrator"));

        mockMvc.perform(get("/api/v1/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access.jwt.token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value("admin"))
                .andExpect(jsonPath("$.data.displayName").value("Administrator"));
    }

    @Test
    void shouldLogoutCurrentSession() throws Exception {
        given(jwtTokenService.parseAccessToken("access.jwt.token")).willReturn(java.util.Optional.of(1L));

        mockMvc.perform(post("/api/v1/auth/logout")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access.jwt.token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0));

        then(authService).should().logout(1L);
    }

    @Test
    void shouldRequireBearerTokenForLogout() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout"))
                .andExpect(status().isUnauthorized());
    }
}
