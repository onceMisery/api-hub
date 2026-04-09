package com.apihub.doc.repository;

import com.apihub.doc.model.DocDtos.CreateEndpointRequest;
import com.apihub.doc.model.DocDtos.CreateVersionRequest;
import com.apihub.doc.model.DocDtos.ParameterUpsertItem;
import com.apihub.doc.model.DocDtos.ResponseUpsertItem;
import com.apihub.doc.model.DocDtos.UpdateEndpointRequest;
import com.apihub.doc.model.EndpointDetail;
import com.apihub.doc.model.ParameterDetail;
import com.apihub.doc.model.ResponseDetail;
import com.apihub.doc.model.VersionDetail;
import com.apihub.mock.model.MockDtos.MockConditionEntry;
import com.apihub.mock.model.MockDtos.MockRuleDetail;
import com.apihub.mock.model.MockDtos.MockRuleUpsertItem;
import com.apihub.project.repository.ProjectRepository.GroupReference;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.Comparator;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Repository
public class EndpointRepository {

    private static final long DEFAULT_USER_ID = 1L;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final TypeReference<List<MockConditionEntry>> MOCK_CONDITION_LIST = new TypeReference<>() {
    };

    private static final RowMapper<EndpointDetail> ENDPOINT_ROW_MAPPER = (rs, rowNum) -> new EndpointDetail(
            rs.getLong("id"),
            rs.getLong("group_id"),
            rs.getString("name"),
            rs.getString("http_method"),
            rs.getString("path"),
            rs.getString("description"),
            rs.getBoolean("mock_enabled"));

    private static final RowMapper<VersionDetail> VERSION_ROW_MAPPER = (rs, rowNum) -> new VersionDetail(
            rs.getLong("id"),
            rs.getLong("endpoint_id"),
            rs.getString("version_label"),
            rs.getString("change_summary"),
            rs.getString("snapshot_json"));

    private static final RowMapper<ParameterDetail> PARAMETER_ROW_MAPPER = (rs, rowNum) -> new ParameterDetail(
            rs.getLong("id"),
            rs.getString("section_type"),
            rs.getString("name"),
            rs.getString("data_type"),
            rs.getBoolean("required"),
            rs.getString("description"),
            rs.getString("example_value"),
            rs.getInt("sort_order"));

    private static final RowMapper<ResponseDetail> RESPONSE_ROW_MAPPER = (rs, rowNum) -> new ResponseDetail(
            rs.getLong("id"),
            rs.getInt("http_status_code"),
            rs.getString("media_type"),
            rs.getString("name"),
            rs.getString("data_type"),
            rs.getBoolean("required"),
            rs.getString("description"),
            rs.getString("example_value"),
            rs.getInt("sort_order"));
    private static final RowMapper<MockRuleDetail> MOCK_RULE_ROW_MAPPER = (rs, rowNum) -> new MockRuleDetail(
            rs.getLong("id"),
            rs.getLong("endpoint_id"),
            rs.getString("rule_name"),
            rs.getInt("priority"),
            rs.getBoolean("enabled"),
            parseConditionEntries(rs.getString("query_conditions_json")),
            parseConditionEntries(rs.getString("header_conditions_json")),
            rs.getInt("status_code"),
            rs.getString("media_type"),
            rs.getString("body_json"));

    private final JdbcTemplate jdbcTemplate;

    public EndpointRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<EndpointDetail> listEndpoints(Long groupId) {
        return jdbcTemplate.query("""
                select id, group_id, name, http_method, path, description, mock_enabled
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
                        mock_enabled,
                        status,
                        sort_order,
                        created_by,
                        updated_by
                    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, groupReference.projectId());
            statement.setLong(2, groupReference.moduleId());
            statement.setLong(3, groupReference.id());
            statement.setString(4, request.name());
            statement.setString(5, request.description());
            statement.setString(6, routeKey(request.method(), request.path()));
            statement.setString(7, request.method());
            statement.setString(8, request.path());
            statement.setBoolean(9, Boolean.TRUE.equals(request.mockEnabled()));
            statement.setInt(10, nextEndpointSortOrder(groupReference.id()));
            statement.setLong(11, DEFAULT_USER_ID);
            statement.setLong(12, DEFAULT_USER_ID);
            return statement;
        }, keyHolder);
        return findEndpoint(requireGeneratedId(keyHolder)).orElseThrow();
    }

    public Optional<EndpointDetail> findEndpoint(Long endpointId) {
        return jdbcTemplate.query("""
                select id, group_id, name, http_method, path, description, mock_enabled
                from api_endpoint
                where id = ?
                """, ENDPOINT_ROW_MAPPER, endpointId).stream().findFirst();
    }

    public Optional<EndpointReference> findEndpointReference(Long endpointId) {
        return jdbcTemplate.query("""
                select id, group_id, project_id
                from api_endpoint
                where id = ?
                """, (rs, rowNum) -> new EndpointReference(
                rs.getLong("id"),
                rs.getLong("group_id"),
                rs.getLong("project_id")), endpointId).stream().findFirst();
    }

    public EndpointDetail updateEndpoint(Long endpointId, UpdateEndpointRequest request) {
        jdbcTemplate.update("""
                update api_endpoint
                set name = ?, description = ?, route_key = ?, http_method = ?, path = ?, mock_enabled = ?, updated_by = ?
                where id = ?
                """,
                request.name(),
                request.description(),
                routeKey(request.method(), request.path()),
                request.method(),
                request.path(),
                Boolean.TRUE.equals(request.mockEnabled()),
                DEFAULT_USER_ID,
                endpointId);
        return findEndpoint(endpointId).orElseThrow();
    }

    public void deleteEndpoint(Long endpointId) {
        jdbcTemplate.update("delete from api_endpoint where id = ?", endpointId);
    }

    public List<ParameterDetail> listParameters(Long endpointId) {
        return jdbcTemplate.query("""
                select id, section_type, name, data_type, required, description, example_value, sort_order
                from api_parameter
                where endpoint_id = ?
                order by sort_order, id
                """, PARAMETER_ROW_MAPPER, endpointId);
    }

    public void replaceParameters(Long endpointId, List<ParameterUpsertItem> items) {
        jdbcTemplate.update("delete from api_parameter where endpoint_id = ?", endpointId);

        for (int i = 0; i < items.size(); i++) {
            ParameterUpsertItem item = items.get(i);
            jdbcTemplate.update("""
                    insert into api_parameter (
                        endpoint_id,
                        parent_id,
                        section_type,
                        node_path,
                        name,
                        data_type,
                        required,
                        description,
                        example_value,
                        sort_order
                    ) values (?, null, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    endpointId,
                    item.sectionType(),
                    item.sectionType() + "-" + i,
                    item.name(),
                    item.dataType(),
                    item.required(),
                    item.description(),
                    item.exampleValue(),
                    i);
        }
    }

