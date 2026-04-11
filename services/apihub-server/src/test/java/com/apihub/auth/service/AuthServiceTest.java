package com.apihub.auth.service;

import com.apihub.auth.config.AuthTokenProperties;
import com.apihub.auth.model.LoginRequest;
import com.apihub.auth.model.LoginResponse;
import com.apihub.auth.repository.AuthUserRepository;
import com.apihub.auth.repository.AuthUserRepository.UserCredential;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    private static final String PASSWORD_HASH = new BCryptPasswordEncoder().encode("123456");

    @Mock
    private AuthUserRepository authUserRepository;

    @Test
    void shouldLoginWithRealJwtTokens() {
        JwtTokenService jwtTokenService = new JwtTokenService(
                new AuthTokenProperties("apihub-test", "unit-test-secret-unit-test-secret", 900, 604800)
        );
        AuthService authService = new AuthService(authUserRepository, jwtTokenService);

        given(authUserRepository.findActiveByUsername("admin"))
                .willReturn(Optional.of(new UserCredential(1L, "admin", PASSWORD_HASH, "active", 0)));

        LoginResponse response = authService.login(new LoginRequest("admin", "123456"));

        assertThat(response.accessToken()).contains(".");
        assertThat(response.refreshToken()).contains(".");
    }
}
