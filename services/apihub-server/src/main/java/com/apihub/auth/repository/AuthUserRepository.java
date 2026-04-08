package com.apihub.auth.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class AuthUserRepository {

    private final JdbcTemplate jdbcTemplate;

    public AuthUserRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<UserCredential> findActiveByUsername(String username) {
        return jdbcTemplate.query(
                """
                select id, username, password_hash, status
                from sys_user
                where username = ? and status = 'active'
                """,
                rs -> rs.next()
                        ? Optional.of(new UserCredential(
                        rs.getLong("id"),
                        rs.getString("username"),
                        rs.getString("password_hash"),
                        rs.getString("status")))
                        : Optional.empty(),
                username
        );
    }

    public record UserCredential(Long id, String username, String passwordHash, String status) {
    }
}
