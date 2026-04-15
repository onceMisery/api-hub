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
import com.apihub.mock.model.MockDtos.MockBodyConditionEntry;
import com.apihub.mock.model.MockDtos.MockConditionEntry;
import com.apihub.mock.model.MockDtos.MockReleaseDetail;
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
import java.util.Map;
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
    private static final TypeReference<List<MockBodyConditionEntry>> MOCK_BODY_CONDITION_LIST = new TypeReference<>() {
    };

    private static final RowMapper<EndpointDetail> ENDPOINT_ROW_MAPPER = (rs, rowNum) -> new EndpointDetail(
            rs.getLong("id"),
            rs.getLong("group_id"),
            rs.getString("name"),
            rs.getString("http_method"),
            rs.getString("path"),
            rs.getString("description"),
            rs.getBoolean("mock_enabled"),
            rs.getString("created_by_display_name"),
            rs.getString("updated_by_display_name"),
            rs.getString("status"),
            rs.getObject("released_version_id", Long.class),
            rs.getString("released_version_label"),
            rs.getTimestamp("released_at") == null ? null : rs.getTimestamp("released_at").toInstant());

    private static final RowMapper<VersionDetail> VERSION_ROW_MAPPER = (rs, rowNum) -> new VersionDetail(
            rs.getLong("id"),
            rs.getLong("endpoint_id"),
            rs.getString("version_label"),
            rs.getString("change_summary"),
            rs.getString("snapshot_json"),
            rs.getBoolean("released"),
            rs.getTimestamp("released_at") == null ? null : rs.getTimestamp("released_at").toInstant());

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
            parseBodyConditionEntries(rs.getString("body_conditions_json")),
            rs.getInt("status_code"),
            rs.getString("media_type"),
            rs.getString("body_json"),
            rs.getInt("delay_ms"),
            rs.getString("template_mode"));
    private static final RowMapper<MockReleaseDetail> MOCK_RELEASE_ROW_MAPPER = (rs, rowNum) -> new MockReleaseDetail(
            rs.getLong("id"),
            rs.getLong("endpoint_id"),
            rs.getInt("release_no"),
            rs.getString("response_snapshot_json"),
            rs.getString("rules_snapshot_json"),
            rs.getTimestamp("created_at").toInstant());

    private final JdbcTemplate jdbcTemplate;

    public EndpointRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<EndpointDetail> listEndpoints(Long groupId) {
        return jdbcTemplate.query("""
                select endpoint.id,
                       endpoint.group_id,
                       endpoint.name,
                       endpoint.http_method,
                       endpoint.path,
                       endpoint.description,
                       endpoint.mock_enabled,
                       created_user.display_name as created_by_display_name,
                       updated_user.display_name as updated_by_display_name,
                       endpoint.status,
                       endpoint.released_version_id,
                       case
                           when released_version.id is null then null
                           else coalesce(released_version.version_label, concat('r', released_version.revision_no))
                       end as released_version_label,
                       endpoint.released_at
                from api_endpoint endpoint
                left join sys_user created_user on created_user.id = endpoint.created_by
                left join sys_user updated_user on updated_user.id = endpoint.updated_by
                left join api_version released_version on released_version.id = endpoint.released_version_id
                where endpoint.group_id = ?
                order by endpoint.sort_order, endpoint.id
                """, ENDPOINT_ROW_MAPPER, groupId);
    }

    public EndpointDetail createEndpoint(GroupReference groupReference, CreateEndpointRequest request) {
        return createEndpoint(DEFAULT_USER_ID, groupReference, request);
    }

    public EndpointDetail createEndpoint(Long userId, GroupReference groupReference, CreateEndpointRequest request) {
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
            statement.setLong(11, userId);
            statement.setLong(12, userId);
            return statement;
        }, keyHolder);
        return findEndpoint(requireGeneratedId(keyHolder)).orElseThrow();
    }

    public Optional<EndpointDetail> findEndpoint(Long endpointId) {
        return jdbcTemplate.query("""
                select endpoint.id,
                       endpoint.group_id,
                       endpoint.name,
                       endpoint.http_method,
                       endpoint.path,
                       endpoint.description,
                       endpoint.mock_enabled,
                       created_user.display_name as created_by_display_name,
                       updated_user.display_name as updated_by_display_name,
                       endpoint.status,
                       endpoint.released_version_id,
                       case
                           when released_version.id is null then null
                           else coalesce(released_version.version_label, concat('r', released_version.revision_no))
                       end as released_version_label,
                       endpoint.released_at
                from api_endpoint endpoint
                left join sys_user created_user on created_user.id = endpoint.created_by
                left join sys_user updated_user on updated_user.id = endpoint.updated_by
                left join api_version released_version on released_version.id = endpoint.released_version_id
                where endpoint.id = ?
                """, ENDPOINT_ROW_MAPPER, endpointId).stream().findFirst();
    }

    public Optional<EndpointReference> findEndpointReference(Long endpointId) {
        return jdbcTemplate.query("""
                select id, group_id, module_id, project_id
                from api_endpoint
                where id = ?
                """, (rs, rowNum) -> new EndpointReference(
                rs.getLong("id"),
                rs.getLong("group_id"),
                rs.getLong("module_id"),
                rs.getLong("project_id")), endpointId).stream().findFirst();
    }

    public Optional<EndpointDetail> findEndpointByProjectAndRouteKey(Long projectId, String routeKey) {
        return jdbcTemplate.query("""
                select endpoint.id,
                       endpoint.group_id,
                       endpoint.name,
                       endpoint.http_method,
                       endpoint.path,
                       endpoint.description,
                       endpoint.mock_enabled,
                       created_user.display_name as created_by_display_name,
                       updated_user.display_name as updated_by_display_name,
                       endpoint.status,
                       endpoint.released_version_id,
                       case
                           when released_version.id is null then null
                           else coalesce(released_version.version_label, concat('r', released_version.revision_no))
                       end as released_version_label,
                       endpoint.released_at
                from api_endpoint endpoint
                left join sys_user created_user on created_user.id = endpoint.created_by
                left join sys_user updated_user on updated_user.id = endpoint.updated_by
                left join api_version released_version on released_version.id = endpoint.released_version_id
                where endpoint.project_id = ?
                  and endpoint.route_key = ?
                limit 1
                """, ENDPOINT_ROW_MAPPER, projectId, routeKey).stream().findFirst();
    }

    public EndpointDetail updateEndpoint(Long endpointId, UpdateEndpointRequest request) {
        return updateEndpoint(DEFAULT_USER_ID, endpointId, request);
    }

    public EndpointDetail updateEndpoint(Long userId, Long endpointId, UpdateEndpointRequest request) {
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
                userId,
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
                select endpoint.id,
                       endpoint.group_id,
                       endpoint.name,
                       endpoint.http_method,
                       endpoint.path,
                       endpoint.description,
                       endpoint.mock_enabled,
                       created_user.display_name as created_by_display_name,
                       updated_user.display_name as updated_by_display_name,
                       endpoint.status,
                       endpoint.released_version_id,
                       case
                           when released_version.id is null then null
                           else coalesce(released_version.version_label, concat('r', released_version.revision_no))
                       end as released_version_label,
                       endpoint.released_at
                from api_endpoint endpoint
                left join sys_user created_user on created_user.id = endpoint.created_by
                left join sys_user updated_user on updated_user.id = endpoint.updated_by
                left join api_version released_version on released_version.id = endpoint.released_version_id
                where endpoint.project_id = ? and endpoint.http_method = ? and endpoint.mock_enabled = true
                order by endpoint.path, endpoint.id
                """, ENDPOINT_ROW_MAPPER, projectId, method.toUpperCase());
    }

    public List<ProjectMockCenterCandidate> listProjectMockCenterCandidates(Long projectId) {
        return jdbcTemplate.query("""
                select endpoint.id,
                       endpoint.name,
                       endpoint.http_method,
                       endpoint.path,
                       endpoint.mock_enabled,
                       module.name as module_name,
                       coalesce(api_group.name, '') as group_name
                from api_endpoint endpoint
                join module on module.id = endpoint.module_id
                left join api_group on api_group.id = endpoint.group_id
                where endpoint.project_id = ?
                order by module.sort_order, module.id, api_group.sort_order, api_group.id, endpoint.sort_order, endpoint.id
                """, (rs, rowNum) -> new ProjectMockCenterCandidate(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getString("http_method"),
                rs.getString("path"),
                rs.getString("module_name"),
                rs.getString("group_name"),
                rs.getBoolean("mock_enabled")), projectId);
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
                       body_conditions_json,
                       status_code,
                       media_type,
                       body_json,
                       delay_ms,
                       template_mode
                from mock_rule
                where endpoint_id = ?
                order by priority desc, id
                """, MOCK_RULE_ROW_MAPPER, endpointId);
    }

    public void replaceMockRules(Long endpointId, List<MockRuleUpsertItem> items) {
        replaceMockRules(DEFAULT_USER_ID, endpointId, items);
    }

    public void replaceMockRules(Long userId, Long endpointId, List<MockRuleUpsertItem> items) {
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
                        body_conditions_json,
                        status_code,
                        media_type,
                        body_json,
                        delay_ms,
                        template_mode,
                        created_by,
                        updated_by
                    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    endpointId,
                    item.ruleName(),
                    item.priority(),
                    item.enabled(),
                    writeConditionEntries(item.queryConditions()),
                    writeConditionEntries(item.headerConditions()),
                    writeBodyConditionEntries(item.bodyConditions()),
                    item.statusCode(),
                    item.mediaType(),
                    item.body(),
                    Math.max(item.delayMs(), 0),
                    normalizeTemplateMode(item.templateMode()),
                    userId,
                    userId);
        }
    }

    public List<MockReleaseDetail> listMockReleases(Long endpointId) {
        return jdbcTemplate.query("""
                select id,
                       endpoint_id,
                       release_no,
                       response_snapshot_json,
                       rules_snapshot_json,
                       created_at
                from mock_release
                where endpoint_id = ?
                order by release_no desc, id desc
                """, MOCK_RELEASE_ROW_MAPPER, endpointId);
    }

    public Optional<MockReleaseDetail> findLatestMockRelease(Long endpointId) {
        return jdbcTemplate.query("""
                select id,
                       endpoint_id,
                       release_no,
                       response_snapshot_json,
                       rules_snapshot_json,
                       created_at
                from mock_release
                where endpoint_id = ?
                order by release_no desc, id desc
                limit 1
                """, MOCK_RELEASE_ROW_MAPPER, endpointId).stream().findFirst();
    }

    public MockReleaseDetail createMockRelease(Long endpointId, String responseSnapshotJson, String rulesSnapshotJson) {
        return createMockRelease(DEFAULT_USER_ID, endpointId, responseSnapshotJson, rulesSnapshotJson);
    }

    public MockReleaseDetail createMockRelease(Long userId, Long endpointId, String responseSnapshotJson, String rulesSnapshotJson) {
        GeneratedKeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    insert into mock_release (
                        endpoint_id,
                        release_no,
                        response_snapshot_json,
                        rules_snapshot_json,
                        created_by
                    ) values (?, ?, ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, endpointId);
            statement.setInt(2, nextMockReleaseNo(endpointId));
            statement.setString(3, responseSnapshotJson);
            statement.setString(4, rulesSnapshotJson);
            statement.setLong(5, userId);
            return statement;
        }, keyHolder);
        return findMockRelease(requireGeneratedId(keyHolder)).orElseThrow();
    }

    public List<VersionDetail> listVersions(Long endpointId) {
        return jdbcTemplate.query("""
                select version.id,
                       version.endpoint_id,
                       coalesce(version.version_label, concat('r', version.revision_no)) as version_label,
                       version.change_summary,
                       version.snapshot_json,
                       case when endpoint.released_version_id = version.id then true else false end as released,
                       case when endpoint.released_version_id = version.id then endpoint.released_at else null end as released_at
                from api_version version
                join api_endpoint endpoint on endpoint.id = version.endpoint_id
                where version.endpoint_id = ?
                order by version.revision_no, version.id
                """, VERSION_ROW_MAPPER, endpointId);
    }

    public VersionDetail createVersion(Long endpointId, CreateVersionRequest request) {
        return createVersion(DEFAULT_USER_ID, endpointId, request);
    }

    public VersionDetail createVersion(Long userId, Long endpointId, CreateVersionRequest request) {
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
            statement.setLong(6, userId);
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
                select version.id,
                       version.endpoint_id,
                       coalesce(version.version_label, concat('r', version.revision_no)) as version_label,
                       version.change_summary,
                       version.snapshot_json,
                       case when endpoint.released_version_id = version.id then true else false end as released,
                       case when endpoint.released_version_id = version.id then endpoint.released_at else null end as released_at
                from api_version version
                join api_endpoint endpoint on endpoint.id = version.endpoint_id
                where version.id = ?
                """, VERSION_ROW_MAPPER, versionId).stream().findFirst();
    }

    public EndpointDetail releaseVersion(Long endpointId, Long versionId) {
        return releaseVersion(DEFAULT_USER_ID, endpointId, versionId);
    }

    public EndpointDetail releaseVersion(Long userId, Long endpointId, Long versionId) {
        jdbcTemplate.update("""
                update api_endpoint
                set status = 'released',
                    released_version_id = ?,
                    released_at = current_timestamp,
                    updated_by = ?
                where id = ?
                """,
                versionId,
                userId,
                endpointId);
        return findEndpoint(endpointId).orElseThrow();
    }

    public EndpointDetail updateEndpointLocation(Long userId, Long endpointId, Long moduleId, Long groupId) {
        jdbcTemplate.update("""
                update api_endpoint
                set module_id = ?,
                    group_id = ?,
                    updated_by = ?
                where id = ?
                """,
                moduleId,
                groupId,
                userId,
                endpointId);
        return findEndpoint(endpointId).orElseThrow();
    }

    public EndpointDetail clearReleasedVersion(Long endpointId) {
        return clearReleasedVersion(DEFAULT_USER_ID, endpointId);
    }

    public EndpointDetail clearReleasedVersion(Long userId, Long endpointId) {
        jdbcTemplate.update("""
                update api_endpoint
                set status = 'draft',
                    released_version_id = null,
                    released_at = null,
                    updated_by = ?
                where id = ?
                """,
                userId,
                endpointId);
        return findEndpoint(endpointId).orElseThrow();
    }

    private Optional<MockReleaseDetail> findMockRelease(Long releaseId) {
        return jdbcTemplate.query("""
                select id,
                       endpoint_id,
                       release_no,
                       response_snapshot_json,
                       rules_snapshot_json,
                       created_at
                from mock_release
                where id = ?
                """, MOCK_RELEASE_ROW_MAPPER, releaseId).stream().findFirst();
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

    private int nextMockReleaseNo(Long endpointId) {
        Integer maxRelease = jdbcTemplate.queryForObject(
                "select coalesce(max(release_no), 0) from mock_release where endpoint_id = ?",
                Integer.class,
                endpointId);
        return maxRelease == null ? 1 : maxRelease + 1;
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

    private String routeKey(String method, String path) {
        return method.toUpperCase() + ":" + path;
    }

    public record EndpointReference(Long id, Long groupId, Long moduleId, Long projectId) {
        public EndpointReference(Long id, Long groupId, Long projectId) {
            this(id, groupId, null, projectId);
        }
    }

    public record ProjectMockCenterCandidate(
            Long endpointId,
            String endpointName,
            String method,
            String path,
            String moduleName,
            String groupName,
            boolean mockEnabled
    ) {
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

    private static List<MockBodyConditionEntry> parseBodyConditionEntries(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return List.of();
        }

        try {
            return OBJECT_MAPPER.readValue(rawJson, MOCK_BODY_CONDITION_LIST);
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

    private String writeBodyConditionEntries(List<MockBodyConditionEntry> entries) {
        try {
            return OBJECT_MAPPER.writeValueAsString(entries == null ? Collections.emptyList() : entries);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize mock body conditions", exception);
        }
    }

    private String normalizeTemplateMode(String templateMode) {
        return templateMode == null || templateMode.isBlank() ? "plain" : templateMode.trim().toLowerCase(java.util.Locale.ROOT);
    }
}
