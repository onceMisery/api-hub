package com.apihub.auth.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
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
                select id, username, display_name, email, password_hash, status, token_version
                from sys_user
                where username = ? and status = 'active'
                """,
                rs -> rs.next()
                        ? Optional.of(new UserCredential(
                        rs.getLong("id"),
                        rs.getString("username"),
                        rs.getString("display_name"),
                        rs.getString("email"),
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
                select id, username, display_name, email, password_hash, status, token_version
                from sys_user
                where id = ? and status = 'active'
                """,
                rs -> rs.next()
                        ? Optional.of(new UserCredential(
                        rs.getLong("id"),
                        rs.getString("username"),
                        rs.getString("display_name"),
                        rs.getString("email"),
                        rs.getString("password_hash"),
                        rs.getString("status"),
                        rs.getInt("token_version")))
                        : Optional.empty(),
                userId
        );
    }

    public List<UserSearchRecord> searchActiveUsers(String query, int limit) {
        String normalizedQuery = query == null ? "" : query.trim();
        if (normalizedQuery.isEmpty()) {
            return jdbcTemplate.query(
                    """
                    select id, username, display_name, email
                    from sys_user
                    where status = 'active'
                    order by username asc, id asc
                    limit ?
                    """,
                    (rs, rowNum) -> new UserSearchRecord(
                            rs.getLong("id"),
                            rs.getString("username"),
                            rs.getString("display_name"),
                            rs.getString("email")),
                    limit
            );
        }

        String likeQuery = "%" + normalizedQuery.toLowerCase() + "%";
        return jdbcTemplate.query(
                """
                select id, username, display_name, email
                from sys_user
                where status = 'active'
                  and (
                      lower(username) like ?
                      or lower(display_name) like ?
                      or lower(email) like ?
                  )
                order by username asc, id asc
                limit ?
                """,
                (rs, rowNum) -> new UserSearchRecord(
                        rs.getLong("id"),
                        rs.getString("username"),
                        rs.getString("display_name"),
                        rs.getString("email")),
                likeQuery,
                likeQuery,
                likeQuery,
                limit
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

    public record UserCredential(Long id, String username, String displayName, String email, String passwordHash, String status, int tokenVersion) {
        public UserCredential(Long id, String username, String displayName, String passwordHash, String status, int tokenVersion) {
            this(id, username, displayName, null, passwordHash, status, tokenVersion);
        }
    }

    public record UserSearchRecord(Long id, String username, String displayName, String email) {
    }
}
