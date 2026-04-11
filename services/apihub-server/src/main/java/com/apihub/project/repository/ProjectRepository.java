package com.apihub.project.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.apihub.project.model.ProjectDtos.CreateGroupRequest;
import com.apihub.project.model.ProjectDtos.CreateModuleRequest;
import com.apihub.project.model.ProjectDtos.CreateProjectRequest;
import com.apihub.project.model.ProjectDtos.CreateEnvironmentRequest;
import com.apihub.project.model.ProjectDtos.DebugTargetRuleEntry;
import com.apihub.project.model.ProjectDtos.EnvironmentEntry;
import com.apihub.project.model.ProjectDtos.EnvironmentDetail;
import com.apihub.project.model.ProjectDtos.GroupDetail;
import com.apihub.project.model.ProjectDtos.ModuleDetail;
import com.apihub.project.model.ProjectDtos.ProjectDetail;
import com.apihub.project.model.ProjectDtos.UpdateEnvironmentRequest;
import com.apihub.project.model.ProjectDtos.UpdateGroupRequest;
import com.apihub.project.model.ProjectDtos.UpdateModuleRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Optional;

@Repository
public class ProjectRepository {

    private static final long DEFAULT_SPACE_ID = 1L;
    private static final long DEFAULT_USER_ID = 1L;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private static final RowMapper<ProjectDetail> PROJECT_ROW_MAPPER = (rs, rowNum) -> new ProjectDetail(
            rs.getLong("id"),
            rs.getString("name"),
            rs.getString("project_key"),
            rs.getString("description"),
            deserializeDebugRules(rs.getString("debug_allowed_hosts_json")));

    private static final RowMapper<ProjectDetail> PROJECT_ACCESS_ROW_MAPPER = (rs, rowNum) -> new ProjectDetail(
            rs.getLong("id"),
            rs.getString("name"),
            rs.getString("project_key"),
            rs.getString("description"),
            deserializeDebugRules(rs.getString("debug_allowed_hosts_json")),
            rs.getString("current_user_role"),
            rs.getBoolean("can_write"));

    private static final RowMapper<ModuleDetail> MODULE_ROW_MAPPER = (rs, rowNum) -> new ModuleDetail(
            rs.getLong("id"),
            rs.getLong("project_id"),
            rs.getString("name"));

    private static final RowMapper<GroupDetail> GROUP_ROW_MAPPER = (rs, rowNum) -> new GroupDetail(
            rs.getLong("id"),
            rs.getLong("module_id"),
            rs.getString("name"));

    private static final RowMapper<EnvironmentDetail> ENVIRONMENT_ROW_MAPPER = (rs, rowNum) -> new EnvironmentDetail(
            rs.getLong("id"),
            rs.getLong("project_id"),
            rs.getString("name"),
            rs.getString("base_url"),
            rs.getBoolean("is_default"),
            deserializeEntries(rs.getString("variables_json")),
            deserializeEntries(rs.getString("default_headers_json")),
            deserializeEntries(rs.getString("default_query_json")),
            rs.getString("auth_mode"),
            rs.getString("auth_key"),
            rs.getString("auth_value"),
            rs.getString("debug_host_mode"),
            deserializeDebugRules(rs.getString("debug_allowed_hosts_json")));

    private final JdbcTemplate jdbcTemplate;
    public ProjectRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<ProjectDetail> listProjects() {
        return listProjects(DEFAULT_USER_ID);
    }

    public List<ProjectDetail> listProjects(Long userId) {
        return jdbcTemplate.query("""
                select distinct project.id,
                                project.name,
                                project.project_key,
                                project.description,
                                project.debug_allowed_hosts_json,
                                case
                                    when project.owner_id = ? then 'project_admin'
                                    else project_member.role_code
                                end as current_user_role,
                                case
                                    when project.owner_id = ? then true
                                    when project_member.role_code in ('project_admin', 'editor') then true
                                    else false
                                end as can_write
                from project
                left join project_member
                  on project_member.project_id = project.id
                 and project_member.user_id = ?
                 and project_member.member_status = 'active'
                where project.owner_id = ?
                   or project_member.id is not null
                order by project.id
                """, PROJECT_ACCESS_ROW_MAPPER, userId, userId, userId, userId);
    }

    public Optional<ProjectDetail> findProject(Long userId, Long projectId) {
        return jdbcTemplate.query("""
                select project.id,
                       project.name,
                       project.project_key,
                       project.description,
                       project.debug_allowed_hosts_json,
                       case
                           when project.owner_id = ? then 'project_admin'
                           else project_member.role_code
                       end as current_user_role,
                       case
                           when project.owner_id = ? then true
                           when project_member.role_code in ('project_admin', 'editor') then true
                           else false
                       end as can_write
                from project
                left join project_member
                  on project_member.project_id = project.id
                 and project_member.user_id = ?
                 and project_member.member_status = 'active'
                where project.id = ?
                  and (project.owner_id = ? or project_member.id is not null)
                """, PROJECT_ACCESS_ROW_MAPPER, userId, userId, userId, projectId, userId).stream().findFirst();
    }

