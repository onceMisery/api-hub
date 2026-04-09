package com.apihub.debug.service;

import com.apihub.debug.model.DebugDtos.DebugHeader;
import com.apihub.debug.model.DebugDtos.DebugHistoryItem;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.Instant;
import java.util.List;

@Repository
public class DebugHistoryRepository {

    private static final long DEFAULT_USER_ID = 1L;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final JdbcTemplate jdbcTemplate;

    public DebugHistoryRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void saveHistory(Long projectId,
                            Long environmentId,
                            Long endpointId,
                            String method,
                            String finalUrl,
                            List<DebugHeader> requestHeaders,
                            String requestBody,
                            int statusCode,
                            List<DebugHeader> responseHeaders,
                            String responseBody,
                            long durationMs) {
        GeneratedKeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    insert into debug_history (
                        project_id,
                        environment_id,
                        endpoint_id,
                        http_method,
                        final_url,
                        request_headers_json,
                        request_body,
                        response_status_code,
                        response_headers_json,
                        response_body,
                        duration_ms,
                        created_by
                    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, projectId);
            statement.setLong(2, environmentId);
            statement.setLong(3, endpointId);
            statement.setString(4, method);
            statement.setString(5, finalUrl);
            statement.setString(6, toJson(requestHeaders));
            statement.setString(7, requestBody);
            statement.setInt(8, statusCode);
            statement.setString(9, toJson(responseHeaders));
            statement.setString(10, responseBody);
            statement.setLong(11, durationMs);
            statement.setLong(12, DEFAULT_USER_ID);
            return statement;
        }, keyHolder);
    }

    public List<DebugHistoryItem> listHistory(Long projectId, Long endpointId, int limit) {
        String sql = endpointId == null
                ? """
                select id, project_id, environment_id, endpoint_id, http_method, final_url,
                       request_headers_json, request_body, response_status_code, response_headers_json,
                       response_body, duration_ms, created_at
                from debug_history
                where project_id = ?
                order by created_at desc, id desc
                limit ?
                """
                : """
                select id, project_id, environment_id, endpoint_id, http_method, final_url,
                       request_headers_json, request_body, response_status_code, response_headers_json,
                       response_body, duration_ms, created_at
                from debug_history
                where project_id = ? and endpoint_id = ?
                order by created_at desc, id desc
                limit ?
                """;

        RowMapper<DebugHistoryItem> rowMapper = (rs, rowNum) -> new DebugHistoryItem(
                rs.getLong("id"),
                rs.getLong("project_id"),
                rs.getLong("environment_id"),
                rs.getLong("endpoint_id"),
                rs.getString("http_method"),
                rs.getString("final_url"),
                fromJson(rs.getString("request_headers_json")),
                rs.getString("request_body"),
                rs.getInt("response_status_code"),
                fromJson(rs.getString("response_headers_json")),
                rs.getString("response_body"),
                rs.getLong("duration_ms"),
                rs.getTimestamp("created_at").toInstant());

        if (endpointId == null) {
            return jdbcTemplate.query(sql, rowMapper, projectId, limit);
        }
        return jdbcTemplate.query(sql, rowMapper, projectId, endpointId, limit);
    }

    private String toJson(List<DebugHeader> headers) {
        try {
            return OBJECT_MAPPER.writeValueAsString(headers == null ? List.of() : headers);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize debug history headers", exception);
        }
    }

    private List<DebugHeader> fromJson(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }

        try {
            return OBJECT_MAPPER.readValue(json, new TypeReference<List<DebugHeader>>() {
            });
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to parse debug history headers", exception);
        }
    }
}
