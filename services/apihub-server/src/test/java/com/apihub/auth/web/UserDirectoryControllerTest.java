package com.apihub.auth.web;

import com.apihub.auth.repository.AuthUserRepository;
import com.apihub.auth.service.AuthService;
import com.apihub.auth.service.JwtTokenService;
import com.apihub.common.config.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserDirectoryController.class)
@Import(SecurityConfig.class)
class UserDirectoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthService authService;

    @MockBean
    private JwtTokenService jwtTokenService;

    @MockBean
    private AuthUserRepository authUserRepository;

    @Test
    void shouldSearchUsersWithBearerToken() throws Exception {
        given(jwtTokenService.parseAccessTokenClaims("access.jwt.token")).willReturn(java.util.Optional.of(
                new JwtTokenService.AuthTokenClaims(1L, "admin", 0, "access")));
        given(authUserRepository.findActiveById(1L)).willReturn(java.util.Optional.of(
                new AuthUserRepository.UserCredential(1L, "admin", "Administrator", "admin@example.com", "hash", "active", 0)));
        given(authService.me(1L)).willReturn(new com.apihub.auth.model.AuthMeResponse(1L, "admin", "Administrator", "admin@example.com"));
        given(authService.searchActiveUsers("adm", 10)).willReturn(java.util.List.of(
                new com.apihub.auth.model.UserSearchResult(2L, "alice", "Alice", "alice@example.com")));

        mockMvc.perform(get("/api/v1/users/search")
                        .param("q", "adm")
                        .param("limit", "10")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access.jwt.token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].username").value("alice"));
    }
}
