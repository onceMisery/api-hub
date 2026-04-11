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
                select id, username, password_hash, status, token_version
                from sys_user
                where username = ? and status = 'active'
                """,
                rs -> rs.next()
                        ? Optional.of(new UserCredential(
                        rs.getLong("id"),
                        rs.getString("username"),
                        rs.getString("password_hash"),
                        rs.getString("status"),
                        rs.getInt("token_version")))
                        : Optional.empty(),
                username
        );
    }

    public Optional<UserCredential> findActiveById(Long userId) {
        return jdbcTemplate.query(
                """
                select id, username, password_hash, status, token_version
                from sys_user
                where id = ? and status = 'active'
                """,
                rs -> rs.next()
                        ? Optional.of(new UserCredential(
                        rs.getLong("id"),
                        rs.getString("username"),
                        rs.getString("password_hash"),
                        rs.getString("status"),
                        rs.getInt("token_version")))
                        : Optional.empty(),
                userId
        );
    }

    public int incrementTokenVersion(Long userId) {
        jdbcTemplate.update(
                """
                update sys_user
                set token_version = token_version + 1
                where id = ?
                """,
                userId
        );

        Integer tokenVersion = jdbcTemplate.queryForObject(
                "select token_version from sys_user where id = ?",
                Integer.class,
                userId
        );
        return tokenVersion == null ? 0 : tokenVersion;
    }

    public record UserCredential(Long id, String username, String passwordHash, String status, int tokenVersion) {
    }
}
