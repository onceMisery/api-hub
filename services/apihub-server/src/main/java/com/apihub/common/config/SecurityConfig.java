package com.apihub.common.config;

import com.apihub.auth.security.BearerAuthenticationFilter;
import com.apihub.auth.service.JwtTokenService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import jakarta.servlet.http.HttpServletResponse;

@Configuration
public class SecurityConfig {

    @Bean
    public BearerAuthenticationFilter bearerAuthenticationFilter(JwtTokenService jwtTokenService) {
        return new BearerAuthenticationFilter(jwtTokenService);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, BearerAuthenticationFilter bearerAuthenticationFilter)
            throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .exceptionHandling(exception -> exception.authenticationEntryPoint((request, response, authException) ->
                        response.sendError(HttpServletResponse.SC_UNAUTHORIZED)))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/api/v1/auth/**", "/api/health").permitAll()
                        .anyRequest().authenticated())
                .addFilterBefore(bearerAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }
}
