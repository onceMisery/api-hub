package com.apihub.doc.repository;

import com.apihub.doc.model.DocDtos.CreateEndpointRequest;
import com.apihub.doc.model.DocDtos.CreateVersionRequest;
import com.apihub.doc.model.DocDtos.UpdateEndpointRequest;
import com.apihub.doc.model.EndpointDetail;
import com.apihub.doc.model.VersionDetail;
import com.apihub.project.repository.ProjectRepository.GroupReference;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Optional;

@Repository
public class EndpointRepository {

    private static final long DEFAULT_USER_ID = 1L;

    private static final RowMapper<EndpointDetail> ENDPOINT_ROW_MAPPER = (rs, rowNum) -> new EndpointDetail(
            rs.getLong("id"),
            rs.getLong("group_id"),
            rs.getString("name"),
            rs.getString("http_method"),
            rs.getString("path"),
            rs.getString("description"));

    private static final RowMapper<VersionDetail> VERSION_ROW_MAPPER = (rs, rowNum) -> new VersionDetail(
            rs.getLong("id"),
            rs.getLong("endpoint_id"),
            rs.getString("version_label"),
            rs.getString("change_summary"),
            rs.getString("snapshot_json"));

    private final JdbcTemplate jdbcTemplate;

    public EndpointRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<EndpointDetail> listEndpoints(Long groupId) {
        return jdbcTemplate.query("""
                select id, group_id, name, http_method, path, description
                from api_endpoint
                where group_id = ?
                order by sort_order, id
                """, ENDPOINT_ROW_MAPPER, groupId);
    }

    public EndpointDetail createEndpoint(GroupReference groupReference, CreateEndpointRequest request) {
        GeneratedKeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    insert into api_endpoint (
                        project_id,
                        module_id,
                        group_id,
                        name,
                        description,
                        route_key,
                        http_method,
                        path,
                        status,
                        sort_order,
                        created_by,
                        updated_by
                    ) values (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, groupReference.projectId());
            statement.setLong(2, groupReference.moduleId());
            statement.setLong(3, groupReference.id());
            statement.setString(4, request.name());
            statement.setString(5, request.description());
            statement.setString(6, routeKey(request.method(), request.path()));
            statement.setString(7, request.method());
            statement.setString(8, request.path());
            statement.setInt(9, nextEndpointSortOrder(groupReference.id()));
            statement.setLong(10, DEFAULT_USER_ID);
            statement.setLong(11, DEFAULT_USER_ID);
            return statement;
        }, keyHolder);
        return findEndpoint(requireGeneratedId(keyHolder)).orElseThrow();
    }

    public Optional<EndpointDetail> findEndpoint(Long endpointId) {
        return jdbcTemplate.query("""
                select id, group_id, name, http_method, path, description
                from api_endpoint
                where id = ?
                """, ENDPOINT_ROW_MAPPER, endpointId).stream().findFirst();
    }

    public Optional<EndpointReference> findEndpointReference(Long endpointId) {
        return jdbcTemplate.query("""
                select id, group_id
                from api_endpoint
                where id = ?
                """, (rs, rowNum) -> new EndpointReference(
                rs.getLong("id"),
                rs.getLong("group_id")), endpointId).stream().findFirst();
    }

    public EndpointDetail updateEndpoint(Long endpointId, UpdateEndpointRequest request) {
        jdbcTemplate.update("""
                update api_endpoint
                set name = ?, description = ?, route_key = ?, http_method = ?, path = ?, updated_by = ?
                where id = ?
                """,
                request.name(),
                request.description(),
                routeKey(request.method(), request.path()),
                request.method(),
                request.path(),
                DEFAULT_USER_ID,
                endpointId);
        return findEndpoint(endpointId).orElseThrow();
    }

    public List<VersionDetail> listVersions(Long endpointId) {
        return jdbcTemplate.query("""
                select id,
                       endpoint_id,
                       coalesce(version_label, concat('r', revision_no)) as version_label,
                       change_summary,
                       snapshot_json
                from api_version
                where endpoint_id = ?
                order by revision_no, id
                """, VERSION_ROW_MAPPER, endpointId);
    }

    public VersionDetail createVersion(Long endpointId, CreateVersionRequest request) {
        GeneratedKeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    insert into api_version (endpoint_id, revision_no, version_label, snapshot_json, change_summary, created_by)
                    values (?, ?, ?, ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, endpointId);
            statement.setInt(2, nextRevisionNo(endpointId));
            statement.setString(3, request.version());
            statement.setString(4, request.snapshotJson());
            statement.setString(5, request.changeSummary());
            statement.setLong(6, DEFAULT_USER_ID);
            return statement;
        }, keyHolder);
        return findVersion(requireGeneratedId(keyHolder)).orElseThrow();
    }

    public Optional<VersionDetail> findVersion(Long versionId) {
        return jdbcTemplate.query("""
                select id,
                       endpoint_id,
                       coalesce(version_label, concat('r', revision_no)) as version_label,
                       change_summary,
                       snapshot_json
                from api_version
                where id = ?
                """, VERSION_ROW_MAPPER, versionId).stream().findFirst();
    }

    private int nextEndpointSortOrder(Long groupId) {
        Integer maxSort = jdbcTemplate.queryForObject(
                "select coalesce(max(sort_order), -1) from api_endpoint where group_id = ?",
                Integer.class,
                groupId);
        return maxSort == null ? 0 : maxSort + 1;
    }

    private int nextRevisionNo(Long endpointId) {
        Integer maxRevision = jdbcTemplate.queryForObject(
                "select coalesce(max(revision_no), 0) from api_version where endpoint_id = ?",
                Integer.class,
                endpointId);
        return maxRevision == null ? 1 : maxRevision + 1;
    }

    private long requireGeneratedId(GeneratedKeyHolder keyHolder) {
        Number key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("Failed to generate primary key");
        }
        return key.longValue();
    }

    private String routeKey(String method, String path) {
        return method.toUpperCase() + ":" + path;
    }

    public record EndpointReference(Long id, Long groupId) {
    }
}
