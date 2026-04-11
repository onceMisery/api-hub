package com.apihub.auth.service;

import com.apihub.auth.config.AuthTokenProperties;
import com.apihub.auth.model.LoginResponse;
import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;

@Service
public class JwtTokenService {

    private final AuthTokenProperties authTokenProperties;
    private final Algorithm algorithm;
    private final JWTVerifier verifier;

    public JwtTokenService(AuthTokenProperties authTokenProperties) {
        this.authTokenProperties = authTokenProperties;
        this.algorithm = Algorithm.HMAC256(authTokenProperties.getSecret());
        this.verifier = JWT.require(algorithm)
                .withIssuer(authTokenProperties.getIssuer())
                .build();
    }

    public LoginResponse issueTokens(Long userId, String username, int tokenVersion) {
        return new LoginResponse(
                signToken(userId, username, tokenVersion, "access", authTokenProperties.getAccessExpiresSeconds()),
                signToken(userId, username, tokenVersion, "refresh", authTokenProperties.getRefreshExpiresSeconds())
        );
    }

    public Optional<Long> parseAccessToken(String token) {
        return parseAccessTokenClaims(token).map(AuthTokenClaims::userId);
    }

    public Optional<AuthTokenClaims> parseAccessTokenClaims(String token) {
        return parseToken(token, "access", null);
    }

    public Optional<AuthTokenClaims> parseAccessTokenClaims(String token, int currentTokenVersion) {
        return parseToken(token, "access", currentTokenVersion);
    }

    public Optional<AuthTokenClaims> parseRefreshToken(String token) {
        return parseToken(token, "refresh", null);
    }

    public Optional<AuthTokenClaims> parseRefreshToken(String token, int currentTokenVersion) {
        return parseToken(token, "refresh", currentTokenVersion);
    }

    private String signToken(Long userId, String username, int tokenVersion, String tokenType, long expiresSeconds) {
        Instant now = Instant.now();
        return JWT.create()
                .withIssuer(authTokenProperties.getIssuer())
                .withSubject(String.valueOf(userId))
                .withClaim("username", username)
                .withClaim("tokenVersion", tokenVersion)
                .withClaim("tokenType", tokenType)
                .withIssuedAt(now)
                .withExpiresAt(now.plusSeconds(expiresSeconds))
                .sign(algorithm);
    }

    private Optional<AuthTokenClaims> parseToken(String token, String expectedTokenType, Integer currentTokenVersion) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }

        try {
            DecodedJWT decodedToken = verifier.verify(token);
            String tokenType = decodedToken.getClaim("tokenType").asString();
            Integer tokenVersion = decodedToken.getClaim("tokenVersion").asInt();
            String username = decodedToken.getClaim("username").asString();
            String subject = decodedToken.getSubject();

            if (!expectedTokenType.equals(tokenType) || tokenVersion == null || username == null || subject == null || subject.isBlank()) {
                return Optional.empty();
            }

            Long userId = Long.parseLong(subject);
            if (currentTokenVersion != null && tokenVersion.intValue() != currentTokenVersion.intValue()) {
                return Optional.empty();
            }

            return Optional.of(new AuthTokenClaims(userId, username, tokenVersion, tokenType));
        } catch (RuntimeException ex) {
            return Optional.empty();
        }
    }

    public record AuthTokenClaims(Long userId, String username, int tokenVersion, String tokenType) {
    }
}
