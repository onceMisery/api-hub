package com.apihub.auth.security;

import com.apihub.auth.service.JwtTokenService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

public class BearerAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenService jwtTokenService;

    public BearerAuthenticationFilter(JwtTokenService jwtTokenService) {
        this.jwtTokenService = jwtTokenService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String authorization = request.getHeader("Authorization");
        if (authorization != null && authorization.startsWith("Bearer ")) {
            String token = authorization.substring("Bearer ".length()).trim();
            jwtTokenService.parseAccessToken(token).ifPresent(userId -> {
                var authentication = new UsernamePasswordAuthenticationToken(userId, token, List.of());
                SecurityContextHolder.getContext().setAuthentication(authentication);
            });
        }

        filterChain.doFilter(request, response);
    }
}
