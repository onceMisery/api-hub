package com.apihub.auth.service;

import com.apihub.auth.model.LoginResponse;
import org.springframework.stereotype.Service;

@Service
public class JwtTokenService {

    public LoginResponse issueTokens(String userId) {
        return new LoginResponse("access-" + userId, "refresh-" + userId);
    }
}
