package com.apihub.project.model;

import com.apihub.doc.model.EndpointDetail;

import java.time.Instant;
import java.util.List;

public final class ProjectDtos {

    private ProjectDtos() {
    }

    public record DebugTargetRuleEntry(String pattern, boolean allowPrivate) {
    }

    public record CreateProjectRequest(String name, String projectKey, String description, List<DebugTargetRuleEntry> debugAllowedHosts) {
    }

    public record CreateSpaceRequest(String name, String spaceKey) {
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

    public record ProjectDocPushSettings(
            Long projectId,
            String projectName,
            boolean enabled,
            String token
    ) {
    }

    public record UpdateProjectDocPushRequest(Boolean enabled) {
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
            boolean canManageMembers,
            boolean canManageAiSettings
    ) {
        public ProjectDetail(Long id, String name, String projectKey, String description, List<DebugTargetRuleEntry> debugAllowedHosts) {
            this(id, null, null, null, name, projectKey, description, debugAllowedHosts, null, false, false, false);
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
            this(id, spaceId, spaceName, spaceKey, name, projectKey, description, debugAllowedHosts, null, false, false, false);
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

    public record ProjectResourcePermissionDetail(
            Long id,
            Long projectId,
            String resourceType,
            Long resourceId,
            String resourceName,
            Long userId,
            String username,
            String displayName,
            String email,
            String permissionLevel,
            Instant createdAt
    ) {
    }

    public record UpsertProjectResourcePermissionRequest(
            String resourceType,
            Long resourceId,
            String username,
            String permissionLevel
    ) {
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

    public record CreateModuleVersionTagRequest(String tagName, String description) {
    }

    public record ModuleVersionTagEndpointSnapshot(
            Long endpointId,
            String endpointName,
            String method,
            String path,
            String groupName,
            Long releasedVersionId,
            String releasedVersionLabel,
            Instant releasedAt
    ) {
    }

    public record ModuleVersionTagDetail(
            Long id,
            Long moduleId,
            String tagName,
            String description,
            int endpointCount,
            int releasedEndpointCount,
            List<ModuleVersionTagEndpointSnapshot> endpoints,
            Instant createdAt
    ) {
    }

    public record DictionaryGroupDetail(
            Long id,
            Long projectId,
            String name,
            String description,
            int itemCount
    ) {
    }

    public record CreateDictionaryGroupRequest(String name, String description) {
    }

    public record UpdateDictionaryGroupRequest(String name, String description) {
    }

    public record ImportDictionaryItemPayload(
            String code,
            String value,
            String description,
            Integer sortOrder
    ) {
    }

    public record ImportDictionaryGroupPayload(
            String name,
            String description,
            List<ImportDictionaryItemPayload> items
    ) {
    }

    public record ImportDictionaryRequest(List<ImportDictionaryGroupPayload> groups) {
    }

    public record DictionaryImportResult(
            int createdGroups,
            int updatedGroups,
            int createdItems,
            int updatedItems
    ) {
    }

    public record DictionaryItemDetail(
            Long id,
            Long groupId,
            String code,
            String value,
            String description,
            int sortOrder
    ) {
    }

    public record CreateDictionaryItemRequest(String code, String value, String description, Integer sortOrder) {
    }

    public record UpdateDictionaryItemRequest(String code, String value, String description, Integer sortOrder) {
    }

    public record ErrorCodeDetail(
            Long id,
            Long projectId,
            String code,
            String name,
            String description,
            String solution,
            Integer httpStatus
    ) {
    }

    public record CreateErrorCodeRequest(
            String code,
            String name,
            String description,
            String solution,
            Integer httpStatus
    ) {
    }

    public record UpdateErrorCodeRequest(
            String code,
            String name,
            String description,
            String solution,
            Integer httpStatus
    ) {
    }

    public record ImportErrorCodeItemPayload(
            String code,
            String name,
            String description,
            String solution,
            Integer httpStatus
    ) {
    }

    public record ImportErrorCodeRequest(List<ImportErrorCodeItemPayload> items) {
    }

    public record ErrorCodeImportResult(int createdCount, int updatedCount) {
    }

    public record AuditLogDetail(
            Long id,
            Long projectId,
            Long actorUserId,
            String actorDisplayName,
            String actionType,
            String resourceType,
            Long resourceId,
            String resourceName,
            String detailJson,
            Instant createdAt
    ) {
    }

    public record ProjectWebhookDetail(
            Long id,
            Long projectId,
            String name,
            String targetUrl,
            List<String> eventTypes,
            boolean enabled,
            boolean secretConfigured,
            Instant createdAt,
            Instant updatedAt
    ) {
    }

    public record CreateProjectWebhookRequest(
            String name,
            String targetUrl,
            List<String> eventTypes,
            String secret,
            Boolean enabled
    ) {
    }

    public record UpdateProjectWebhookRequest(
            String name,
            String targetUrl,
            List<String> eventTypes,
            String secret,
            Boolean enabled
    ) {
    }

    public record WebhookDeliveryDetail(
            Long id,
            Long projectId,
            Long webhookId,
            String webhookName,
            String eventType,
            String targetUrl,
            String deliveryStatus,
            Integer responseStatus,
            long durationMs,
            String payloadJson,
            String responseBody,
            String errorMessage,
            Instant createdAt
    ) {
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
