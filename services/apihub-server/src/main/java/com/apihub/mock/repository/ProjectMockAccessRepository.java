package com.apihub.mock.repository;

import com.apihub.mock.model.ProjectMockDtos.MockAccessMode;
import com.apihub.mock.model.ProjectMockDtos.MockAccessSettings;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class ProjectMockAccessRepository {

    private final JdbcTemplate jdbcTemplate;

    public ProjectMockAccessRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<MockAccessSettings> findByProjectId(Long projectId) {
        return jdbcTemplate.query("""
                select id, mock_access_mode, mock_access_token
                from project
                where id = ?
                """, (rs, rowNum) -> new MockAccessSettings(
                rs.getLong("id"),
                MockAccessMode.fromDatabaseValue(rs.getString("mock_access_mode")),
                rs.getString("mock_access_token")), projectId).stream().findFirst();
    }

    public MockAccessSettings update(Long projectId, MockAccessMode mode, String token) {
        jdbcTemplate.update("""
                update project
                set mock_access_mode = ?, mock_access_token = ?
                where id = ?
                """, mode.toDatabaseValue(), token, projectId);
        return findByProjectId(projectId).orElseThrow();
    }
}
