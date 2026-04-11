package com.apihub.auth.web;

import com.apihub.auth.model.AuthMeResponse;
import com.apihub.auth.model.LoginRequest;
import com.apihub.auth.model.LoginResponse;
import com.apihub.auth.model.RefreshTokenRequest;
import com.apihub.auth.service.AuthService;
import com.apihub.common.model.ApiResponse;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@RequestBody LoginRequest request) {
        return ApiResponse.success(authService.login(request));
    }

    @PostMapping("/refresh")
    public ApiResponse<LoginResponse> refresh(@RequestBody RefreshTokenRequest request) {
        return ApiResponse.success(authService.refresh(request));
    }

    @GetMapping("/me")
    public ApiResponse<AuthMeResponse> me(Authentication authentication) {
        return ApiResponse.success(authService.me((Long) authentication.getPrincipal()));
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(Authentication authentication) {
        authService.logout((Long) authentication.getPrincipal());
        return ApiResponse.success(null);
    }
}