    public Optional<ProjectDetail> findProject(Long projectId) {
        return jdbcTemplate.query("""
                select id, name, project_key, description, debug_allowed_hosts_json
                from project
                where id = ?
                """, PROJECT_ROW_MAPPER, projectId).stream().findFirst();
    }

    public boolean canAccessProject(Long userId, Long projectId) {
        Integer matched = jdbcTemplate.queryForObject("""
                select count(*)
                from project
                left join project_member
                  on project_member.project_id = project.id
                 and project_member.user_id = ?
                 and project_member.member_status = 'active'
                where project.id = ?
                  and (project.owner_id = ? or project_member.id is not null)
                """, Integer.class, userId, projectId, userId);
        return matched != null && matched > 0;
    }

    public boolean canWriteProject(Long userId, Long projectId) {
        Integer matched = jdbcTemplate.queryForObject("""
                select count(*)
                from project
                left join project_member
                  on project_member.project_id = project.id
                 and project_member.user_id = ?
                 and project_member.member_status = 'active'
                where project.id = ?
                  and (
                        project.owner_id = ?
                     or project_member.role_code in ('project_admin', 'editor')
                  )
                """, Integer.class, userId, projectId, userId);
        return matched != null && matched > 0;
    }

    public ProjectDetail createProject(CreateProjectRequest request) {
        return createProject(DEFAULT_USER_ID, request);
    }

