package com.apihub.auth.service;

import com.apihub.auth.model.LoginResponse;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class JwtTokenService {

    public LoginResponse issueTokens(String userId) {
        return new LoginResponse("access-" + userId, "refresh-" + userId);
    }

    public Optional<Long> parseAccessToken(String token) {
        if (token == null || !token.startsWith("access-")) {
            return Optional.empty();
        }

        String userIdValue = token.substring("access-".length()).trim();
        if (userIdValue.isEmpty()) {
            return Optional.empty();
        }

        try {
            return Optional.of(Long.parseLong(userIdValue));
        } catch (NumberFormatException ex) {
            return Optional.empty();
        }
    }
}
