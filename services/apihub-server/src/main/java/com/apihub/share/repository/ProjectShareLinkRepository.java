package com.apihub.share.repository;

import com.apihub.share.model.ProjectShareDtos.ProjectShareLinkDetail;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class ProjectShareLinkRepository {

    private static final RowMapper<ProjectShareLinkDetail> ROW_MAPPER = (rs, rowNum) -> new ProjectShareLinkDetail(
            rs.getLong("id"),
            rs.getLong("project_id"),
            rs.getString("share_code"),
            rs.getString("name"),
            rs.getString("description"),
            rs.getBoolean("enabled"),
            rs.getTimestamp("expires_at") == null ? null : rs.getTimestamp("expires_at").toInstant(),
            rs.getTimestamp("created_at").toInstant(),
            rs.getTimestamp("updated_at").toInstant()
    );

    private final JdbcTemplate jdbcTemplate;

    public ProjectShareLinkRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<ProjectShareLinkDetail> listByProjectId(Long projectId) {
        return jdbcTemplate.query("""
                select id, project_id, share_code, name, description, enabled, expires_at, created_at, updated_at
                from project_share_link
                where project_id = ?
                order by created_at desc, id desc
                """, ROW_MAPPER, projectId);
    }

    public ProjectShareLinkDetail create(Long createdBy,
                                         Long projectId,
                                         String shareCode,
                                         String name,
                                         String description,
                                         boolean enabled,
                                         Instant expiresAt) {
        GeneratedKeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    insert into project_share_link (
                        project_id,
                        share_code,
                        name,
                        description,
                        enabled,
                        expires_at,
                        created_by
                    ) values (?, ?, ?, ?, ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, projectId);
            statement.setString(2, shareCode);
            statement.setString(3, name);
            statement.setString(4, description);
            statement.setBoolean(5, enabled);
            statement.setTimestamp(6, expiresAt == null ? null : java.sql.Timestamp.from(expiresAt));
            statement.setLong(7, createdBy);
            return statement;
        }, keyHolder);
        return findById(requireGeneratedId(keyHolder)).orElseThrow();
    }

    public ProjectShareLinkDetail update(Long shareLinkId,
                                         Long projectId,
                                         String name,
                                         String description,
                                         boolean enabled,
                                         Instant expiresAt) {
        jdbcTemplate.update("""
                update project_share_link
                set name = ?, description = ?, enabled = ?, expires_at = ?, updated_at = current_timestamp
                where id = ? and project_id = ?
                """,
                name,
                description,
                enabled,
                expiresAt == null ? null : java.sql.Timestamp.from(expiresAt),
                shareLinkId,
                projectId);
        return findById(shareLinkId).orElseThrow();
    }

    public Optional<ProjectShareLinkDetail> findById(Long shareLinkId) {
        return jdbcTemplate.query("""
                select id, project_id, share_code, name, description, enabled, expires_at, created_at, updated_at
                from project_share_link
                where id = ?
                """, ROW_MAPPER, shareLinkId).stream().findFirst();
    }

    public Optional<ProjectShareLinkDetail> findByProjectIdAndId(Long projectId, Long shareLinkId) {
        return jdbcTemplate.query("""
                select id, project_id, share_code, name, description, enabled, expires_at, created_at, updated_at
                from project_share_link
                where project_id = ? and id = ?
                """, ROW_MAPPER, projectId, shareLinkId).stream().findFirst();
    }

    public Optional<ProjectShareLinkDetail> findActiveByShareCode(String shareCode) {
        return jdbcTemplate.query("""
                select id, project_id, share_code, name, description, enabled, expires_at, created_at, updated_at
                from project_share_link
                where share_code = ?
                  and enabled = true
                  and (expires_at is null or expires_at > current_timestamp)
                """, ROW_MAPPER, shareCode).stream().findFirst();
    }

    private long requireGeneratedId(GeneratedKeyHolder keyHolder) {
        for (Map<String, Object> keyMap : keyHolder.getKeyList()) {
            Object id = keyMap.get("id");
            if (id instanceof Number number) {
                return number.longValue();
            }
            Object uppercaseId = keyMap.get("ID");
            if (uppercaseId instanceof Number number) {
                return number.longValue();
            }
        }
        Number key = keyHolder.getKey();
        if (key != null) {
            return key.longValue();
        }
        throw new IllegalStateException("Failed to generate primary key");
    }
}
