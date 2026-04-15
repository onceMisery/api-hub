package com.apihub.ai.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public class AiKnowledgeChunkRepository {

    private static final RowMapper<KnowledgeChunkRecord> ROW_MAPPER = (rs, rowNum) -> new KnowledgeChunkRecord(
            rs.getLong("id"),
            rs.getLong("project_id"),
            rs.getObject("endpoint_id", Long.class),
            rs.getString("source_type"),
            rs.getString("source_ref"),
            rs.getInt("chunk_order"),
            rs.getString("title"),
            rs.getString("content"),
            rs.getTimestamp("created_at") == null ? null : rs.getTimestamp("created_at").toInstant(),
            rs.getTimestamp("updated_at") == null ? null : rs.getTimestamp("updated_at").toInstant());

    private final JdbcTemplate jdbcTemplate;

    public AiKnowledgeChunkRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<KnowledgeChunkRecord> listByProject(Long projectId) {
        return jdbcTemplate.query("""
                select id,
                       project_id,
                       endpoint_id,
                       source_type,
                       source_ref,
                       chunk_order,
                       title,
                       content,
                       created_at,
                       updated_at
                from ai_knowledge_chunk
                where project_id = ?
                order by endpoint_id, chunk_order, id
                """, ROW_MAPPER, projectId);
    }

    public void replaceChunks(Long projectId, Long endpointId, List<KnowledgeChunkUpsertItem> chunks) {
        deleteByEndpoint(endpointId);
        if (chunks == null || chunks.isEmpty()) {
            return;
        }
        for (KnowledgeChunkUpsertItem chunk : chunks) {
            jdbcTemplate.update("""
                    insert into ai_knowledge_chunk (
                        project_id,
                        endpoint_id,
                        source_type,
                        source_ref,
                        chunk_order,
                        title,
                        content
                    ) values (?, ?, ?, ?, ?, ?, ?)
                    """,
                    projectId,
                    endpointId,
                    chunk.sourceType(),
                    chunk.sourceRef(),
                    chunk.chunkOrder(),
                    chunk.title(),
                    chunk.content());
        }
    }

    public void deleteByEndpoint(Long endpointId) {
        jdbcTemplate.update("delete from ai_knowledge_chunk where endpoint_id = ?", endpointId);
    }

    public record KnowledgeChunkRecord(
            Long id,
            Long projectId,
            Long endpointId,
            String sourceType,
            String sourceRef,
            int chunkOrder,
            String title,
            String content,
            Instant createdAt,
            Instant updatedAt
    ) {
    }

    public record KnowledgeChunkUpsertItem(
            String sourceType,
            String sourceRef,
            int chunkOrder,
            String title,
            String content
    ) {
    }
}