    public ProjectDetail createProject(Long userId, CreateProjectRequest request) {
        GeneratedKeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    insert into project (space_id, name, project_key, description, owner_id, status, debug_allowed_hosts_json)
                    values (?, ?, ?, ?, ?, 'active', ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, DEFAULT_SPACE_ID);
            statement.setString(2, request.name());
            statement.setString(3, request.projectKey());
            statement.setString(4, request.description());
            statement.setLong(5, userId);
            statement.setString(6, serializeDebugRules(request.debugAllowedHosts()));
            return statement;
        }, keyHolder);
        long projectId = requireGeneratedId(keyHolder);
        jdbcTemplate.update("""
                insert into project_member (project_id, user_id, role_code, member_status)
                values (?, ?, 'project_admin', 'active')
                """, projectId, userId);
        return findProject(userId, projectId).orElseThrow();
    }

    public ProjectDetail updateProject(Long projectId, String name, String description, List<DebugTargetRuleEntry> debugAllowedHosts) {
        return updateProject(DEFAULT_USER_ID, projectId, name, description, debugAllowedHosts);
    }

    public ProjectDetail updateProject(Long userId, Long projectId, String name, String description, List<DebugTargetRuleEntry> debugAllowedHosts) {
        jdbcTemplate.update("""
                update project
                set name = ?, description = ?, debug_allowed_hosts_json = ?
                where id = ?
                """, name, description, serializeDebugRules(debugAllowedHosts), projectId);
        return findProject(userId, projectId).orElseThrow();
    }

    public List<ModuleDetail> listModules(Long projectId) {
        return jdbcTemplate.query("""
                select id, project_id, name
                from module
                where project_id = ?
                order by sort_order, id
                """, MODULE_ROW_MAPPER, projectId);
    }

    public Optional<ModuleReference> findModuleReference(Long moduleId) {
        return jdbcTemplate.query("""
                select id, project_id
                from module
                where id = ?
                """, (rs, rowNum) -> new ModuleReference(
                rs.getLong("id"),
                rs.getLong("project_id")), moduleId).stream().findFirst();
    }

    public ModuleDetail createModule(Long projectId, CreateModuleRequest request) {
        return createModule(DEFAULT_USER_ID, projectId, request);
    }

    public ModuleDetail createModule(Long userId, Long projectId, CreateModuleRequest request) {
        String moduleKey = nextModuleKey(projectId, request.name());
        int sortOrder = nextSortOrder("module", "project_id", projectId);
        GeneratedKeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    insert into module (project_id, name, module_key, sort_order, created_by)
                    values (?, ?, ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, projectId);
            statement.setString(2, request.name());
            statement.setString(3, moduleKey);
            statement.setInt(4, sortOrder);
            statement.setLong(5, userId);
            return statement;
        }, keyHolder);
        return findModule(requireGeneratedId(keyHolder)).orElseThrow();
    }

    public Optional<ModuleDetail> findModule(Long moduleId) {
        return jdbcTemplate.query("""
                select id, project_id, name
                from module
                where id = ?
                """, MODULE_ROW_MAPPER, moduleId).stream().findFirst();
    }

    public ModuleDetail updateModule(Long moduleId, UpdateModuleRequest request) {
        jdbcTemplate.update("""
                update module
                set name = ?
                where id = ?
                """, request.name(), moduleId);
        return findModule(moduleId).orElseThrow();
    }

    public void deleteModule(Long moduleId) {
        jdbcTemplate.update("delete from module where id = ?", moduleId);
    }

    public List<GroupDetail> listGroups(Long moduleId) {
        return jdbcTemplate.query("""
                select id, module_id, name
                from api_group
                where module_id = ?
                order by sort_order, id
                """, GROUP_ROW_MAPPER, moduleId);
    }

    public Optional<GroupReference> findGroupReference(Long groupId) {
        return jdbcTemplate.query("""
                select g.id, g.module_id, m.project_id
                from api_group g
                join module m on m.id = g.module_id
                where g.id = ?
                """, (rs, rowNum) -> new GroupReference(
                rs.getLong("id"),
                rs.getLong("module_id"),
                rs.getLong("project_id")), groupId).stream().findFirst();
    }

    public GroupDetail createGroup(Long moduleId, CreateGroupRequest request) {
        return createGroup(DEFAULT_USER_ID, moduleId, request);
    }

    public GroupDetail createGroup(Long userId, Long moduleId, CreateGroupRequest request) {
        String groupKey = nextGroupKey(moduleId, request.name());
        int sortOrder = nextSortOrder("api_group", "module_id", moduleId);
        GeneratedKeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    insert into api_group (module_id, name, group_key, sort_order, created_by)
                    values (?, ?, ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, moduleId);
            statement.setString(2, request.name());
            statement.setString(3, groupKey);
            statement.setInt(4, sortOrder);
            statement.setLong(5, userId);
            return statement;
        }, keyHolder);
        return findGroup(requireGeneratedId(keyHolder)).orElseThrow();
    }

    public Optional<GroupDetail> findGroup(Long groupId) {
        return jdbcTemplate.query("""
                select id, module_id, name
                from api_group
                where id = ?
                """, GROUP_ROW_MAPPER, groupId).stream().findFirst();
    }

    public GroupDetail updateGroup(Long groupId, UpdateGroupRequest request) {
        jdbcTemplate.update("""
                update api_group
                set name = ?
                where id = ?
                """, request.name(), groupId);
        return findGroup(groupId).orElseThrow();
    }

    public void deleteGroup(Long groupId) {
        jdbcTemplate.update("delete from api_group where id = ?", groupId);
    }

    public List<EnvironmentDetail> listEnvironments(Long projectId) {
        return jdbcTemplate.query("""
                select id, project_id, name, base_url, is_default, variables_json, default_headers_json
                     , default_query_json, auth_mode, auth_key, auth_value, debug_host_mode, debug_allowed_hosts_json
                from environment
                where project_id = ?
                order by is_default desc, id
                """, ENVIRONMENT_ROW_MAPPER, projectId);
    }

    public Optional<EnvironmentDetail> findEnvironment(Long environmentId) {
        return jdbcTemplate.query("""
                select id, project_id, name, base_url, is_default, variables_json, default_headers_json
                     , default_query_json, auth_mode, auth_key, auth_value, debug_host_mode, debug_allowed_hosts_json
                from environment
                where id = ?
                """, ENVIRONMENT_ROW_MAPPER, environmentId).stream().findFirst();
    }

    public EnvironmentDetail createEnvironment(Long projectId, CreateEnvironmentRequest request) {
        return createEnvironment(DEFAULT_USER_ID, projectId, request);
    }

    public EnvironmentDetail createEnvironment(Long userId, Long projectId, CreateEnvironmentRequest request) {
        if (Boolean.TRUE.equals(request.isDefault())) {
            clearDefaultEnvironment(projectId);
        }

        GeneratedKeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    insert into environment (project_id, name, base_url, is_default, variables_json, default_headers_json, default_query_json, auth_mode, auth_key, auth_value, debug_host_mode, debug_allowed_hosts_json, created_by)
                    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, projectId);
            statement.setString(2, request.name());
            statement.setString(3, request.baseUrl());
            statement.setBoolean(4, Boolean.TRUE.equals(request.isDefault()));
            statement.setString(5, serializeEntries(request.variables()));
            statement.setString(6, serializeEntries(request.defaultHeaders()));
            statement.setString(7, serializeEntries(request.defaultQuery()));
            statement.setString(8, normalizeAuthMode(request.authMode()));
            statement.setString(9, normalizeNullableString(request.authKey()));
            statement.setString(10, normalizeNullableString(request.authValue()));
            statement.setString(11, normalizeDebugHostMode(request.debugHostMode()));
            statement.setString(12, serializeDebugRules(request.debugAllowedHosts()));
            statement.setLong(13, userId);
            return statement;
        }, keyHolder);
        return findEnvironment(requireGeneratedId(keyHolder)).orElseThrow();
    }

    public EnvironmentDetail updateEnvironment(Long environmentId, UpdateEnvironmentRequest request) {
        Long projectId = findEnvironment(environmentId).map(EnvironmentDetail::projectId).orElseThrow();
        if (Boolean.TRUE.equals(request.isDefault())) {
            clearDefaultEnvironment(projectId);
        }

        jdbcTemplate.update("""
                update environment
                set name = ?, base_url = ?, is_default = ?, variables_json = ?, default_headers_json = ?, default_query_json = ?, auth_mode = ?, auth_key = ?, auth_value = ?, debug_host_mode = ?, debug_allowed_hosts_json = ?
                where id = ?
                """,
                request.name(),
                request.baseUrl(),
                Boolean.TRUE.equals(request.isDefault()),
                serializeEntries(request.variables()),
                serializeEntries(request.defaultHeaders()),
                serializeEntries(request.defaultQuery()),
                normalizeAuthMode(request.authMode()),
                normalizeNullableString(request.authKey()),
                normalizeNullableString(request.authValue()),
                normalizeDebugHostMode(request.debugHostMode()),
                serializeDebugRules(request.debugAllowedHosts()),
                environmentId);
        return findEnvironment(environmentId).orElseThrow();
    }

    public void deleteEnvironment(Long environmentId) {
        jdbcTemplate.update("delete from environment where id = ?", environmentId);
    }

    private String nextModuleKey(Long projectId, String name) {
        return slugify(name) + "-" + (nextSortOrder("module", "project_id", projectId) + 1);
    }

    private String nextGroupKey(Long moduleId, String name) {
        return slugify(name) + "-" + (nextSortOrder("api_group", "module_id", moduleId) + 1);
    }

    private int nextSortOrder(String tableName, String foreignKeyColumn, Long foreignKeyValue) {
        Integer maxSort = jdbcTemplate.queryForObject(
                "select coalesce(max(sort_order), -1) from " + tableName + " where " + foreignKeyColumn + " = ?",
                Integer.class,
                foreignKeyValue);
        return maxSort == null ? 0 : maxSort + 1;
    }

    private void clearDefaultEnvironment(Long projectId) {
        jdbcTemplate.update("""
                update environment
                set is_default = false
                where project_id = ?
                """, projectId);
    }

    private long requireGeneratedId(GeneratedKeyHolder keyHolder) {
        Number key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("Failed to generate primary key");
        }
        return key.longValue();
    }

    private String slugify(String value) {
        String slug = value == null ? "" : value.trim().toLowerCase().replaceAll("[^a-z0-9]+", "-");
        slug = slug.replaceAll("(^-+|-+$)", "");
        return slug.isBlank() ? "item" : slug;
    }

    private static List<EnvironmentEntry> deserializeEntries(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }

        try {
            return OBJECT_MAPPER.readValue(json, new TypeReference<List<EnvironmentEntry>>() {
            });
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to parse environment JSON", exception);
        }
    }

    private static List<DebugTargetRuleEntry> deserializeDebugRules(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }

        try {
            return OBJECT_MAPPER.readValue(json, new TypeReference<List<DebugTargetRuleEntry>>() {
            });
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to parse debug target rule JSON", exception);
        }
    }

    private String serializeEntries(List<EnvironmentEntry> entries) {
        try {
            return OBJECT_MAPPER.writeValueAsString(entries == null ? List.of() : entries);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize environment JSON", exception);
        }
    }

    private String serializeDebugRules(List<DebugTargetRuleEntry> rules) {
        try {
            return OBJECT_MAPPER.writeValueAsString(rules == null ? List.of() : rules);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize debug target rule JSON", exception);
        }
    }

    private String normalizeAuthMode(String value) {
        if (value == null || value.isBlank()) {
            return "none";
        }
        return value.trim().toLowerCase();
    }

    private String normalizeNullableString(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.trim();
    }

    private String normalizeDebugHostMode(String value) {
        if (value == null || value.isBlank()) {
            return "inherit";
        }
        return value.trim().toLowerCase();
    }

    public record ModuleReference(Long id, Long projectId) {
    }

    public record GroupReference(Long id, Long moduleId, Long projectId) {
    }
}
