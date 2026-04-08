package com.apihub.auth.model;

public record LoginResponse(String accessToken, String refreshToken) {
}
