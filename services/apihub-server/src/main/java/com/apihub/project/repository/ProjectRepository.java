package com.apihub.project.repository;

import com.apihub.project.model.ProjectDtos.CreateGroupRequest;
import com.apihub.project.model.ProjectDtos.CreateModuleRequest;
import com.apihub.project.model.ProjectDtos.CreateProjectRequest;
import com.apihub.project.model.ProjectDtos.GroupDetail;
import com.apihub.project.model.ProjectDtos.ModuleDetail;
import com.apihub.project.model.ProjectDtos.ProjectDetail;
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

    private static final RowMapper<ProjectDetail> PROJECT_ROW_MAPPER = (rs, rowNum) -> new ProjectDetail(
            rs.getLong("id"),
            rs.getString("name"),
            rs.getString("project_key"),
            rs.getString("description"));

    private static final RowMapper<ModuleDetail> MODULE_ROW_MAPPER = (rs, rowNum) -> new ModuleDetail(
            rs.getLong("id"),
            rs.getLong("project_id"),
            rs.getString("name"));

    private static final RowMapper<GroupDetail> GROUP_ROW_MAPPER = (rs, rowNum) -> new GroupDetail(
            rs.getLong("id"),
            rs.getLong("module_id"),
            rs.getString("name"));

    private final JdbcTemplate jdbcTemplate;

    public ProjectRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<ProjectDetail> listProjects() {
        return jdbcTemplate.query("""
                select id, name, project_key, description
                from project
                order by id
                """, PROJECT_ROW_MAPPER);
    }

    public Optional<ProjectDetail> findProject(Long projectId) {
        return jdbcTemplate.query("""
                select id, name, project_key, description
                from project
                where id = ?
                """, PROJECT_ROW_MAPPER, projectId).stream().findFirst();
    }

    public ProjectDetail createProject(CreateProjectRequest request) {
        GeneratedKeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    insert into project (space_id, name, project_key, description, owner_id, status)
                    values (?, ?, ?, ?, ?, 'active')
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, DEFAULT_SPACE_ID);
            statement.setString(2, request.name());
            statement.setString(3, request.projectKey());
            statement.setString(4, request.description());
            statement.setLong(5, DEFAULT_USER_ID);
            return statement;
        }, keyHolder);
        return findProject(requireGeneratedId(keyHolder)).orElseThrow();
    }

    public ProjectDetail updateProject(Long projectId, String name, String description) {
        jdbcTemplate.update("""
                update project
                set name = ?, description = ?
                where id = ?
                """, name, description, projectId);
        return findProject(projectId).orElseThrow();
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
            statement.setLong(5, DEFAULT_USER_ID);
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
            statement.setLong(5, DEFAULT_USER_ID);
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

    public record ModuleReference(Long id, Long projectId) {
    }

    public record GroupReference(Long id, Long moduleId, Long projectId) {
    }
}
