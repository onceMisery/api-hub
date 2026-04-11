package com.apihub.auth.service;

import com.apihub.auth.config.AuthTokenProperties;
import com.apihub.auth.model.LoginResponse;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenServiceTest {

    private final JwtTokenService jwtTokenService = new JwtTokenService(
            new AuthTokenProperties("apihub-test", "unit-test-secret-unit-test-secret", 900, 604800)
    );

    @Test
    void shouldIssueSignedAccessAndRefreshTokensWithExpectedClaims() {
        LoginResponse response = jwtTokenService.issueTokens(1L, "admin", 3);

        JwtTokenService.AuthTokenClaims accessClaims = jwtTokenService.parseAccessTokenClaims(response.accessToken())
                .orElseThrow();
        JwtTokenService.AuthTokenClaims refreshClaims = jwtTokenService.parseRefreshToken(response.refreshToken())
                .orElseThrow();

        assertThat(accessClaims.userId()).isEqualTo(1L);
        assertThat(accessClaims.username()).isEqualTo("admin");
        assertThat(accessClaims.tokenVersion()).isEqualTo(3);
        assertThat(accessClaims.tokenType()).isEqualTo("access");
        assertThat(refreshClaims.tokenType()).isEqualTo("refresh");
    }

    @Test
    void shouldRejectTokenWhenVersionDoesNotMatchCurrentUserVersion() {
        LoginResponse response = jwtTokenService.issueTokens(1L, "admin", 2);

        assertThat(jwtTokenService.parseAccessTokenClaims(response.accessToken(), 3)).isEmpty();
        assertThat(jwtTokenService.parseRefreshToken(response.refreshToken(), 3)).isEmpty();
    }
}
