package com.apihub.ai.repository;

import com.apihub.ai.model.AiDtos.ProjectAiSettingsDetail;
import com.apihub.ai.model.AiDtos.UpdateProjectAiSettingsRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.Instant;
import java.util.Optional;

@Repository
public class AiSettingsRepository {

    private static final RowMapper<ProjectAiSettingsRecord> ROW_MAPPER = (rs, rowNum) -> new ProjectAiSettingsRecord(
            rs.getLong("id"),
            rs.getLong("project_id"),
            rs.getString("provider_type"),
            rs.getString("base_url"),
            rs.getString("api_key"),
            rs.getString("default_model"),
            rs.getString("description_model"),
            rs.getString("mock_model"),
            rs.getString("code_model"),
            rs.getInt("timeout_ms"),
            rs.getBoolean("enabled"),
            rs.getTimestamp("updated_at") == null ? null : rs.getTimestamp("updated_at").toInstant());

    private final JdbcTemplate jdbcTemplate;

    public AiSettingsRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<ProjectAiSettingsRecord> findByProjectId(Long projectId) {
        return jdbcTemplate.query("""
                select id,
                       project_id,
                       provider_type,
                       base_url,
                       api_key,
                       default_model,
                       description_model,
                       mock_model,
                       code_model,
                       timeout_ms,
                       enabled,
                       updated_at
                from ai_setting
                where project_id = ?
                """, ROW_MAPPER, projectId).stream().findFirst();
    }

    public ProjectAiSettingsRecord save(Long userId,
                                        Long projectId,
                                        UpdateProjectAiSettingsRequest request,
                                        ProjectAiSettingsRecord current) {
        if (current == null) {
            GeneratedKeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                PreparedStatement statement = connection.prepareStatement("""
                        insert into ai_setting (
                            project_id,
                            provider_type,
                            base_url,
                            api_key,
                            default_model,
                            description_model,
                            mock_model,
                            code_model,
                            timeout_ms,
                            enabled,
                            created_by,
                            updated_by
                        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, Statement.RETURN_GENERATED_KEYS);
                statement.setLong(1, projectId);
                statement.setString(2, request.providerType());
                statement.setString(3, request.baseUrl());
                statement.setString(4, request.apiKey());
                statement.setString(5, request.defaultModel());
                statement.setString(6, request.descriptionModel());
                statement.setString(7, request.mockModel());
                statement.setString(8, request.codeModel());
                statement.setInt(9, request.timeoutMs());
                statement.setBoolean(10, Boolean.TRUE.equals(request.enabled()));
                statement.setLong(11, userId);
                statement.setLong(12, userId);
                return statement;
            }, keyHolder);
            return findByProjectId(projectId).orElseThrow();
        }

        jdbcTemplate.update("""
                update ai_setting
                set provider_type = ?,
                    base_url = ?,
                    api_key = ?,
                    default_model = ?,
                    description_model = ?,
                    mock_model = ?,
                    code_model = ?,
                    timeout_ms = ?,
                    enabled = ?,
                    updated_by = ?
                where project_id = ?
                """,
                request.providerType(),
                request.baseUrl(),
                request.apiKey(),
                request.defaultModel(),
                request.descriptionModel(),
                request.mockModel(),
                request.codeModel(),
                request.timeoutMs(),
                Boolean.TRUE.equals(request.enabled()),
                userId,
                projectId);
        return findByProjectId(projectId).orElseThrow();
    }

    public static ProjectAiSettingsDetail toDetail(ProjectAiSettingsRecord record, boolean canManage) {
        return new ProjectAiSettingsDetail(
                record.id(),
                record.projectId(),
                record.providerType(),
                record.baseUrl(),
                record.defaultModel(),
                blankToNull(record.descriptionModel()),
                blankToNull(record.mockModel()),
                blankToNull(record.codeModel()),
                record.timeoutMs(),
                record.enabled(),
                record.apiKey() != null && !record.apiKey().isBlank(),
                canManage,
                record.updatedAt());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    public record ProjectAiSettingsRecord(
            Long id,
            Long projectId,
            String providerType,
            String baseUrl,
            String apiKey,
            String defaultModel,
            String descriptionModel,
            String mockModel,
            String codeModel,
            int timeoutMs,
            boolean enabled,
            Instant updatedAt
    ) {
    }
}
