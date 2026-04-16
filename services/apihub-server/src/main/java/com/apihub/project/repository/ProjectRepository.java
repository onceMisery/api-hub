package com.apihub.project.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.apihub.project.model.ProjectDtos.CreateGroupRequest;
import com.apihub.project.model.ProjectDtos.CreateModuleRequest;
import com.apihub.project.model.ProjectDtos.CreateProjectRequest;
import com.apihub.project.model.ProjectDtos.CreateSpaceRequest;
import com.apihub.project.model.ProjectDtos.CreateEnvironmentRequest;
import com.apihub.project.model.ProjectDtos.CreateErrorCodeRequest;
import com.apihub.project.model.ProjectDtos.CreateProjectWebhookRequest;
import com.apihub.project.model.ProjectDtos.DebugTargetRuleEntry;
import com.apihub.project.model.ProjectDtos.DictionaryGroupDetail;
import com.apihub.project.model.ProjectDtos.DictionaryItemDetail;
import com.apihub.project.model.ProjectDtos.EnvironmentEntry;
import com.apihub.project.model.ProjectDtos.EnvironmentDetail;
import com.apihub.project.model.ProjectDtos.ErrorCodeDetail;
import com.apihub.project.model.ProjectDtos.AuditLogDetail;
import com.apihub.project.model.ProjectDtos.GroupDetail;
import com.apihub.project.model.ProjectDtos.ModuleDetail;
import com.apihub.project.model.ProjectDtos.ModuleVersionTagEndpointSnapshot;
import com.apihub.project.model.ProjectDtos.ProjectDetail;
import com.apihub.project.model.ProjectDtos.ProjectDocPushSettings;
import com.apihub.project.model.ProjectDtos.ProjectMemberDetail;
import com.apihub.project.model.ProjectDtos.ProjectResourcePermissionDetail;
import com.apihub.project.model.ProjectDtos.ProjectWebhookDetail;
import com.apihub.project.model.ProjectDtos.SpaceSummary;
import com.apihub.project.model.ProjectDtos.UpsertProjectMemberRequest;
import com.apihub.project.model.ProjectDtos.UpsertProjectResourcePermissionRequest;
import com.apihub.project.model.ProjectDtos.UpdateEnvironmentRequest;
import com.apihub.project.model.ProjectDtos.UpdateErrorCodeRequest;
import com.apihub.project.model.ProjectDtos.UpdateGroupRequest;
import com.apihub.project.model.ProjectDtos.UpdateModuleRequest;
import com.apihub.project.model.ProjectDtos.UpdateDictionaryGroupRequest;
import com.apihub.project.model.ProjectDtos.UpdateDictionaryItemRequest;
import com.apihub.project.model.ProjectDtos.UpdateProjectWebhookRequest;
import com.apihub.project.model.ProjectDtos.WebhookDeliveryDetail;
import com.apihub.project.model.ProjectDtos.CreateDictionaryGroupRequest;
import com.apihub.project.model.ProjectDtos.CreateDictionaryItemRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class ProjectRepository {

    private static final long DEFAULT_SPACE_ID = 1L;
    private static final long DEFAULT_USER_ID = 1L;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private static final RowMapper<SpaceSummary> SPACE_ROW_MAPPER = (rs, rowNum) -> new SpaceSummary(
            rs.getLong("id"),
            rs.getString("name"),
            rs.getString("space_key"),
            rs.getString("current_user_role"),
            rs.getBoolean("can_create_project"),
            rs.getLong("project_count"));

    private static final RowMapper<ProjectDetail> PROJECT_ROW_MAPPER = (rs, rowNum) -> new ProjectDetail(
            rs.getLong("id"),
            rs.getLong("space_id"),
            rs.getString("space_name"),
            rs.getString("space_key"),
            rs.getString("name"),
            rs.getString("project_key"),
            rs.getString("description"),
            deserializeDebugRules(rs.getString("debug_allowed_hosts_json")),
            null,
            false,
            false,
            false);

    private static final RowMapper<ProjectDetail> PROJECT_ACCESS_ROW_MAPPER = (rs, rowNum) -> new ProjectDetail(
            rs.getLong("id"),
            rs.getLong("space_id"),
            rs.getString("space_name"),
            rs.getString("space_key"),
            rs.getString("name"),
            rs.getString("project_key"),
            rs.getString("description"),
            deserializeDebugRules(rs.getString("debug_allowed_hosts_json")),
            rs.getString("current_user_role"),
            rs.getBoolean("can_write"),
            rs.getBoolean("can_manage_members"),
            rs.getBoolean("can_manage_ai_settings"));

    private static final RowMapper<ProjectMemberDetail> PROJECT_MEMBER_ROW_MAPPER = (rs, rowNum) -> new ProjectMemberDetail(
            rs.getLong("user_id"),
            rs.getString("username"),
            rs.getString("display_name"),
            rs.getString("email"),
            rs.getString("role_code"),
            rs.getBoolean("owner"));

    private static final RowMapper<ProjectDocPushSettings> PROJECT_DOC_PUSH_ROW_MAPPER = (rs, rowNum) -> new ProjectDocPushSettings(
            rs.getLong("project_id"),
            rs.getString("project_name"),
            rs.getBoolean("doc_push_enabled"),
            rs.getString("doc_push_token"));

    private static final RowMapper<ModuleDetail> MODULE_ROW_MAPPER = (rs, rowNum) -> new ModuleDetail(
            rs.getLong("id"),
            rs.getLong("project_id"),
            rs.getString("name"));

    private static final RowMapper<ModuleVersionTagRecord> MODULE_VERSION_TAG_ROW_MAPPER = (rs, rowNum) -> new ModuleVersionTagRecord(
            rs.getLong("id"),
            rs.getLong("module_id"),
            rs.getString("tag_name"),
            rs.getString("description"),
            rs.getString("snapshot_json"),
            rs.getTimestamp("created_at").toInstant());

    private static final RowMapper<ModuleVersionTagEndpointSnapshot> MODULE_VERSION_TAG_ENDPOINT_ROW_MAPPER = (rs, rowNum) -> new ModuleVersionTagEndpointSnapshot(
            rs.getLong("endpoint_id"),
            rs.getString("endpoint_name"),
            rs.getString("http_method"),
            rs.getString("path"),
            rs.getString("group_name"),
            rs.getObject("released_version_id", Long.class),
            rs.getString("released_version_label"),
            rs.getTimestamp("released_at") == null ? null : rs.getTimestamp("released_at").toInstant());

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

    private static final RowMapper<DictionaryGroupDetail> DICTIONARY_GROUP_ROW_MAPPER = (rs, rowNum) -> new DictionaryGroupDetail(
            rs.getLong("id"),
            rs.getLong("project_id"),
            rs.getString("name"),
            rs.getString("description"),
            rs.getInt("item_count"));

    private static final RowMapper<DictionaryItemDetail> DICTIONARY_ITEM_ROW_MAPPER = (rs, rowNum) -> new DictionaryItemDetail(
            rs.getLong("id"),
            rs.getLong("group_id"),
            rs.getString("code"),
            rs.getString("item_value"),
            rs.getString("description"),
            rs.getInt("sort_order"));

    private static final RowMapper<ErrorCodeDetail> ERROR_CODE_ROW_MAPPER = (rs, rowNum) -> new ErrorCodeDetail(
            rs.getLong("id"),
            rs.getLong("project_id"),
            rs.getString("code"),
            rs.getString("name"),
            rs.getString("description"),
            rs.getString("solution"),
            rs.getObject("http_status", Integer.class));

    private static final RowMapper<AuditLogDetail> AUDIT_LOG_ROW_MAPPER = (rs, rowNum) -> new AuditLogDetail(
            rs.getLong("id"),
            rs.getLong("project_id"),
            rs.getLong("actor_user_id"),
            rs.getString("actor_display_name"),
            rs.getString("action_type"),
            rs.getString("resource_type"),
            rs.getObject("resource_id", Long.class),
            rs.getString("resource_name"),
            rs.getString("detail_json"),
            rs.getTimestamp("created_at").toInstant());

    private static final RowMapper<ProjectWebhookDetail> PROJECT_WEBHOOK_ROW_MAPPER = (rs, rowNum) -> new ProjectWebhookDetail(
            rs.getLong("id"),
            rs.getLong("project_id"),
            rs.getString("name"),
            rs.getString("target_url"),
            deserializeStringList(rs.getString("event_types_json")),
            rs.getBoolean("enabled"),
            !rs.getString("secret_token").isBlank(),
            rs.getTimestamp("created_at").toInstant(),
            rs.getTimestamp("updated_at").toInstant());

    private static final RowMapper<ProjectResourcePermissionDetail> PROJECT_RESOURCE_PERMISSION_ROW_MAPPER = (rs, rowNum) -> new ProjectResourcePermissionDetail(
            rs.getLong("id"),
            rs.getLong("project_id"),
            rs.getString("resource_type"),
            rs.getLong("resource_id"),
            rs.getString("resource_name"),
            rs.getLong("user_id"),
            rs.getString("username"),
            rs.getString("display_name"),
            rs.getString("email"),
            rs.getString("permission_level"),
            rs.getTimestamp("created_at").toInstant());

    private static final RowMapper<WebhookDeliveryDetail> WEBHOOK_DELIVERY_ROW_MAPPER = (rs, rowNum) -> new WebhookDeliveryDetail(
            rs.getLong("id"),
            rs.getLong("project_id"),
            rs.getLong("webhook_id"),
            rs.getString("webhook_name"),
            rs.getString("event_type"),
            rs.getString("target_url"),
            rs.getString("delivery_status"),
            rs.getObject("response_status", Integer.class),
            rs.getLong("duration_ms"),
            rs.getString("payload_json"),
            rs.getString("response_body"),
            rs.getString("error_message"),
            rs.getTimestamp("created_at").toInstant());

    private final JdbcTemplate jdbcTemplate;
    public ProjectRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<ProjectDetail> listProjects() {
        return listProjects(DEFAULT_USER_ID);
    }

    public List<ProjectDetail> listProjects(Long userId) {
        return listProjects(userId, null);
    }

    public List<ProjectDetail> listProjects(Long userId, Long spaceId) {
        StringBuilder sql = new StringBuilder("""
                select distinct project.id,
                                project.space_id,
                                space.name as space_name,
                                space.space_key,
                                project.name,
                                project.project_key,
                                project.description,
                                project.debug_allowed_hosts_json,
                                case
                                    when project.owner_id = ? then 'project_admin'
                                    when project_member.id is not null then project_member.role_code
                                    when exists (
                                        select 1
                                        from project_resource_permission permission
                                        where permission.project_id = project.id
                                          and permission.user_id = ?
                                          and permission.resource_type = 'project'
                                          and permission.permission_level = 'manage'
                                    ) then 'resource_manage'
                                    when exists (
                                        select 1
                                        from project_resource_permission permission
                                        where permission.project_id = project.id
                                          and permission.user_id = ?
                                          and permission.resource_type = 'project'
                                          and permission.permission_level = 'preview'
                                    ) then 'resource_preview'
                                    when exists (
                                        select 1
                                        from project_resource_permission permission
                                        join api_group g on g.id = permission.resource_id
                                        where permission.user_id = ?
                                          and permission.resource_type = 'group'
                                          and permission.permission_level = 'manage'
                                          and g.project_id = project.id
                                    ) then 'resource_manage'
                                    when exists (
                                        select 1
                                        from project_resource_permission permission
                                        join api_group g on g.id = permission.resource_id
                                        where permission.user_id = ?
                                          and permission.resource_type = 'group'
                                          and permission.permission_level = 'preview'
                                          and g.project_id = project.id
                                    ) then 'resource_preview'
                                    else null
                                end as current_user_role,
                                case
                                    when project.owner_id = ? then true
                                    when project_member.role_code in ('project_admin', 'editor') then true
                                    when exists (
                                        select 1
                                        from project_resource_permission permission
                                        where permission.project_id = project.id
                                          and permission.user_id = ?
                                          and permission.resource_type = 'project'
                                          and permission.permission_level = 'manage'
                                    ) then true
                                    else false
                                end as can_write,
                                case
                                    when project.owner_id = ? then true
                                    when project_member.role_code = 'project_admin' then true
                                    else false
                                end as can_manage_members,
                                case
                                    when project.owner_id = ? then true
                                    when project_member.role_code = 'project_admin' then true
                                    else false
                                end as can_manage_ai_settings
                from project
                join space on space.id = project.space_id
                left join project_member
                  on project_member.project_id = project.id
                 and project_member.user_id = ?
                 and project_member.member_status = 'active'
                where (
                        project.owner_id = ?
                     or project_member.id is not null
                     or exists (
                        select 1
                        from project_resource_permission permission
                        where permission.project_id = project.id
                          and permission.user_id = ?
                          and permission.resource_type = 'project'
                          and permission.permission_level in ('preview', 'manage')
                     )
                     or exists (
                        select 1
                        from project_resource_permission permission
                        join api_group g on g.id = permission.resource_id
                        where permission.user_id = ?
                          and permission.resource_type = 'group'
                          and permission.permission_level in ('preview', 'manage')
                          and g.project_id = project.id
                     )
                )
                """);
        List<Object> params = new ArrayList<>(List.of(
                userId, userId, userId, userId, userId,
                userId, userId, userId, userId, userId, userId, userId, userId, userId, userId));
        if (spaceId != null) {
            sql.append(" and project.space_id = ? ");
            params.add(spaceId);
        }
        sql.append(" order by project.id ");
        return jdbcTemplate.query(sql.toString(), PROJECT_ACCESS_ROW_MAPPER, params.toArray());
    }

    public List<SpaceSummary> listSpaces(Long userId) {
        return jdbcTemplate.query("""
                select distinct space.id,
                                space.name,
                                space.space_key,
                                case
                                    when space.owner_id = ? then 'space_admin'
                                    else space_member.role_code
                                end as current_user_role,
                                case
                                    when space.owner_id = ? then true
                                    when space_member.role_code in ('space_admin', 'project_admin', 'editor') then true
                                    else false
                                end as can_create_project,
                                coalesce(projects.project_count, 0) as project_count
                from space
                left join space_member
                  on space_member.space_id = space.id
                 and space_member.user_id = ?
                 and space_member.member_status = 'active'
                left join (
                    select project.space_id, count(*) as project_count
                    from project
                    left join project_member
                      on project_member.project_id = project.id
                     and project_member.user_id = ?
                     and project_member.member_status = 'active'
                    where project.owner_id = ?
                       or project_member.id is not null
                       or exists (
                            select 1
                            from project_resource_permission permission
                            where permission.project_id = project.id
                              and permission.user_id = ?
                              and permission.resource_type = 'project'
                              and permission.permission_level in ('preview', 'manage')
                       )
                       or exists (
                            select 1
                            from project_resource_permission permission
                            join api_group g on g.id = permission.resource_id
                            where permission.user_id = ?
                              and permission.resource_type = 'group'
                              and permission.permission_level in ('preview', 'manage')
                              and g.project_id = project.id
                       )
                    group by project.space_id
                ) projects
                  on projects.space_id = space.id
                where space.owner_id = ?
                   or space_member.id is not null
                   or projects.project_count > 0
                order by space.id
                """, SPACE_ROW_MAPPER, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId);
    }

    public SpaceSummary createSpace(Long userId, CreateSpaceRequest request) {
        String preferredKey = request.spaceKey() == null || request.spaceKey().isBlank()
                ? request.name()
                : request.spaceKey();
        String spaceKey = nextAvailableSpaceKey(preferredKey);

        GeneratedKeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    insert into space (name, space_key, owner_id, status)
                    values (?, ?, ?, 'active')
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setString(1, request.name());
            statement.setString(2, spaceKey);
            statement.setLong(3, userId);
            return statement;
        }, keyHolder);

        long spaceId = requireGeneratedId(keyHolder);
        jdbcTemplate.update("""
                insert into space_member (space_id, user_id, role_code, member_status)
                values (?, ?, 'space_admin', 'active')
                """, spaceId, userId);
        return findSpaceSummary(userId, spaceId).orElseThrow();
    }

    public Optional<ProjectDetail> findProject(Long userId, Long projectId) {
        return jdbcTemplate.query("""
                select project.id,
                       project.space_id,
                       space.name as space_name,
                       space.space_key,
                       project.name,
                       project.project_key,
                       project.description,
                       project.debug_allowed_hosts_json,
                       case
                           when project.owner_id = ? then 'project_admin'
                           when project_member.id is not null then project_member.role_code
                           when exists (
                                select 1
                                from project_resource_permission permission
                                where permission.project_id = project.id
                                  and permission.user_id = ?
                                  and permission.resource_type = 'project'
                                  and permission.permission_level = 'manage'
                           ) then 'resource_manage'
                           when exists (
                                select 1
                                from project_resource_permission permission
                                where permission.project_id = project.id
                                  and permission.user_id = ?
                                  and permission.resource_type = 'project'
                                  and permission.permission_level = 'preview'
                           ) then 'resource_preview'
                           when exists (
                                select 1
                                from project_resource_permission permission
                                join api_group g on g.id = permission.resource_id
                                where permission.user_id = ?
                                  and permission.resource_type = 'group'
                                  and permission.permission_level = 'manage'
                                  and g.project_id = project.id
                           ) then 'resource_manage'
                           when exists (
                                select 1
                                from project_resource_permission permission
                                join api_group g on g.id = permission.resource_id
                                where permission.user_id = ?
                                  and permission.resource_type = 'group'
                                  and permission.permission_level = 'preview'
                                  and g.project_id = project.id
                           ) then 'resource_preview'
                           else null
                       end as current_user_role,
                       case
                           when project.owner_id = ? then true
                           when project_member.role_code in ('project_admin', 'editor') then true
                           when exists (
                                select 1
                                from project_resource_permission permission
                                where permission.project_id = project.id
                                  and permission.user_id = ?
                                  and permission.resource_type = 'project'
                                  and permission.permission_level = 'manage'
                           ) then true
                           else false
                       end as can_write,
                       case
                           when project.owner_id = ? then true
                           when project_member.role_code = 'project_admin' then true
                           else false
                       end as can_manage_members,
                       case
                           when project.owner_id = ? then true
                           when project_member.role_code = 'project_admin' then true
                           else false
                       end as can_manage_ai_settings
                from project
                join space on space.id = project.space_id
                left join project_member
                  on project_member.project_id = project.id
                 and project_member.user_id = ?
                 and project_member.member_status = 'active'
                where project.id = ?
                  and (
                        project.owner_id = ?
                     or project_member.id is not null
                     or exists (
                        select 1
                        from project_resource_permission permission
                        where permission.project_id = project.id
                          and permission.user_id = ?
                          and permission.resource_type = 'project'
                          and permission.permission_level in ('preview', 'manage')
                     )
                     or exists (
                        select 1
                        from project_resource_permission permission
                        join api_group g on g.id = permission.resource_id
                        where permission.user_id = ?
                          and permission.resource_type = 'group'
                          and permission.permission_level in ('preview', 'manage')
                          and g.project_id = project.id
                     )
                  )
                """, PROJECT_ACCESS_ROW_MAPPER,
                userId, userId, userId, userId, userId,
                userId, userId, userId, userId, userId, projectId, userId, userId, userId, userId, userId).stream().findFirst();
    }

    public Optional<SpaceSummary> findSpaceSummary(Long userId, Long spaceId) {
        return jdbcTemplate.query("""
                select distinct space.id,
                                space.name,
                                space.space_key,
                                case
                                    when space.owner_id = ? then 'space_admin'
                                    else space_member.role_code
                                end as current_user_role,
                                case
                                    when space.owner_id = ? then true
                                    when space_member.role_code in ('space_admin', 'project_admin', 'editor') then true
                                    else false
                                end as can_create_project,
                                coalesce(projects.project_count, 0) as project_count
                from space
                left join space_member
                  on space_member.space_id = space.id
                 and space_member.user_id = ?
                 and space_member.member_status = 'active'
                left join (
                    select project.space_id, count(*) as project_count
                    from project
                    left join project_member
                      on project_member.project_id = project.id
                     and project_member.user_id = ?
                     and project_member.member_status = 'active'
                    where project.owner_id = ?
                       or project_member.id is not null
                       or exists (
                            select 1
                            from project_resource_permission permission
                            where permission.project_id = project.id
                              and permission.user_id = ?
                              and permission.resource_type = 'project'
                              and permission.permission_level in ('preview', 'manage')
                       )
                       or exists (
                            select 1
                            from project_resource_permission permission
                            join api_group g on g.id = permission.resource_id
                            where permission.user_id = ?
                              and permission.resource_type = 'group'
                              and permission.permission_level in ('preview', 'manage')
                              and g.project_id = project.id
                       )
                    group by project.space_id
                ) projects
                  on projects.space_id = space.id
                where space.id = ?
                  and (
                        space.owner_id = ?
                     or space_member.id is not null
                     or projects.project_count > 0
                  )
                """, SPACE_ROW_MAPPER, userId, userId, userId, userId, userId, userId, spaceId, userId).stream().findFirst();
    }

    public Optional<ProjectDetail> findProject(Long projectId) {
        return jdbcTemplate.query("""
                select project.id,
                       project.space_id,
                       space.name as space_name,
                       space.space_key,
                       project.name,
                       project.project_key,
                       project.description,
                       project.debug_allowed_hosts_json
                from project
                join space on space.id = project.space_id
                where project.id = ?
                """, PROJECT_ROW_MAPPER, projectId).stream().findFirst();
    }

    public Optional<ProjectDocPushSettings> findProjectDocPushSettings(Long projectId) {
        return jdbcTemplate.query("""
                select id as project_id,
                       name as project_name,
                       doc_push_enabled,
                       doc_push_token
                from project
                where id = ?
                """, PROJECT_DOC_PUSH_ROW_MAPPER, projectId).stream().findFirst();
    }

    public Optional<ProjectPushTarget> findProjectPushTarget(String token) {
        return jdbcTemplate.query("""
                select id as project_id,
                       owner_id,
                       name as project_name,
                       doc_push_enabled,
                       doc_push_token
                from project
                where doc_push_token = ?
                """, (rs, rowNum) -> new ProjectPushTarget(
                rs.getLong("project_id"),
                rs.getLong("owner_id"),
                rs.getString("project_name"),
                rs.getBoolean("doc_push_enabled"),
                rs.getString("doc_push_token")), token).stream().findFirst();
    }

    public ProjectDocPushSettings updateProjectDocPushEnabled(Long projectId, boolean enabled) {
        jdbcTemplate.update("""
                update project
                set doc_push_enabled = ?
                where id = ?
                """, enabled, projectId);
        return findProjectDocPushSettings(projectId).orElseThrow();
    }

    public ProjectDocPushSettings regenerateProjectDocPushToken(Long projectId) {
        jdbcTemplate.update("""
                update project
                set doc_push_token = ?
                where id = ?
                """, UUID.randomUUID().toString().replace("-", ""), projectId);
        return findProjectDocPushSettings(projectId).orElseThrow();
    }

    public boolean canAccessProject(Long userId, Long projectId) {
        return findProject(userId, projectId).isPresent();
    }

    public boolean canWriteProject(Long userId, Long projectId) {
        return findProject(userId, projectId).map(ProjectDetail::canWrite).orElse(false);
    }

    public boolean canTestProject(Long userId, Long projectId) {
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
                     or project_member.role_code in ('project_admin', 'editor', 'tester')
                  )
                """, Integer.class, userId, projectId, userId);
        return matched != null && matched > 0;
    }

    public boolean canManageProjectMembers(Long userId, Long projectId) {
        return findProject(userId, projectId).map(ProjectDetail::canManageMembers).orElse(false);
    }

    public boolean canManageProjectAiSettings(Long userId, Long projectId) {
        return findProject(userId, projectId).map(ProjectDetail::canManageAiSettings).orElse(false);
    }

    public boolean hasProjectScopeAccess(Long userId, Long projectId) {
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
                     or project_member.id is not null
                     or exists (
                          select 1
                          from project_resource_permission permission
                          where permission.project_id = project.id
                            and permission.user_id = ?
                            and permission.resource_type = 'project'
                            and permission.permission_level in ('preview', 'manage')
                      )
                  )
                """, Integer.class, userId, projectId, userId, userId);
        return matched != null && matched > 0;
    }

    public boolean hasProjectScopeWriteAccess(Long userId, Long projectId) {
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
                     or exists (
                          select 1
                          from project_resource_permission permission
                          where permission.project_id = project.id
                            and permission.user_id = ?
                            and permission.resource_type = 'project'
                            and permission.permission_level = 'manage'
                      )
                  )
                """, Integer.class, userId, projectId, userId, userId);
        return matched != null && matched > 0;
    }

    public boolean canAccessGroup(Long userId, Long groupId) {
        GroupReference group = findGroupReference(groupId).orElse(null);
        if (group == null) {
            return false;
        }
        if (canAccessProject(userId, group.projectId())) {
            return true;
        }
        return hasGroupPermission(userId, groupId, "preview") || hasGroupPermission(userId, groupId, "manage");
    }

    public boolean canWriteGroup(Long userId, Long groupId) {
        GroupReference group = findGroupReference(groupId).orElse(null);
        if (group == null) {
            return false;
        }
        if (hasProjectScopeWriteAccess(userId, group.projectId())) {
            return true;
        }
        return hasGroupPermission(userId, groupId, "manage");
    }

    private boolean hasGroupPermission(Long userId, Long groupId, String permissionLevel) {
        Integer matched = jdbcTemplate.queryForObject("""
                select count(*)
                from project_resource_permission permission
                where permission.resource_type = 'group'
                  and permission.resource_id = ?
                  and permission.user_id = ?
                  and permission.permission_level = ?
                """, Integer.class, groupId, userId, permissionLevel);
        return matched != null && matched > 0;
    }

    public ProjectDetail createProject(CreateProjectRequest request) {
        return createProject(DEFAULT_USER_ID, DEFAULT_SPACE_ID, request);
    }

    public ProjectDetail createProject(Long userId, Long spaceId, CreateProjectRequest request) {
        GeneratedKeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    insert into project (
                        space_id,
                        name,
                        project_key,
                        description,
                        owner_id,
                        status,
                        debug_allowed_hosts_json,
                        mock_access_mode,
                        mock_access_token
                    )
                    values (?, ?, ?, ?, ?, 'active', ?, 'private', ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, spaceId);
            statement.setString(2, request.name());
            statement.setString(3, request.projectKey());
            statement.setString(4, request.description());
            statement.setLong(5, userId);
            statement.setString(6, serializeDebugRules(request.debugAllowedHosts()));
            statement.setString(7, UUID.randomUUID().toString().replace("-", ""));
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

    public List<ModuleDetail> listModules(Long userId, Long projectId) {
        if (hasProjectScopeAccess(userId, projectId)) {
            return listModules(projectId);
        }
        return jdbcTemplate.query("""
                select distinct module.id,
                                module.project_id,
                                module.name
                from module
                join api_group on api_group.module_id = module.id
                join project_resource_permission permission
                  on permission.resource_type = 'group'
                 and permission.resource_id = api_group.id
                 and permission.user_id = ?
                 and permission.permission_level in ('preview', 'manage')
                where module.project_id = ?
                order by module.sort_order, module.id
                """, MODULE_ROW_MAPPER, userId, projectId);
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

    public Optional<ModuleDetail> findModuleByProjectAndName(Long projectId, String name) {
        return jdbcTemplate.query("""
                select id, project_id, name
                from module
                where project_id = ?
                  and lower(name) = lower(?)
                order by id
                limit 1
                """, MODULE_ROW_MAPPER, projectId, name).stream().findFirst();
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

    public List<ModuleVersionTagRecord> listModuleVersionTags(Long moduleId) {
        return jdbcTemplate.query("""
                select id, module_id, tag_name, description, snapshot_json, created_at
                from module_version_tag
                where module_id = ?
                order by created_at desc, id desc
                """, MODULE_VERSION_TAG_ROW_MAPPER, moduleId);
    }

    public ModuleVersionTagRecord createModuleVersionTag(Long userId, Long moduleId, String tagName, String description, String snapshotJson) {
        GeneratedKeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    insert into module_version_tag (module_id, tag_name, description, snapshot_json, created_by)
                    values (?, ?, ?, ?, ?)
                    """, new String[]{"id"});
            statement.setLong(1, moduleId);
            statement.setString(2, tagName);
            statement.setString(3, description);
            statement.setString(4, snapshotJson);
            statement.setLong(5, userId);
            return statement;
        }, keyHolder);
        return findModuleVersionTag(requireGeneratedId(keyHolder)).orElseThrow();
    }

    public Optional<ModuleVersionTagRecord> findModuleVersionTag(Long tagId) {
        return jdbcTemplate.query("""
                select id, module_id, tag_name, description, snapshot_json, created_at
                from module_version_tag
                where id = ?
                """, MODULE_VERSION_TAG_ROW_MAPPER, tagId).stream().findFirst();
    }

    public List<ModuleVersionTagEndpointSnapshot> listModuleEndpointReleaseSnapshots(Long moduleId) {
        return jdbcTemplate.query("""
                select endpoint.id as endpoint_id,
                       endpoint.name as endpoint_name,
                       endpoint.http_method,
                       endpoint.path,
                       coalesce(api_group.name, 'Ungrouped') as group_name,
                       endpoint.released_version_id,
                       case
                           when released_version.id is null then null
                           else coalesce(released_version.version_label, concat('r', released_version.revision_no))
                       end as released_version_label,
                       endpoint.released_at
                from api_endpoint endpoint
                left join api_group on api_group.id = endpoint.group_id
                left join api_version released_version on released_version.id = endpoint.released_version_id
                where endpoint.module_id = ?
                order by endpoint.sort_order, endpoint.id
                """, MODULE_VERSION_TAG_ENDPOINT_ROW_MAPPER, moduleId);
    }

    public List<GroupDetail> listGroups(Long moduleId) {
        return jdbcTemplate.query("""
                select id, module_id, name
                from api_group
                where module_id = ?
                order by sort_order, id
                """, GROUP_ROW_MAPPER, moduleId);
    }

    public List<GroupDetail> listGroups(Long userId, Long moduleId) {
        ProjectRepository.ModuleReference moduleReference = findModuleReference(moduleId).orElseThrow();
        if (hasProjectScopeAccess(userId, moduleReference.projectId())) {
            return listGroups(moduleId);
        }
        return jdbcTemplate.query("""
                select distinct api_group.id,
                                api_group.module_id,
                                api_group.name
                from api_group
                join project_resource_permission permission
                  on permission.resource_type = 'group'
                 and permission.resource_id = api_group.id
                 and permission.user_id = ?
                 and permission.permission_level in ('preview', 'manage')
                where api_group.module_id = ?
                order by api_group.sort_order, api_group.id
                """, GROUP_ROW_MAPPER, userId, moduleId);
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

    public Optional<GroupDetail> findGroupByModuleAndName(Long moduleId, String name) {
        return jdbcTemplate.query("""
                select id, module_id, name
                from api_group
                where module_id = ?
                  and lower(name) = lower(?)
                order by id
                limit 1
                """, GROUP_ROW_MAPPER, moduleId, name).stream().findFirst();
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
        jdbcTemplate.update("""
                delete from project_resource_permission
                where resource_type = 'group'
                  and resource_id = ?
                """, groupId);
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

    public List<DictionaryGroupDetail> listDictionaryGroups(Long projectId) {
        return jdbcTemplate.query("""
                select g.id,
                       g.project_id,
                       g.name,
                       g.description,
                       (select count(*) from dict_item i where i.group_id = g.id) as item_count
                from dict_group g
                where g.project_id = ?
                order by g.id
                """, DICTIONARY_GROUP_ROW_MAPPER, projectId);
    }

    public Optional<DictionaryGroupReference> findDictionaryGroupReference(Long groupId) {
        return jdbcTemplate.query("""
                select id, project_id
                from dict_group
                where id = ?
                """, (rs, rowNum) -> new DictionaryGroupReference(rs.getLong("id"), rs.getLong("project_id")), groupId).stream().findFirst();
    }

    public Optional<DictionaryGroupDetail> findDictionaryGroupByProjectAndName(Long projectId, String name) {
        return jdbcTemplate.query("""
                select g.id,
                       g.project_id,
                       g.name,
                       g.description,
                       (select count(*) from dict_item i where i.group_id = g.id) as item_count
                from dict_group g
                where g.project_id = ?
                  and lower(g.name) = lower(?)
                order by g.id
                limit 1
                """, DICTIONARY_GROUP_ROW_MAPPER, projectId, name).stream().findFirst();
    }

    public DictionaryGroupDetail createDictionaryGroup(Long userId, Long projectId, CreateDictionaryGroupRequest request) {
        GeneratedKeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    insert into dict_group (project_id, name, description, created_by, updated_by)
                    values (?, ?, ?, ?, ?)
                    """, new String[]{"id"});
            statement.setLong(1, projectId);
            statement.setString(2, request.name());
            statement.setString(3, request.description());
            statement.setLong(4, userId);
            statement.setLong(5, userId);
            return statement;
        }, keyHolder);
        return findDictionaryGroup(requireGeneratedId(keyHolder)).orElseThrow();
    }

    public Optional<DictionaryGroupDetail> findDictionaryGroup(Long groupId) {
        return jdbcTemplate.query("""
                select g.id,
                       g.project_id,
                       g.name,
                       g.description,
                       (select count(*) from dict_item i where i.group_id = g.id) as item_count
                from dict_group g
                where g.id = ?
                """, DICTIONARY_GROUP_ROW_MAPPER, groupId).stream().findFirst();
    }

    public DictionaryGroupDetail updateDictionaryGroup(Long groupId, UpdateDictionaryGroupRequest request) {
        jdbcTemplate.update("""
                update dict_group
                set name = ?, description = ?
                where id = ?
                """, request.name(), request.description(), groupId);
        return findDictionaryGroup(groupId).orElseThrow();
    }

    public void deleteDictionaryGroup(Long groupId) {
        jdbcTemplate.update("delete from dict_item where group_id = ?", groupId);
        jdbcTemplate.update("delete from dict_group where id = ?", groupId);
    }

    public List<DictionaryItemDetail> listDictionaryItems(Long groupId) {
        return jdbcTemplate.query("""
                select id, group_id, code, item_value, description, sort_order
                from dict_item
                where group_id = ?
                order by sort_order, id
                """, DICTIONARY_ITEM_ROW_MAPPER, groupId);
    }

    public DictionaryItemDetail createDictionaryItem(Long userId, Long groupId, CreateDictionaryItemRequest request) {
        GeneratedKeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    insert into dict_item (group_id, code, item_value, description, sort_order, created_by, updated_by)
                    values (?, ?, ?, ?, ?, ?, ?)
                    """, new String[]{"id"});
            statement.setLong(1, groupId);
            statement.setString(2, request.code());
            statement.setString(3, request.value());
            statement.setString(4, request.description());
            statement.setInt(5, request.sortOrder() == null ? 0 : request.sortOrder());
            statement.setLong(6, userId);
            statement.setLong(7, userId);
            return statement;
        }, keyHolder);
        return findDictionaryItem(requireGeneratedId(keyHolder)).orElseThrow();
    }

    public Optional<DictionaryItemDetail> findDictionaryItem(Long itemId) {
        return jdbcTemplate.query("""
                select id, group_id, code, item_value, description, sort_order
                from dict_item
                where id = ?
                """, DICTIONARY_ITEM_ROW_MAPPER, itemId).stream().findFirst();
    }

    public Optional<DictionaryItemReference> findDictionaryItemReference(Long itemId) {
        return jdbcTemplate.query("""
                select i.id, i.group_id, g.project_id
                from dict_item i
                join dict_group g on g.id = i.group_id
                where i.id = ?
                """, (rs, rowNum) -> new DictionaryItemReference(rs.getLong("id"), rs.getLong("group_id"), rs.getLong("project_id")), itemId).stream().findFirst();
    }

    public Optional<DictionaryItemDetail> findDictionaryItemByGroupAndCode(Long groupId, String code) {
        return jdbcTemplate.query("""
                select id, group_id, code, item_value, description, sort_order
                from dict_item
                where group_id = ?
                  and lower(code) = lower(?)
                order by id
                limit 1
                """, DICTIONARY_ITEM_ROW_MAPPER, groupId, code).stream().findFirst();
    }

    public DictionaryItemDetail updateDictionaryItem(Long itemId, UpdateDictionaryItemRequest request) {
        jdbcTemplate.update("""
                update dict_item
                set code = ?, item_value = ?, description = ?, sort_order = ?
                where id = ?
                """, request.code(), request.value(), request.description(), request.sortOrder() == null ? 0 : request.sortOrder(), itemId);
        return findDictionaryItem(itemId).orElseThrow();
    }

    public void deleteDictionaryItem(Long itemId) {
        jdbcTemplate.update("delete from dict_item where id = ?", itemId);
    }

    public List<ErrorCodeDetail> listErrorCodes(Long projectId) {
        return jdbcTemplate.query("""
                select id, project_id, code, name, description, solution, http_status
                from error_code
                where project_id = ?
                order by id
                """, ERROR_CODE_ROW_MAPPER, projectId);
    }

    public ErrorCodeDetail createErrorCode(Long userId, Long projectId, CreateErrorCodeRequest request) {
        GeneratedKeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    insert into error_code (project_id, code, name, description, solution, http_status, created_by, updated_by)
                    values (?, ?, ?, ?, ?, ?, ?, ?)
                    """, new String[]{"id"});
            statement.setLong(1, projectId);
            statement.setString(2, request.code());
            statement.setString(3, request.name());
            statement.setString(4, request.description());
            statement.setString(5, request.solution());
            if (request.httpStatus() == null) {
                statement.setObject(6, null);
            } else {
                statement.setInt(6, request.httpStatus());
            }
            statement.setLong(7, userId);
            statement.setLong(8, userId);
            return statement;
        }, keyHolder);
        return findErrorCode(requireGeneratedId(keyHolder)).orElseThrow();
    }

    public Optional<ErrorCodeDetail> findErrorCode(Long errorCodeId) {
        return jdbcTemplate.query("""
                select id, project_id, code, name, description, solution, http_status
                from error_code
                where id = ?
                """, ERROR_CODE_ROW_MAPPER, errorCodeId).stream().findFirst();
    }

    public Optional<ErrorCodeReference> findErrorCodeReference(Long errorCodeId) {
        return jdbcTemplate.query("""
                select id, project_id
                from error_code
                where id = ?
                """, (rs, rowNum) -> new ErrorCodeReference(rs.getLong("id"), rs.getLong("project_id")), errorCodeId).stream().findFirst();
    }

    public Optional<ErrorCodeDetail> findErrorCodeByProjectAndCode(Long projectId, String code) {
        return jdbcTemplate.query("""
                select id, project_id, code, name, description, solution, http_status
                from error_code
                where project_id = ?
                  and lower(code) = lower(?)
                order by id
                limit 1
                """, ERROR_CODE_ROW_MAPPER, projectId, code).stream().findFirst();
    }

    public void createAuditLog(Long projectId,
                               Long actorUserId,
                               String actionType,
                               String resourceType,
                               Long resourceId,
                               String resourceName,
                               String detailJson) {
        jdbcTemplate.update("""
                insert into audit_log (project_id, actor_user_id, action_type, resource_type, resource_id, resource_name, detail_json)
                values (?, ?, ?, ?, ?, ?, ?)
                """,
                projectId,
                actorUserId,
                actionType,
                resourceType,
                resourceId,
                resourceName,
                detailJson);
    }

    public List<AuditLogDetail> listAuditLogs(Long projectId, int limit) {
        return jdbcTemplate.query("""
                select audit.id,
                       audit.project_id,
                       audit.actor_user_id,
                       coalesce(user_entry.display_name, user_entry.username, concat('User#', audit.actor_user_id)) as actor_display_name,
                       audit.action_type,
                       audit.resource_type,
                       audit.resource_id,
                       audit.resource_name,
                       audit.detail_json,
                       audit.created_at
                from audit_log audit
                left join sys_user user_entry on user_entry.id = audit.actor_user_id
                where audit.project_id = ?
                order by audit.created_at desc, audit.id desc
                limit ?
                """, AUDIT_LOG_ROW_MAPPER, projectId, Math.max(1, limit));
    }

    public List<ProjectWebhookDetail> listProjectWebhooks(Long projectId) {
        return jdbcTemplate.query("""
                select id,
                       project_id,
                       name,
                       target_url,
                       event_types_json,
                       enabled,
                       secret_token,
                       created_at,
                       updated_at
                from project_webhook
                where project_id = ?
                order by updated_at desc, id desc
                """, PROJECT_WEBHOOK_ROW_MAPPER, projectId);
    }

    public ProjectWebhookDetail createProjectWebhook(Long userId, Long projectId, CreateProjectWebhookRequest request) {
        GeneratedKeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    insert into project_webhook (project_id, name, target_url, secret_token, event_types_json, enabled, created_by, updated_by)
                    values (?, ?, ?, ?, ?, ?, ?, ?)
                    """, new String[]{"id"});
            statement.setLong(1, projectId);
            statement.setString(2, request.name());
            statement.setString(3, request.targetUrl());
            statement.setString(4, normalizeNullableString(request.secret()));
            statement.setString(5, serializeStringList(request.eventTypes()));
            statement.setBoolean(6, !Boolean.FALSE.equals(request.enabled()));
            statement.setLong(7, userId);
            statement.setLong(8, userId);
            return statement;
        }, keyHolder);
        return findProjectWebhook(requireGeneratedId(keyHolder)).orElseThrow();
    }

    public ProjectWebhookDetail updateProjectWebhook(Long userId, Long webhookId, UpdateProjectWebhookRequest request) {
        String currentSecret = jdbcTemplate.query("""
                select secret_token
                from project_webhook
                where id = ?
                """, rs -> rs.next() ? rs.getString("secret_token") : "", webhookId);
        jdbcTemplate.update("""
                update project_webhook
                set name = ?,
                    target_url = ?,
                    secret_token = ?,
                    event_types_json = ?,
                    enabled = ?,
                    updated_by = ?
                where id = ?
                """,
                request.name(),
                request.targetUrl(),
                request.secret() == null ? currentSecret : normalizeNullableString(request.secret()),
                serializeStringList(request.eventTypes()),
                !Boolean.FALSE.equals(request.enabled()),
                userId,
                webhookId);
        return findProjectWebhook(webhookId).orElseThrow();
    }

    public void deleteProjectWebhook(Long webhookId) {
        jdbcTemplate.update("delete from project_webhook where id = ?", webhookId);
    }

    public Optional<ProjectWebhookDetail> findProjectWebhook(Long webhookId) {
        return jdbcTemplate.query("""
                select id,
                       project_id,
                       name,
                       target_url,
                       event_types_json,
                       enabled,
                       secret_token,
                       created_at,
                       updated_at
                from project_webhook
                where id = ?
                """, PROJECT_WEBHOOK_ROW_MAPPER, webhookId).stream().findFirst();
    }

    public Optional<ProjectWebhookSecretRecord> findProjectWebhookSecret(Long webhookId) {
        return jdbcTemplate.query("""
                select id,
                       project_id,
                       name,
                       target_url,
                       secret_token,
                       event_types_json,
                       enabled
                from project_webhook
                where id = ?
                """, (rs, rowNum) -> new ProjectWebhookSecretRecord(
                rs.getLong("id"),
                rs.getLong("project_id"),
                rs.getString("name"),
                rs.getString("target_url"),
                rs.getString("secret_token"),
                deserializeStringList(rs.getString("event_types_json")),
                rs.getBoolean("enabled")), webhookId).stream().findFirst();
    }

    public Optional<ProjectWebhookReference> findProjectWebhookReference(Long webhookId) {
        return jdbcTemplate.query("""
                select id, project_id, name
                from project_webhook
                where id = ?
                """, (rs, rowNum) -> new ProjectWebhookReference(
                rs.getLong("id"),
                rs.getLong("project_id"),
                rs.getString("name")), webhookId).stream().findFirst();
    }

    public List<ProjectWebhookSecretRecord> listEnabledWebhookTargets(Long projectId) {
        return jdbcTemplate.query("""
                select id,
                       project_id,
                       name,
                       target_url,
                       secret_token,
                       event_types_json,
                       enabled
                from project_webhook
                where project_id = ?
                  and enabled = true
                order by id
                """, (rs, rowNum) -> new ProjectWebhookSecretRecord(
                rs.getLong("id"),
                rs.getLong("project_id"),
                rs.getString("name"),
                rs.getString("target_url"),
                rs.getString("secret_token"),
                deserializeStringList(rs.getString("event_types_json")),
                rs.getBoolean("enabled")), projectId);
    }

    public void createWebhookDelivery(Long projectId,
                                      Long webhookId,
                                      String eventType,
                                      String targetUrl,
                                      String deliveryStatus,
                                      Integer responseStatus,
                                      long durationMs,
                                      String payloadJson,
                                      String responseBody,
                                      String errorMessage) {
        jdbcTemplate.update("""
                insert into webhook_delivery (
                    project_id, webhook_id, event_type, target_url, delivery_status, response_status,
                    duration_ms, payload_json, response_body, error_message
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                projectId,
                webhookId,
                eventType,
                targetUrl,
                deliveryStatus,
                responseStatus,
                durationMs,
                payloadJson,
                responseBody,
                errorMessage);
    }

    public List<WebhookDeliveryDetail> listWebhookDeliveries(Long projectId, int limit) {
        return jdbcTemplate.query("""
                select delivery.id,
                       delivery.project_id,
                       delivery.webhook_id,
                       webhook.name as webhook_name,
                       delivery.event_type,
                       delivery.target_url,
                       delivery.delivery_status,
                       delivery.response_status,
                       delivery.duration_ms,
                       delivery.payload_json,
                       delivery.response_body,
                       delivery.error_message,
                       delivery.created_at
                from webhook_delivery delivery
                join project_webhook webhook on webhook.id = delivery.webhook_id
                where delivery.project_id = ?
                order by delivery.created_at desc, delivery.id desc
                limit ?
                """, WEBHOOK_DELIVERY_ROW_MAPPER, projectId, Math.max(1, limit));
    }

    public ErrorCodeDetail updateErrorCode(Long errorCodeId, UpdateErrorCodeRequest request) {
        jdbcTemplate.update("""
                update error_code
                set code = ?, name = ?, description = ?, solution = ?, http_status = ?
                where id = ?
                """,
                request.code(),
                request.name(),
                request.description(),
                request.solution(),
                request.httpStatus(),
                errorCodeId);
        return findErrorCode(errorCodeId).orElseThrow();
    }

    public void deleteErrorCode(Long errorCodeId) {
        jdbcTemplate.update("delete from error_code where id = ?", errorCodeId);
    }

    public Optional<EnvironmentDetail> findEnvironment(Long environmentId) {
        return jdbcTemplate.query("""
                select id, project_id, name, base_url, is_default, variables_json, default_headers_json
                     , default_query_json, auth_mode, auth_key, auth_value, debug_host_mode, debug_allowed_hosts_json
                from environment
                where id = ?
                """, ENVIRONMENT_ROW_MAPPER, environmentId).stream().findFirst();
    }

    public Optional<EnvironmentDetail> findEnvironmentByProjectAndName(Long projectId, String name) {
        return jdbcTemplate.query("""
                select id, project_id, name, base_url, is_default, variables_json, default_headers_json
                     , default_query_json, auth_mode, auth_key, auth_value, debug_host_mode, debug_allowed_hosts_json
                from environment
                where project_id = ?
                  and lower(name) = lower(?)
                order by id
                limit 1
                """, ENVIRONMENT_ROW_MAPPER, projectId, name).stream().findFirst();
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

    public List<ProjectMemberDetail> listProjectMembers(Long projectId) {
        return jdbcTemplate.query("""
                select u.id as user_id,
                       u.username,
                       u.display_name,
                       u.email,
                       case
                           when p.owner_id = u.id then 'project_admin'
                           else pm.role_code
                       end as role_code,
                       case
                           when p.owner_id = u.id then true
                           else false
                       end as owner
                from project p
                join sys_user u
                  on u.status = 'active'
                left join project_member pm
                  on pm.project_id = p.id
                 and pm.user_id = u.id
                 and pm.member_status = 'active'
                where p.id = ?
                  and (p.owner_id = u.id or pm.id is not null)
                order by owner desc, u.id
                """, PROJECT_MEMBER_ROW_MAPPER, projectId);
    }

    public Optional<ProjectMemberDetail> findProjectMember(Long projectId, Long userId) {
        return jdbcTemplate.query("""
                select u.id as user_id,
                       u.username,
                       u.display_name,
                       u.email,
                       case
                           when p.owner_id = u.id then 'project_admin'
                           else pm.role_code
                       end as role_code,
                       case
                           when p.owner_id = u.id then true
                           else false
                       end as owner
                from project p
                join sys_user u
                  on u.id = ?
                 and u.status = 'active'
                left join project_member pm
                  on pm.project_id = p.id
                 and pm.user_id = u.id
                 and pm.member_status = 'active'
                where p.id = ?
                  and (p.owner_id = u.id or pm.id is not null)
                """, PROJECT_MEMBER_ROW_MAPPER, userId, projectId).stream().findFirst();
    }

    public ProjectMemberDetail saveProjectMember(Long projectId, Long userId, UpsertProjectMemberRequest request) {
        Integer existingId = jdbcTemplate.query("""
                select id
                from project_member
                where project_id = ?
                  and user_id = ?
                """, rs -> rs.next() ? rs.getInt("id") : null, projectId, userId);

        if (existingId == null) {
            jdbcTemplate.update("""
                    insert into project_member (project_id, user_id, role_code, member_status)
                    values (?, ?, ?, 'active')
                    """, projectId, userId, request.roleCode());
        } else {
            jdbcTemplate.update("""
                    update project_member
                    set role_code = ?,
                        member_status = 'active'
                    where project_id = ?
                      and user_id = ?
                    """, request.roleCode(), projectId, userId);
        }

        return findProjectMember(projectId, userId).orElseThrow();
    }

    public void deleteProjectMember(Long projectId, Long userId) {
        jdbcTemplate.update("""
                delete from project_member
                where project_id = ?
                  and user_id = ?
                """, projectId, userId);
    }

    public List<ProjectResourcePermissionDetail> listProjectResourcePermissions(Long projectId) {
        return jdbcTemplate.query("""
                select permission.id,
                       permission.project_id,
                       permission.resource_type,
                       permission.resource_id,
                       case
                           when permission.resource_type = 'project' then project.name
                           else api_group.name
                       end as resource_name,
                       permission.user_id,
                       u.username,
                       u.display_name,
                       u.email,
                       permission.permission_level,
                       permission.created_at
                from project_resource_permission permission
                join sys_user u
                  on u.id = permission.user_id
                left join project
                  on permission.resource_type = 'project'
                 and project.id = permission.resource_id
                left join api_group
                  on permission.resource_type = 'group'
                 and api_group.id = permission.resource_id
                where permission.project_id = ?
                order by permission.resource_type, permission.resource_id, permission.id
                """, PROJECT_RESOURCE_PERMISSION_ROW_MAPPER, projectId);
    }

    public Optional<ProjectResourcePermissionReference> findProjectResourcePermissionReference(Long permissionId) {
        return jdbcTemplate.query("""
                select id,
                       project_id,
                       resource_type,
                       resource_id,
                       user_id,
                       permission_level
                from project_resource_permission
                where id = ?
                """, (rs, rowNum) -> new ProjectResourcePermissionReference(
                rs.getLong("id"),
                rs.getLong("project_id"),
                rs.getString("resource_type"),
                rs.getLong("resource_id"),
                rs.getLong("user_id"),
                rs.getString("permission_level")), permissionId).stream().findFirst();
    }

    public ProjectResourcePermissionDetail saveProjectResourcePermission(Long actorUserId,
                                                                        Long projectId,
                                                                        Long targetUserId,
                                                                        String resourceType,
                                                                        Long resourceId,
                                                                        String permissionLevel) {
        Integer existingId = jdbcTemplate.query("""
                select id
                from project_resource_permission
                where project_id = ?
                  and resource_type = ?
                  and resource_id = ?
                  and user_id = ?
                """, rs -> rs.next() ? rs.getInt("id") : null, projectId, resourceType, resourceId, targetUserId);

        if (existingId == null) {
            jdbcTemplate.update("""
                    insert into project_resource_permission (
                        project_id,
                        resource_type,
                        resource_id,
                        user_id,
                        permission_level,
                        created_by,
                        updated_by
                    ) values (?, ?, ?, ?, ?, ?, ?)
                    """,
                    projectId,
                    resourceType,
                    resourceId,
                    targetUserId,
                    permissionLevel,
                    actorUserId,
                    actorUserId);
        } else {
            jdbcTemplate.update("""
                    update project_resource_permission
                    set permission_level = ?,
                        updated_by = ?
                    where id = ?
                    """, permissionLevel, actorUserId, existingId);
        }

        return findProjectResourcePermission(projectId, resourceType, resourceId, targetUserId).orElseThrow();
    }

    public Optional<ProjectResourcePermissionDetail> findProjectResourcePermission(Long projectId,
                                                                                   String resourceType,
                                                                                   Long resourceId,
                                                                                   Long userId) {
        return jdbcTemplate.query("""
                select permission.id,
                       permission.project_id,
                       permission.resource_type,
                       permission.resource_id,
                       case
                           when permission.resource_type = 'project' then project.name
                           else api_group.name
                       end as resource_name,
                       permission.user_id,
                       u.username,
                       u.display_name,
                       u.email,
                       permission.permission_level,
                       permission.created_at
                from project_resource_permission permission
                join sys_user u
                  on u.id = permission.user_id
                left join project
                  on permission.resource_type = 'project'
                 and project.id = permission.resource_id
                left join api_group
                  on permission.resource_type = 'group'
                 and api_group.id = permission.resource_id
                where permission.project_id = ?
                  and permission.resource_type = ?
                  and permission.resource_id = ?
                  and permission.user_id = ?
                """, PROJECT_RESOURCE_PERMISSION_ROW_MAPPER, projectId, resourceType, resourceId, userId).stream().findFirst();
    }

    public void deleteProjectResourcePermission(Long permissionId) {
        jdbcTemplate.update("delete from project_resource_permission where id = ?", permissionId);
    }

    public long countProjectAdmins(Long projectId) {
        Long count = jdbcTemplate.queryForObject("""
                select count(*)
                from (
                    select p.owner_id as user_id
                    from project p
                    join sys_user u
                      on u.id = p.owner_id
                     and u.status = 'active'
                    where p.id = ?
                    union
                    select pm.user_id
                    from project_member pm
                    join sys_user u
                      on u.id = pm.user_id
                     and u.status = 'active'
                    where pm.project_id = ?
                      and pm.member_status = 'active'
                      and pm.role_code = 'project_admin'
                ) admins
                """, Long.class, projectId, projectId);
        return count == null ? 0L : count;
    }

    private String nextModuleKey(Long projectId, String name) {
        return slugify(name) + "-" + (nextSortOrder("module", "project_id", projectId) + 1);
    }

    private String nextAvailableSpaceKey(String value) {
        String base = slugify(value);
        String candidate = base;
        int suffix = 2;
        while (spaceKeyExists(candidate)) {
            candidate = base + "-" + suffix;
            suffix++;
        }
        return candidate;
    }

    private String nextGroupKey(Long moduleId, String name) {
        return slugify(name) + "-" + (nextSortOrder("api_group", "module_id", moduleId) + 1);
    }

    private boolean spaceKeyExists(String spaceKey) {
        Integer matched = jdbcTemplate.queryForObject("""
                select count(*)
                from space
                where space_key = ?
                """, Integer.class, spaceKey);
        return matched != null && matched > 0;
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

    private static List<String> deserializeStringList(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return OBJECT_MAPPER.readValue(json, new TypeReference<List<String>>() {
            });
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to parse string list JSON", exception);
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

    private String serializeStringList(List<String> items) {
        try {
            return OBJECT_MAPPER.writeValueAsString(items == null ? List.of() : items);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize string list JSON", exception);
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

    public record DictionaryGroupReference(Long id, Long projectId) {
    }

    public record DictionaryItemReference(Long id, Long groupId, Long projectId) {
    }

    public record ErrorCodeReference(Long id, Long projectId) {
    }

    public record ProjectWebhookReference(Long id, Long projectId, String name) {
    }

    public record ProjectResourcePermissionReference(
            Long id,
            Long projectId,
            String resourceType,
            Long resourceId,
            Long userId,
            String permissionLevel
    ) {
    }

    public record ProjectWebhookSecretRecord(
            Long id,
            Long projectId,
            String name,
            String targetUrl,
            String secretToken,
            List<String> eventTypes,
            boolean enabled
    ) {
    }

    public record ModuleVersionTagRecord(
            Long id,
            Long moduleId,
            String tagName,
            String description,
            String snapshotJson,
            Instant createdAt
    ) {
    }

    public record GroupReference(Long id, Long moduleId, Long projectId) {
    }

    public record ProjectPushTarget(Long projectId, Long ownerId, String projectName, boolean enabled, String token) {
    }
}