    public List<EndpointDetail> listMockEndpoints(Long projectId, String method) {
        return jdbcTemplate.query("""
                select id, group_id, name, http_method, path, description, mock_enabled
                from api_endpoint
                where project_id = ? and http_method = ? and mock_enabled = true
                order by path, id
                """, ENDPOINT_ROW_MAPPER, projectId, method.toUpperCase());
    }

    public List<ResponseDetail> listResponses(Long endpointId) {
        return jdbcTemplate.query("""
                select id, http_status_code, media_type, name, data_type, required, description, example_value, sort_order
                from api_response
                where endpoint_id = ?
                order by sort_order, id
                """, RESPONSE_ROW_MAPPER, endpointId);
    }

    public void replaceResponses(Long endpointId, List<ResponseUpsertItem> items) {
        jdbcTemplate.update("delete from api_response where endpoint_id = ?", endpointId);

        for (int i = 0; i < items.size(); i++) {
            ResponseUpsertItem item = items.get(i);
            jdbcTemplate.update("""
                    insert into api_response (
                        endpoint_id,
                        parent_id,
                        http_status_code,
                        media_type,
                        node_path,
                        name,
                        data_type,
                        required,
                        description,
                        example_value,
                        sort_order
                    ) values (?, null, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    endpointId,
                    item.httpStatusCode(),
                    item.mediaType(),
                    "response-" + item.httpStatusCode() + "-" + i,
                    item.name(),
                    item.dataType(),
                    item.required(),
                    item.description(),
                    item.exampleValue(),
                    i);
        }
    }

    public List<MockRuleDetail> listMockRules(Long endpointId) {
        return jdbcTemplate.query("""
                select id,
                       endpoint_id,
                       rule_name,
                       priority,
                       enabled,
                       query_conditions_json,
                       header_conditions_json,
                       status_code,
                       media_type,
                       body_json
                from mock_rule
                where endpoint_id = ?
                order by priority desc, id
                """, MOCK_RULE_ROW_MAPPER, endpointId);
    }

    public void replaceMockRules(Long endpointId, List<MockRuleUpsertItem> items) {
        jdbcTemplate.update("delete from mock_rule where endpoint_id = ?", endpointId);

        for (MockRuleUpsertItem item : items) {
            jdbcTemplate.update("""
                    insert into mock_rule (
                        endpoint_id,
                        rule_name,
                        priority,
                        enabled,
                        query_conditions_json,
                        header_conditions_json,
                        status_code,
                        media_type,
                        body_json,
                        created_by,
                        updated_by
                    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    endpointId,
                    item.ruleName(),
                    item.priority(),
                    item.enabled(),
                    writeConditionEntries(item.queryConditions()),
                    writeConditionEntries(item.headerConditions()),
                    item.statusCode(),
                    item.mediaType(),
                    item.body(),
                    DEFAULT_USER_ID,
                    DEFAULT_USER_ID);
        }
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

    public Optional<VersionDetail> findLatestVersion(Long endpointId) {
        return listVersions(endpointId).stream()
                .max(Comparator.comparingLong(VersionDetail::id));
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

    public record EndpointReference(Long id, Long groupId, Long projectId) {
    }

    private static List<MockConditionEntry> parseConditionEntries(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return List.of();
        }

        try {
            return OBJECT_MAPPER.readValue(rawJson, MOCK_CONDITION_LIST);
        } catch (JsonProcessingException exception) {
            return List.of();
        }
    }

    private String writeConditionEntries(List<MockConditionEntry> entries) {
        try {
            return OBJECT_MAPPER.writeValueAsString(entries == null ? Collections.emptyList() : entries);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize mock conditions", exception);
        }
    }
}
