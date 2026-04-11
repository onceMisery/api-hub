package com.apihub.auth.model;

public record AuthMeResponse(Long id, String username, String displayName, String email) {
    public AuthMeResponse(Long id, String username, String displayName) {
        this(id, username, displayName, null);
    }
}
