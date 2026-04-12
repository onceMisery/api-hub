package com.apihub.project.model;

import com.apihub.doc.model.EndpointDetail;

import java.util.List;

public final class ProjectDtos {

    private ProjectDtos() {
    }

    public record DebugTargetRuleEntry(String pattern, boolean allowPrivate) {
    }

    public record CreateProjectRequest(String name, String projectKey, String description, List<DebugTargetRuleEntry> debugAllowedHosts) {
    }

    public record SpaceSummary(
            Long id,
            String name,
            String spaceKey,
            String currentUserRole,
            boolean canCreateProject,
            long projectCount
    ) {
    }

    public record UpdateProjectRequest(String name, String description, List<DebugTargetRuleEntry> debugAllowedHosts) {
    }

    public record ProjectDetail(
            Long id,
            Long spaceId,
            String spaceName,
            String spaceKey,
            String name,
            String projectKey,
            String description,
            List<DebugTargetRuleEntry> debugAllowedHosts,
            String currentUserRole,
            boolean canWrite,
            boolean canManageMembers
    ) {
        public ProjectDetail(Long id, String name, String projectKey, String description, List<DebugTargetRuleEntry> debugAllowedHosts) {
            this(id, null, null, null, name, projectKey, description, debugAllowedHosts, null, false, false);
        }

        public ProjectDetail(
                Long id,
                Long spaceId,
                String spaceName,
                String spaceKey,
                String name,
                String projectKey,
                String description,
                List<DebugTargetRuleEntry> debugAllowedHosts
        ) {
            this(id, spaceId, spaceName, spaceKey, name, projectKey, description, debugAllowedHosts, null, false, false);
        }
    }

    public record ProjectMemberDetail(
            Long userId,
            String username,
            String displayName,
            String email,
            String roleCode,
            boolean owner
    ) {
    }

    public record UpsertProjectMemberRequest(String username, String roleCode) {
    }

    public record ProjectTreeResponse(List<ModuleTreeItem> modules) {
    }

    public record ModuleTreeItem(Long id, String name, List<GroupTreeItem> groups) {
    }

    public record GroupTreeItem(Long id, String name, List<EndpointTreeItem> endpoints) {
    }

    public record EndpointTreeItem(Long id, String name, String method, String path) {
    }

    public record CreateModuleRequest(String name) {
    }

    public record UpdateModuleRequest(String name) {
    }

    public record ModuleDetail(Long id, Long projectId, String name) {
    }

    public record CreateGroupRequest(String name) {
    }

    public record UpdateGroupRequest(String name) {
    }

    public record GroupDetail(Long id, Long moduleId, String name) {
    }

    public record EnvironmentEntry(String name, String value) {
    }

    public record CreateEnvironmentRequest(
            String name,
            String baseUrl,
            Boolean isDefault,
            List<EnvironmentEntry> variables,
            List<EnvironmentEntry> defaultHeaders,
            List<EnvironmentEntry> defaultQuery,
            String authMode,
            String authKey,
            String authValue,
            String debugHostMode,
            List<DebugTargetRuleEntry> debugAllowedHosts
    ) {
    }

    public record UpdateEnvironmentRequest(
            String name,
            String baseUrl,
            Boolean isDefault,
            List<EnvironmentEntry> variables,
            List<EnvironmentEntry> defaultHeaders,
            List<EnvironmentEntry> defaultQuery,
            String authMode,
            String authKey,
            String authValue,
            String debugHostMode,
            List<DebugTargetRuleEntry> debugAllowedHosts
    ) {
    }

    public record EnvironmentDetail(
            Long id,
            Long projectId,
            String name,
            String baseUrl,
            boolean isDefault,
            List<EnvironmentEntry> variables,
            List<EnvironmentEntry> defaultHeaders,
            List<EnvironmentEntry> defaultQuery,
            String authMode,
            String authKey,
            String authValue,
            String debugHostMode,
            List<DebugTargetRuleEntry> debugAllowedHosts
    ) {
    }

    public record EndpointListResponse(List<EndpointDetail> endpoints) {
    }
}
