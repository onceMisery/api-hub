package com.apihub.auth.web;

import com.apihub.auth.model.UserSearchResult;
import com.apihub.auth.service.AuthService;
import com.apihub.common.model.ApiResponse;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
public class UserDirectoryController {

    private final AuthService authService;

    public UserDirectoryController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/search")
    public ApiResponse<List<UserSearchResult>> searchUsers(@RequestParam(required = false) String q,
                                                            @RequestParam(required = false) Integer limit,
                                                            Authentication authentication) {
        authService.me((Long) authentication.getPrincipal());
        return ApiResponse.success(authService.searchActiveUsers(q, limit));
    }
}
