package com.apihub.auth.service;

import com.apihub.auth.model.AuthMeResponse;
import com.apihub.auth.model.LoginRequest;
import com.apihub.auth.model.LoginResponse;
import com.apihub.auth.model.RefreshTokenRequest;
import com.apihub.auth.repository.AuthUserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final AuthUserRepository authUserRepository;
    private final JwtTokenService jwtTokenService;
    private final PasswordEncoder passwordEncoder;

    public AuthService(AuthUserRepository authUserRepository, JwtTokenService jwtTokenService) {
        this.authUserRepository = authUserRepository;
        this.jwtTokenService = jwtTokenService;
        this.passwordEncoder = new BCryptPasswordEncoder();
    }

    public LoginResponse login(LoginRequest request) {
        var user = authUserRepository.findActiveByUsername(request.username())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bad credentials"));

        if (!passwordEncoder.matches(request.password(), user.passwordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bad credentials");
        }

        return jwtTokenService.issueTokens(user.id(), user.username(), user.tokenVersion());
    }

    public LoginResponse refresh(RefreshTokenRequest request) {
        if (request == null || request.refreshToken() == null || request.refreshToken().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token invalid");
        }

        var claims = jwtTokenService.parseRefreshToken(request.refreshToken())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token invalid"));
        var user = authUserRepository.findActiveById(claims.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token invalid"));

        if (user.tokenVersion() != claims.tokenVersion()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token invalid");
        }

        int nextTokenVersion = authUserRepository.incrementTokenVersion(user.id());
        return jwtTokenService.issueTokens(user.id(), user.username(), nextTokenVersion);
    }

    public AuthMeResponse me(Long userId) {
        var user = authUserRepository.findActiveById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        return new AuthMeResponse(user.id(), user.username(), user.displayName());
    }

    public void logout(Long userId) {
        authUserRepository.incrementTokenVersion(userId);
    }
}
