package com.apihub.project.service;

import com.apihub.auth.repository.AuthUserRepository;
import com.apihub.doc.model.DocDtos.CreateEndpointRequest;
import com.apihub.doc.model.DocDtos.CreateVersionRequest;
import com.apihub.doc.model.DocDtos.ParameterUpsertItem;
import com.apihub.doc.model.DocDtos.ResponseUpsertItem;
import com.apihub.doc.model.DocDtos.UpdateEndpointRequest;
import com.apihub.debug.service.DebugTargetRuleValidator;
import com.apihub.doc.model.EndpointDetail;
import com.apihub.doc.model.ParameterDetail;
import com.apihub.doc.model.ResponseDetail;
import com.apihub.doc.model.VersionComparisonResult;
import com.apihub.doc.model.VersionDetail;
import com.apihub.ai.service.AiRagService;
import com.apihub.doc.repository.EndpointRepository;
import com.apihub.doc.service.VersionComparisonService;
import com.apihub.mock.model.MockDtos.MockReleaseDetail;
import com.apihub.mock.model.MockDtos.MockSimulationRequest;
import com.apihub.mock.model.MockDtos.MockSimulationResponseItem;
import com.apihub.mock.model.MockDtos.MockSimulationResult;
import com.apihub.mock.model.MockDtos.MockRuleDetail;
import com.apihub.mock.model.MockDtos.MockRuleUpsertItem;
import com.apihub.mock.service.MockRuntimeResolver;
import com.apihub.project.model.ProjectDtos.CreateGroupRequest;
import com.apihub.project.model.ProjectDtos.CreateDictionaryGroupRequest;
import com.apihub.project.model.ProjectDtos.CreateDictionaryItemRequest;
import com.apihub.project.model.ProjectDtos.CreateModuleRequest;
import com.apihub.project.model.ProjectDtos.CreateErrorCodeRequest;
import com.apihub.project.model.ProjectDtos.CreateProjectWebhookRequest;
import com.apihub.project.model.ProjectDtos.CreateProjectRequest;
import com.apihub.project.model.ProjectDtos.CreateSpaceRequest;
import com.apihub.project.model.ProjectDtos.AuditLogDetail;
import com.apihub.project.model.ProjectDtos.CreateEnvironmentRequest;
import com.apihub.project.model.ProjectDtos.DebugTargetRuleEntry;
import com.apihub.project.model.ProjectDtos.DictionaryGroupDetail;
import com.apihub.project.model.ProjectDtos.DictionaryImportResult;
import com.apihub.project.model.ProjectDtos.DictionaryItemDetail;
import com.apihub.project.model.ProjectDtos.EnvironmentDetail;
import com.apihub.project.model.ProjectDtos.EndpointTreeItem;
import com.apihub.project.model.ProjectDtos.ErrorCodeDetail;
import com.apihub.project.model.ProjectDtos.ErrorCodeImportResult;
import com.apihub.project.model.ProjectDtos.GroupDetail;
import com.apihub.project.model.ProjectDtos.GroupTreeItem;
import com.apihub.project.model.ProjectDtos.ImportDictionaryRequest;
import com.apihub.project.model.ProjectDtos.ImportErrorCodeRequest;
import com.apihub.project.model.ProjectDtos.CreateModuleVersionTagRequest;
import com.apihub.project.model.ProjectDtos.ModuleDetail;
import com.apihub.project.model.ProjectDtos.ModuleTreeItem;
import com.apihub.project.model.ProjectDtos.ModuleVersionTagDetail;
import com.apihub.project.model.ProjectDtos.ModuleVersionTagEndpointSnapshot;
import com.apihub.project.model.ProjectDtos.ProjectDetail;
import com.apihub.project.model.ProjectDtos.ProjectDocPushSettings;
import com.apihub.project.model.ProjectDtos.ProjectMemberDetail;
import com.apihub.project.model.ProjectDtos.ProjectResourcePermissionDetail;
import com.apihub.project.model.ProjectDtos.ProjectWebhookDetail;
import com.apihub.project.model.ProjectDtos.SpaceSummary;
import com.apihub.project.model.ProjectDtos.ProjectTreeResponse;
import com.apihub.project.model.ProjectDtos.UpsertProjectMemberRequest;
import com.apihub.project.model.ProjectDtos.UpsertProjectResourcePermissionRequest;
import com.apihub.project.model.ProjectDtos.UpdateProjectDocPushRequest;
import com.apihub.project.model.ProjectDtos.UpdateDictionaryGroupRequest;
import com.apihub.project.model.ProjectDtos.UpdateDictionaryItemRequest;
import com.apihub.project.model.ProjectDtos.UpdateEnvironmentRequest;
import com.apihub.project.model.ProjectDtos.UpdateErrorCodeRequest;
import com.apihub.project.model.ProjectDtos.UpdateGroupRequest;
import com.apihub.project.model.ProjectDtos.UpdateModuleRequest;
import com.apihub.project.model.ProjectDtos.UpdateProjectWebhookRequest;
import com.apihub.project.model.ProjectDtos.UpdateProjectRequest;
import com.apihub.project.model.ProjectDtos.WebhookDeliveryDetail;
import com.apihub.project.repository.ProjectRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@Transactional
public class ProjectService {

    private static final long LEGACY_FALLBACK_SPACE_ID = 1L;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper().registerModule(new JavaTimeModule());

    private final ProjectRepository projectRepository;
    private final EndpointRepository endpointRepository;
    private final MockRuntimeResolver mockRuntimeResolver;
    private final AiRagService aiRagService;
    private final DebugTargetRuleValidator debugTargetRuleValidator;
    private final AuthUserRepository authUserRepository;
    private final VersionComparisonService versionComparisonService;
    private final ProjectWebhookNotifier projectWebhookNotifier;

    public ProjectService(ProjectRepository projectRepository,
                          EndpointRepository endpointRepository,
                          MockRuntimeResolver mockRuntimeResolver,
                          AiRagService aiRagService,
                          DebugTargetRuleValidator debugTargetRuleValidator,
                          AuthUserRepository authUserRepository,
                          VersionComparisonService versionComparisonService,
                          ProjectWebhookNotifier projectWebhookNotifier) {
        this.projectRepository = projectRepository;
        this.endpointRepository = endpointRepository;
        this.mockRuntimeResolver = mockRuntimeResolver;
        this.aiRagService = aiRagService;
        this.debugTargetRuleValidator = debugTargetRuleValidator;
        this.authUserRepository = authUserRepository;
        this.versionComparisonService = versionComparisonService;
        this.projectWebhookNotifier = projectWebhookNotifier;
    }

    @Transactional(readOnly = true)
    public List<ProjectDetail> listProjects() {
        return listProjects(1L);
    }

    @Transactional(readOnly = true)
    public List<ProjectDetail> listProjects(Long userId) {
        return listProjects(userId, null);
    }

    @Transactional(readOnly = true)
    public List<ProjectDetail> listProjects(Long userId, Long spaceId) {
        if (spaceId != null) {
            requireSpaceVisible(userId, spaceId);
        }
        return projectRepository.listProjects(userId, spaceId);
    }

    @Transactional(readOnly = true)
    public List<SpaceSummary> listSpaces(Long userId) {
        return projectRepository.listSpaces(userId);
    }

    public SpaceSummary createSpace(Long userId, CreateSpaceRequest request) {
        validateSpaceRequest(request);
        return projectRepository.createSpace(userId, request);
    }

    public ProjectDetail createProject(CreateProjectRequest request) {
        return createProject(1L, null, request);
    }

    public ProjectDetail createProject(Long userId, CreateProjectRequest request) {
        Long targetSpaceId = projectRepository.listSpaces(userId).stream()
                .filter(SpaceSummary::canCreateProject)
                .map(SpaceSummary::id)
                .findFirst()
                .orElse(LEGACY_FALLBACK_SPACE_ID);
        debugTargetRuleValidator.validateRules(request.debugAllowedHosts());
        return projectRepository.createProject(userId, targetSpaceId, request);
    }

    public ProjectDetail createProject(Long userId, Long spaceId, CreateProjectRequest request) {
        Long targetSpaceId = resolveTargetSpaceId(userId, spaceId);
        debugTargetRuleValidator.validateRules(request.debugAllowedHosts());
        ProjectDetail created = projectRepository.createProject(userId, targetSpaceId, request);
        recordAudit(created.id(), userId, "project.create", "project", created.id(), created.name(), Map.of(
                "projectKey", created.projectKey(),
                "spaceId", created.spaceId() == null ? 0L : created.spaceId()));
        return created;
    }

    @Transactional(readOnly = true)
    public ProjectDetail getProject(Long projectId) {
        return getProject(1L, projectId);
    }

    @Transactional(readOnly = true)
    public ProjectDetail getProject(Long userId, Long projectId) {
        return requireProjectReadAccess(userId, projectId);
    }

    public ProjectDetail updateProject(Long projectId, UpdateProjectRequest request) {
        return updateProject(1L, projectId, request);
    }

    public ProjectDetail updateProject(Long userId, Long projectId, UpdateProjectRequest request) {
        ProjectDetail current = requireProjectWriteAccess(userId, projectId);
        List<DebugTargetRuleEntry> debugAllowedHosts = request.debugAllowedHosts() != null
                ? request.debugAllowedHosts()
                : current.debugAllowedHosts();
        debugTargetRuleValidator.validateRules(debugAllowedHosts);
        ProjectDetail updated = projectRepository.updateProject(
                userId,
                projectId,
                request.name() != null ? request.name() : current.name(),
                request.description() != null ? request.description() : current.description(),
                debugAllowedHosts);
        recordAudit(projectId, userId, "project.update", "project", updated.id(), updated.name(), Map.of("projectKey", updated.projectKey()));
        return updated;
    }

    @Transactional(readOnly = true)
    public ProjectDocPushSettings getProjectDocPushSettings(Long userId, Long projectId) {
        requireProjectWriteAccess(userId, projectId);
        return projectRepository.findProjectDocPushSettings(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
    }

    public ProjectDocPushSettings updateProjectDocPushSettings(Long userId, Long projectId, UpdateProjectDocPushRequest request) {
        requireProjectWriteAccess(userId, projectId);
        boolean enabled = request != null && request.enabled() != null ? request.enabled() : true;
        return projectRepository.updateProjectDocPushEnabled(projectId, enabled);
    }

    public ProjectDocPushSettings regenerateProjectDocPushToken(Long userId, Long projectId) {
        requireProjectWriteAccess(userId, projectId);
        return projectRepository.regenerateProjectDocPushToken(projectId);
    }

    @Transactional(readOnly = true)
    public ProjectTreeResponse getProjectTree(Long projectId) {
        return getProjectTree(1L, projectId);
    }

    @Transactional(readOnly = true)
    public ProjectTreeResponse getProjectTree(Long userId, Long projectId) {
        requireProjectReadAccess(userId, projectId);
        return new ProjectTreeResponse(listModules(userId, projectId).stream()
                .map(module -> new ModuleTreeItem(
                        module.id(),
                        module.name(),
                        listGroups(userId, module.id()).stream()
                                .map(group -> new GroupTreeItem(
                                        group.id(),
                                        group.name(),
                                        listEndpoints(userId, group.id()).stream()
                                                .map(endpoint -> new EndpointTreeItem(
                                                        endpoint.id(),
                                                        endpoint.name(),
                                                        endpoint.method(),
                                                        endpoint.path()))
                                                .toList()))
                                .toList()))
                .toList());
    }

    @Transactional(readOnly = true)
    public List<ModuleDetail> listModules(Long projectId) {
        return listModules(1L, projectId);
    }

    @Transactional(readOnly = true)
    public List<ModuleDetail> listModules(Long userId, Long projectId) {
        requireProjectReadAccess(userId, projectId);
        return projectRepository.listModules(userId, projectId);
    }

    public ModuleDetail createModule(Long projectId, CreateModuleRequest request) {
        return createModule(1L, projectId, request);
    }

    public ModuleDetail createModule(Long userId, Long projectId, CreateModuleRequest request) {
        requireProjectWriteAccess(userId, projectId);
        ModuleDetail created = projectRepository.createModule(userId, projectId, request);
        recordAudit(projectId, userId, "module.create", "module", created.id(), created.name(), Map.of());
        return created;
    }

    public ModuleDetail updateModule(Long moduleId, UpdateModuleRequest request) {
        return updateModule(1L, moduleId, request);
    }

    public ModuleDetail updateModule(Long userId, Long moduleId, UpdateModuleRequest request) {
        ProjectRepository.ModuleReference module = requireModuleWriteAccess(userId, moduleId);
        ModuleDetail updated = projectRepository.updateModule(moduleId, request);
        aiRagService.reindexModule(moduleId);
        recordAudit(module.projectId(), userId, "module.update", "module", updated.id(), updated.name(), Map.of());
        return updated;
    }

    public void deleteModule(Long moduleId) {
        deleteModule(1L, moduleId);
    }

    public void deleteModule(Long userId, Long moduleId) {
        ProjectRepository.ModuleReference module = requireModuleWriteAccess(userId, moduleId);
        aiRagService.deleteModuleIndex(moduleId);
        projectRepository.deleteModule(moduleId);
        recordAudit(module.projectId(), userId, "module.delete", "module", moduleId, "module#" + moduleId, Map.of());
    }

    @Transactional(readOnly = true)
    public List<ModuleVersionTagDetail> listModuleVersionTags(Long userId, Long moduleId) {
        requireModuleReadAccess(userId, moduleId);
        return projectRepository.listModuleVersionTags(moduleId).stream()
                .map(this::toModuleVersionTagDetail)
                .toList();
    }

    public ModuleVersionTagDetail createModuleVersionTag(Long userId, Long moduleId, CreateModuleVersionTagRequest request) {
        requireModuleWriteAccess(userId, moduleId);
        if (request == null || request.tagName() == null || request.tagName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Module version tag name is required");
        }

        List<ModuleVersionTagEndpointSnapshot> snapshots = projectRepository.listModuleEndpointReleaseSnapshots(moduleId).stream()
                .sorted(Comparator.comparing(ModuleVersionTagEndpointSnapshot::path).thenComparing(ModuleVersionTagEndpointSnapshot::method))
                .toList();
        String snapshotJson = writeJson(snapshots);
        ProjectRepository.ModuleVersionTagRecord record = projectRepository.createModuleVersionTag(
                userId,
                moduleId,
                request.tagName().trim(),
                request.description() == null ? "" : request.description().trim(),
                snapshotJson);
        ModuleVersionTagDetail detail = toModuleVersionTagDetail(record);
        ProjectRepository.ModuleReference module = projectRepository.findModuleReference(moduleId).orElseThrow();
        recordAudit(module.projectId(), userId, "module.tag.create", "module_version_tag", detail.id(), detail.tagName(), Map.of(
                "moduleId", moduleId,
                "endpointCount", detail.endpointCount()));
        return detail;
    }

    @Transactional(readOnly = true)
    public List<GroupDetail> listGroups(Long moduleId) {
        return listGroups(1L, moduleId);
    }

    @Transactional(readOnly = true)
    public List<GroupDetail> listGroups(Long userId, Long moduleId) {
        requireModuleReadAccess(userId, moduleId);
        return projectRepository.listGroups(userId, moduleId);
    }

    public GroupDetail createGroup(Long moduleId, CreateGroupRequest request) {
        return createGroup(1L, moduleId, request);
    }

    public GroupDetail createGroup(Long userId, Long moduleId, CreateGroupRequest request) {
        ProjectRepository.ModuleReference module = requireModuleWriteAccess(userId, moduleId);
        GroupDetail created = projectRepository.createGroup(userId, moduleId, request);
        recordAudit(module.projectId(), userId, "group.create", "group", created.id(), created.name(), Map.of("moduleId", moduleId));
        return created;
    }

    public GroupDetail updateGroup(Long groupId, UpdateGroupRequest request) {
        return updateGroup(1L, groupId, request);
    }

    public GroupDetail updateGroup(Long userId, Long groupId, UpdateGroupRequest request) {
        ProjectRepository.GroupReference group = requireGroupWriteAccess(userId, groupId);
        GroupDetail updated = projectRepository.updateGroup(groupId, request);
        aiRagService.reindexGroup(groupId);
        recordAudit(group.projectId(), userId, "group.update", "group", updated.id(), updated.name(), Map.of("moduleId", group.moduleId()));
        return updated;
    }

    public void deleteGroup(Long groupId) {
        deleteGroup(1L, groupId);
    }

    public void deleteGroup(Long userId, Long groupId) {
        ProjectRepository.GroupReference group = requireGroupWriteAccess(userId, groupId);
        aiRagService.deleteGroupIndex(groupId);
        projectRepository.deleteGroup(groupId);
        recordAudit(group.projectId(), userId, "group.delete", "group", groupId, "group#" + groupId, Map.of("moduleId", group.moduleId()));
    }

    @Transactional(readOnly = true)
    public List<EnvironmentDetail> listEnvironments(Long projectId) {
        return listEnvironments(1L, projectId);
    }

    @Transactional(readOnly = true)
    public List<EnvironmentDetail> listEnvironments(Long userId, Long projectId) {
        requireProjectReadAccess(userId, projectId);
        return projectRepository.listEnvironments(projectId);
    }

    public EnvironmentDetail createEnvironment(Long projectId, CreateEnvironmentRequest request) {
        return createEnvironment(1L, projectId, request);
    }

    public EnvironmentDetail createEnvironment(Long userId, Long projectId, CreateEnvironmentRequest request) {
        requireProjectWriteAccess(userId, projectId);
        debugTargetRuleValidator.validateRules(request.debugAllowedHosts());
        debugTargetRuleValidator.validateEnvironmentMode(request.debugHostMode());
        validateEnvironmentAuthMode(request.authMode());
        EnvironmentDetail created = projectRepository.createEnvironment(userId, projectId, request);
        recordAudit(projectId, userId, "environment.create", "environment", created.id(), created.name(), Map.of("baseUrl", created.baseUrl()));
        return created;
    }

    public EnvironmentDetail updateEnvironment(Long environmentId, UpdateEnvironmentRequest request) {
        return updateEnvironment(1L, environmentId, request);
    }

    public EnvironmentDetail updateEnvironment(Long userId, Long environmentId, UpdateEnvironmentRequest request) {
        EnvironmentDetail current = requireEnvironmentWriteAccess(userId, environmentId);
        debugTargetRuleValidator.validateRules(request.debugAllowedHosts() != null ? request.debugAllowedHosts() : current.debugAllowedHosts());
        debugTargetRuleValidator.validateEnvironmentMode(request.debugHostMode() != null ? request.debugHostMode() : current.debugHostMode());
        validateEnvironmentAuthMode(request.authMode() != null ? request.authMode() : current.authMode());
        EnvironmentDetail updated = projectRepository.updateEnvironment(environmentId, request);
        recordAudit(updated.projectId(), userId, "environment.update", "environment", updated.id(), updated.name(), Map.of("baseUrl", updated.baseUrl()));
        return updated;
    }

    private void validateEnvironmentAuthMode(String authMode) {
        String normalized = authMode == null ? "none" : authMode.trim().toLowerCase();
        if (!List.of("none", "bearer", "api_key_header", "api_key_query", "basic").contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported environment auth mode");
        }
    }

    private String normalizeNullableText(String value) {
        return value == null ? "" : value.trim();
    }

    public void deleteEnvironment(Long environmentId) {
        deleteEnvironment(1L, environmentId);
    }

    public void deleteEnvironment(Long userId, Long environmentId) {
        EnvironmentDetail environment = requireEnvironmentWriteAccess(userId, environmentId);
        projectRepository.deleteEnvironment(environmentId);
        recordAudit(environment.projectId(), userId, "environment.delete", "environment", environmentId, environment.name(), Map.of());
    }

    @Transactional(readOnly = true)
    public List<DictionaryGroupDetail> listDictionaryGroups(Long userId, Long projectId) {
        requireProjectReadAccess(userId, projectId);
        return projectRepository.listDictionaryGroups(projectId);
    }

    public DictionaryGroupDetail createDictionaryGroup(Long userId, Long projectId, CreateDictionaryGroupRequest request) {
        requireProjectWriteAccess(userId, projectId);
        if (request == null || request.name() == null || request.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dictionary group name is required");
        }
        DictionaryGroupDetail created = projectRepository.createDictionaryGroup(userId, projectId, request);
        recordAudit(projectId, userId, "dictionary.group.create", "dictionary_group", created.id(), created.name(), Map.of());
        return created;
    }

    public DictionaryImportResult importDictionaryGroups(Long userId, Long projectId, ImportDictionaryRequest request) {
        requireProjectWriteAccess(userId, projectId);
        if (request == null || request.groups() == null || request.groups().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dictionary import groups are required");
        }

        int createdGroups = 0;
        int updatedGroups = 0;
        int createdItems = 0;
        int updatedItems = 0;

        for (var groupPayload : request.groups()) {
            if (groupPayload == null || groupPayload.name() == null || groupPayload.name().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dictionary group name is required");
            }

            String groupName = groupPayload.name().trim();
            DictionaryGroupDetail existingGroup = projectRepository.findDictionaryGroupByProjectAndName(projectId, groupName).orElse(null);
            DictionaryGroupDetail targetGroup;
            if (existingGroup == null) {
                targetGroup = projectRepository.createDictionaryGroup(userId, projectId, new CreateDictionaryGroupRequest(
                        groupName,
                        normalizeNullableText(groupPayload.description())));
                createdGroups++;
            } else {
                targetGroup = projectRepository.updateDictionaryGroup(existingGroup.id(), new UpdateDictionaryGroupRequest(
                        groupName,
                        normalizeNullableText(groupPayload.description())));
                updatedGroups++;
            }

            if (groupPayload.items() == null || groupPayload.items().isEmpty()) {
                continue;
            }

            for (var itemPayload : groupPayload.items()) {
                if (itemPayload == null || itemPayload.code() == null || itemPayload.code().isBlank()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dictionary item code is required");
                }
                if (itemPayload.value() == null || itemPayload.value().isBlank()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dictionary item value is required");
                }

                String code = itemPayload.code().trim();
                DictionaryItemDetail existingItem = projectRepository.findDictionaryItemByGroupAndCode(targetGroup.id(), code).orElse(null);
                if (existingItem == null) {
                    projectRepository.createDictionaryItem(userId, targetGroup.id(), new CreateDictionaryItemRequest(
                            code,
                            itemPayload.value().trim(),
                            normalizeNullableText(itemPayload.description()),
                            itemPayload.sortOrder() == null ? 0 : itemPayload.sortOrder()));
                    createdItems++;
                } else {
                    projectRepository.updateDictionaryItem(existingItem.id(), new UpdateDictionaryItemRequest(
                            code,
                            itemPayload.value().trim(),
                            normalizeNullableText(itemPayload.description()),
                            itemPayload.sortOrder() == null ? existingItem.sortOrder() : itemPayload.sortOrder()));
                    updatedItems++;
                }
            }
        }

        return new DictionaryImportResult(createdGroups, updatedGroups, createdItems, updatedItems);
    }

    public DictionaryGroupDetail updateDictionaryGroup(Long userId, Long groupId, UpdateDictionaryGroupRequest request) {
        ProjectRepository.DictionaryGroupReference group = projectRepository.findDictionaryGroupReference(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dictionary group not found"));
        requireProjectWriteAccess(userId, group.projectId());
        DictionaryGroupDetail updated = projectRepository.updateDictionaryGroup(groupId, request);
        recordAudit(group.projectId(), userId, "dictionary.group.update", "dictionary_group", updated.id(), updated.name(), Map.of());
        return updated;
    }

    public void deleteDictionaryGroup(Long userId, Long groupId) {
        ProjectRepository.DictionaryGroupReference group = projectRepository.findDictionaryGroupReference(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dictionary group not found"));
        requireProjectWriteAccess(userId, group.projectId());
        projectRepository.deleteDictionaryGroup(groupId);
        recordAudit(group.projectId(), userId, "dictionary.group.delete", "dictionary_group", groupId, "dictionary_group#" + groupId, Map.of());
    }

    @Transactional(readOnly = true)
    public List<DictionaryItemDetail> listDictionaryItems(Long userId, Long groupId) {
        ProjectRepository.DictionaryGroupReference group = projectRepository.findDictionaryGroupReference(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dictionary group not found"));
        requireProjectReadAccess(userId, group.projectId());
        return projectRepository.listDictionaryItems(groupId);
    }

    public DictionaryItemDetail createDictionaryItem(Long userId, Long groupId, CreateDictionaryItemRequest request) {
        ProjectRepository.DictionaryGroupReference group = projectRepository.findDictionaryGroupReference(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dictionary group not found"));
        requireProjectWriteAccess(userId, group.projectId());
        if (request == null || request.code() == null || request.code().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dictionary item code is required");
        }
        DictionaryItemDetail created = projectRepository.createDictionaryItem(userId, groupId, request);
        recordAudit(group.projectId(), userId, "dictionary.item.create", "dictionary_item", created.id(), created.code(), Map.of("groupId", groupId));
        return created;
    }

    public DictionaryItemDetail updateDictionaryItem(Long userId, Long itemId, UpdateDictionaryItemRequest request) {
        ProjectRepository.DictionaryItemReference item = projectRepository.findDictionaryItemReference(itemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dictionary item not found"));
        requireProjectWriteAccess(userId, item.projectId());
        DictionaryItemDetail updated = projectRepository.updateDictionaryItem(itemId, request);
        recordAudit(item.projectId(), userId, "dictionary.item.update", "dictionary_item", updated.id(), updated.code(), Map.of("groupId", item.groupId()));
        return updated;
    }

    public void deleteDictionaryItem(Long userId, Long itemId) {
        ProjectRepository.DictionaryItemReference item = projectRepository.findDictionaryItemReference(itemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dictionary item not found"));
        requireProjectWriteAccess(userId, item.projectId());
        projectRepository.deleteDictionaryItem(itemId);
        recordAudit(item.projectId(), userId, "dictionary.item.delete", "dictionary_item", itemId, "dictionary_item#" + itemId, Map.of("groupId", item.groupId()));
    }

    @Transactional(readOnly = true)
    public List<ErrorCodeDetail> listErrorCodes(Long userId, Long projectId) {
        requireProjectReadAccess(userId, projectId);
        return projectRepository.listErrorCodes(projectId);
    }

    public ErrorCodeDetail createErrorCode(Long userId, Long projectId, CreateErrorCodeRequest request) {
        requireProjectWriteAccess(userId, projectId);
        if (request == null || request.code() == null || request.code().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Error code is required");
        }
        ErrorCodeDetail created = projectRepository.createErrorCode(userId, projectId, request);
        recordAudit(projectId, userId, "error_code.create", "error_code", created.id(), created.code(), Map.of("name", created.name()));
        return created;
    }

    public ErrorCodeImportResult importErrorCodes(Long userId, Long projectId, ImportErrorCodeRequest request) {
        requireProjectWriteAccess(userId, projectId);
        if (request == null || request.items() == null || request.items().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Error code import items are required");
        }

        int createdCount = 0;
        int updatedCount = 0;
        for (var payload : request.items()) {
            if (payload == null || payload.code() == null || payload.code().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Error code is required");
            }
            if (payload.name() == null || payload.name().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Error code name is required");
            }

            String code = payload.code().trim();
            ErrorCodeDetail existing = projectRepository.findErrorCodeByProjectAndCode(projectId, code).orElse(null);
            if (existing == null) {
                projectRepository.createErrorCode(userId, projectId, new CreateErrorCodeRequest(
                        code,
                        payload.name().trim(),
                        normalizeNullableText(payload.description()),
                        normalizeNullableText(payload.solution()),
                        payload.httpStatus()));
                createdCount++;
            } else {
                projectRepository.updateErrorCode(existing.id(), new UpdateErrorCodeRequest(
                        code,
                        payload.name().trim(),
                        normalizeNullableText(payload.description()),
                        normalizeNullableText(payload.solution()),
                        payload.httpStatus()));
                updatedCount++;
            }
        }

        return new ErrorCodeImportResult(createdCount, updatedCount);
    }

    public ErrorCodeDetail updateErrorCode(Long userId, Long errorCodeId, UpdateErrorCodeRequest request) {
        ProjectRepository.ErrorCodeReference errorCode = projectRepository.findErrorCodeReference(errorCodeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Error code not found"));
        requireProjectWriteAccess(userId, errorCode.projectId());
        ErrorCodeDetail updated = projectRepository.updateErrorCode(errorCodeId, request);
        recordAudit(errorCode.projectId(), userId, "error_code.update", "error_code", updated.id(), updated.code(), Map.of("name", updated.name()));
        return updated;
    }

    public void deleteErrorCode(Long userId, Long errorCodeId) {
        ProjectRepository.ErrorCodeReference errorCode = projectRepository.findErrorCodeReference(errorCodeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Error code not found"));
        requireProjectWriteAccess(userId, errorCode.projectId());
        projectRepository.deleteErrorCode(errorCodeId);
        recordAudit(errorCode.projectId(), userId, "error_code.delete", "error_code", errorCodeId, "error_code#" + errorCodeId, Map.of());
    }

    @Transactional(readOnly = true)
    public List<ProjectMemberDetail> listProjectMembers(Long projectId) {
        return listProjectMembers(1L, projectId);
    }

    @Transactional(readOnly = true)
    public List<ProjectMemberDetail> listProjectMembers(Long userId, Long projectId) {
        requireProjectReadAccess(userId, projectId);
        return projectRepository.listProjectMembers(projectId);
    }

    public ProjectMemberDetail saveProjectMember(Long projectId, UpsertProjectMemberRequest request) {
        return saveProjectMember(1L, projectId, request);
    }

    public ProjectMemberDetail saveProjectMember(Long userId, Long projectId, UpsertProjectMemberRequest request) {
        requireProjectMemberAdminAccess(userId, projectId);
        validateProjectMemberRequest(request);

        ProjectMemberDetail targetMember = projectRepository.listProjectMembers(projectId).stream()
                .filter(member -> member.username().equals(request.username()))
                .findFirst()
                .orElseGet(() -> authUserRepository.findActiveByUsername(request.username())
                        .map(user -> new ProjectMemberDetail(
                                user.id(),
                                user.username(),
                                user.displayName(),
                                user.email(),
                                request.roleCode(),
                                false))
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "User not found")));

        if (targetMember.owner() && !"project_admin".equals(request.roleCode()) && projectRepository.countProjectAdmins(projectId) <= 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot remove the last project admin");
        }

        ProjectMemberDetail saved = projectRepository.saveProjectMember(projectId, targetMember.userId(), request);
        recordAudit(projectId, userId, "project.member.upsert", "project_member", saved.userId(), saved.username(), Map.of("roleCode", saved.roleCode()));
        return saved;
    }

    public void deleteProjectMember(Long projectId, Long memberUserId) {
        deleteProjectMember(1L, projectId, memberUserId);
    }

    public void deleteProjectMember(Long userId, Long projectId, Long memberUserId) {
        requireProjectMemberAdminAccess(userId, projectId);
        ProjectMemberDetail member = projectRepository.findProjectMember(projectId, memberUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project member not found"));
        if ("project_admin".equals(member.roleCode()) && projectRepository.countProjectAdmins(projectId) <= 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot remove the last project admin");
        }
        projectRepository.deleteProjectMember(projectId, memberUserId);
        recordAudit(projectId, userId, "project.member.delete", "project_member", member.userId(), member.username(), Map.of("roleCode", member.roleCode()));
    }

    @Transactional(readOnly = true)
    public List<ProjectResourcePermissionDetail> listProjectResourcePermissions(Long userId, Long projectId) {
        requireProjectMemberAdminAccess(userId, projectId);
        return projectRepository.listProjectResourcePermissions(projectId);
    }

    public ProjectResourcePermissionDetail saveProjectResourcePermission(Long userId,
                                                                         Long projectId,
                                                                         UpsertProjectResourcePermissionRequest request) {
        requireProjectMemberAdminAccess(userId, projectId);
        ProjectResourcePermissionRequest normalized = normalizeProjectResourcePermissionRequest(projectId, request);
        ProjectResourcePermissionDetail saved = projectRepository.saveProjectResourcePermission(
                userId,
                projectId,
                normalized.targetUserId(),
                normalized.resourceType(),
                normalized.resourceId(),
                normalized.permissionLevel());
        recordAudit(projectId, userId, "project.permission.upsert", "project_resource_permission", saved.id(), saved.username(), Map.of(
                "resourceType", saved.resourceType(),
                "resourceId", saved.resourceId(),
                "permissionLevel", saved.permissionLevel()));
        return saved;
    }

    public void deleteProjectResourcePermission(Long userId, Long projectId, Long permissionId) {
        requireProjectMemberAdminAccess(userId, projectId);
        ProjectRepository.ProjectResourcePermissionReference reference = projectRepository.findProjectResourcePermissionReference(permissionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Resource permission not found"));
        if (!projectId.equals(reference.projectId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Resource permission not found");
        }
        projectRepository.deleteProjectResourcePermission(permissionId);
        recordAudit(projectId, userId, "project.permission.delete", "project_resource_permission", permissionId, reference.username(), Map.of(
                "resourceType", reference.resourceType(),
                "resourceId", reference.resourceId(),
                "permissionLevel", reference.permissionLevel()));
    }

    @Transactional(readOnly = true)
    public List<EndpointDetail> listEndpoints(Long groupId) {
        return listEndpoints(1L, groupId);
    }

    @Transactional(readOnly = true)
    public List<EndpointDetail> listEndpoints(Long userId, Long groupId) {
        requireGroupReadAccess(userId, groupId);
        return endpointRepository.listEndpoints(groupId);
    }

    public EndpointDetail createEndpoint(Long groupId, CreateEndpointRequest request) {
        return createEndpoint(1L, groupId, request);
    }

    public EndpointDetail createEndpoint(Long userId, Long groupId, CreateEndpointRequest request) {
        ProjectRepository.GroupReference group = requireGroupWriteAccess(userId, groupId);
        EndpointDetail created = endpointRepository.createEndpoint(userId, group, request);
        aiRagService.reindexEndpoint(created.id());
        recordAudit(group.projectId(), userId, "endpoint.create", "endpoint", created.id(), created.name(), Map.of("method", created.method(), "path", created.path()));
        return created;
    }

    @Transactional(readOnly = true)
    public EndpointDetail getEndpoint(Long endpointId) {
        return getEndpoint(1L, endpointId);
    }

    @Transactional(readOnly = true)
    public EndpointDetail getEndpoint(Long userId, Long endpointId) {
        return requireEndpointReadAccess(userId, endpointId);
    }

    public EndpointDetail updateEndpoint(Long endpointId, UpdateEndpointRequest request) {
        return updateEndpoint(1L, endpointId, request);
    }

    public EndpointDetail updateEndpoint(Long userId, Long endpointId, UpdateEndpointRequest request) {
        EndpointDetail current = requireEndpointWriteAccess(userId, endpointId);
        EndpointDetail updated = endpointRepository.updateEndpoint(userId, endpointId, new UpdateEndpointRequest(
                request.name() != null ? request.name() : current.name(),
                request.method() != null ? request.method() : current.method(),
                request.path() != null ? request.path() : current.path(),
                request.description() != null ? request.description() : current.description(),
                request.mockEnabled() != null ? request.mockEnabled() : current.mockEnabled()));
        aiRagService.reindexEndpoint(updated.id());
        Long projectId = endpointRepository.findEndpointReference(endpointId).orElseThrow().projectId();
        recordAudit(projectId, userId, "endpoint.update", "endpoint", updated.id(), updated.name(), Map.of("method", updated.method(), "path", updated.path()));
        return updated;
    }

    public void deleteEndpoint(Long endpointId) {
        deleteEndpoint(1L, endpointId);
    }

    public void deleteEndpoint(Long userId, Long endpointId) {
        requireEndpointWriteAccess(userId, endpointId);
        Long projectId = endpointRepository.findEndpointReference(endpointId).orElseThrow().projectId();
        endpointRepository.deleteEndpoint(endpointId);
        aiRagService.deleteEndpointIndex(endpointId);
        recordAudit(projectId, userId, "endpoint.delete", "endpoint", endpointId, "endpoint#" + endpointId, Map.of());
    }

    @Transactional(readOnly = true)
    public List<ParameterDetail> listParameters(Long endpointId) {
        return listParameters(1L, endpointId);
    }

    @Transactional(readOnly = true)
    public List<ParameterDetail> listParameters(Long userId, Long endpointId) {
        requireEndpointReadAccess(userId, endpointId);
        return endpointRepository.listParameters(endpointId);
    }

    public void replaceParameters(Long endpointId, List<ParameterUpsertItem> items) {
        replaceParameters(1L, endpointId, items);
    }

    public void replaceParameters(Long userId, Long endpointId, List<ParameterUpsertItem> items) {
        requireEndpointWriteAccess(userId, endpointId);
        endpointRepository.replaceParameters(endpointId, items);
        aiRagService.reindexEndpoint(endpointId);
        recordAudit(endpointRepository.findEndpointReference(endpointId).orElseThrow().projectId(), userId, "endpoint.parameters.replace", "endpoint", endpointId, "endpoint#" + endpointId, Map.of("count", items == null ? 0 : items.size()));
    }

    @Transactional(readOnly = true)
    public List<ResponseDetail> listResponses(Long endpointId) {
        return listResponses(1L, endpointId);
    }

    @Transactional(readOnly = true)
    public List<ResponseDetail> listResponses(Long userId, Long endpointId) {
        requireEndpointReadAccess(userId, endpointId);
        return endpointRepository.listResponses(endpointId);
    }

    public void replaceResponses(Long endpointId, List<ResponseUpsertItem> items) {
        replaceResponses(1L, endpointId, items);
    }

    public void replaceResponses(Long userId, Long endpointId, List<ResponseUpsertItem> items) {
        requireEndpointWriteAccess(userId, endpointId);
        endpointRepository.replaceResponses(endpointId, items);
        aiRagService.reindexEndpoint(endpointId);
        recordAudit(endpointRepository.findEndpointReference(endpointId).orElseThrow().projectId(), userId, "endpoint.responses.replace", "endpoint", endpointId, "endpoint#" + endpointId, Map.of("count", items == null ? 0 : items.size()));
    }

    @Transactional(readOnly = true)
    public List<MockRuleDetail> listMockRules(Long endpointId) {
        return listMockRules(1L, endpointId);
    }

    @Transactional(readOnly = true)
    public List<MockRuleDetail> listMockRules(Long userId, Long endpointId) {
        requireEndpointReadAccess(userId, endpointId);
        return endpointRepository.listMockRules(endpointId);
    }

    public void replaceMockRules(Long endpointId, List<MockRuleUpsertItem> items) {
        replaceMockRules(1L, endpointId, items);
    }

    public void replaceMockRules(Long userId, Long endpointId, List<MockRuleUpsertItem> items) {
        requireEndpointWriteAccess(userId, endpointId);
        endpointRepository.replaceMockRules(userId, endpointId, items);
    }

    @Transactional(readOnly = true)
    public List<MockReleaseDetail> listMockReleases(Long endpointId) {
        return listMockReleases(1L, endpointId);
    }

    @Transactional(readOnly = true)
    public List<MockReleaseDetail> listMockReleases(Long userId, Long endpointId) {
        requireEndpointReadAccess(userId, endpointId);
        return endpointRepository.listMockReleases(endpointId);
    }

    public MockReleaseDetail publishMockRelease(Long endpointId) {
        return publishMockRelease(1L, endpointId);
    }

    public MockReleaseDetail publishMockRelease(Long userId, Long endpointId) {
        requireEndpointWriteAccess(userId, endpointId);
        EndpointRepository.EndpointReference endpointReference = endpointRepository.findEndpointReference(endpointId).orElseThrow();
        EndpointDetail endpoint = endpointRepository.findEndpoint(endpointId).orElseThrow();

        String responseSnapshotJson = writeJson(endpointRepository.listResponses(endpointId).stream()
                .map(response -> new MockSimulationResponseItem(
                        response.httpStatusCode(),
                        response.mediaType(),
                        response.name() == null ? "" : response.name(),
                        response.dataType(),
                        response.required(),
                        response.description() == null ? "" : response.description(),
                        response.exampleValue() == null ? "" : response.exampleValue()))
                .toList());

        String rulesSnapshotJson = writeJson(endpointRepository.listMockRules(endpointId).stream()
                .map(rule -> new MockRuleUpsertItem(
                        rule.ruleName(),
                        rule.priority(),
                        rule.enabled(),
                        rule.queryConditions(),
                        rule.headerConditions(),
                        rule.bodyConditions(),
                        rule.statusCode(),
                        rule.mediaType(),
                        rule.body(),
                        rule.delayMs(),
                        rule.templateMode()))
                .toList());

        MockReleaseDetail release = endpointRepository.createMockRelease(userId, endpointId, responseSnapshotJson, rulesSnapshotJson);
        recordAudit(endpointReference.projectId(), userId, "mock.release.publish", "endpoint", endpointId, endpoint.name(), Map.of("releaseId", release.id(), "releaseNo", release.releaseNo()));
        projectWebhookNotifier.dispatchProjectEvent(
                endpointReference.projectId(),
                ProjectWebhookNotifier.EVENT_MOCK_RELEASED,
                userId,
                "endpoint",
                endpointId,
                endpoint.name(),
                Map.of(
                        "releaseId", release.id(),
                        "releaseNo", release.releaseNo(),
                        "endpointId", endpointId,
                        "endpointName", endpoint.name(),
                        "method", endpoint.method(),
                        "path", endpoint.path()));
        return release;
    }

    public MockSimulationResult simulateMock(Long endpointId, MockSimulationRequest request) {
        return simulateMock(1L, endpointId, request);
    }

    public MockSimulationResult simulateMock(Long userId, Long endpointId, MockSimulationRequest request) {
        requireEndpointReadAccess(userId, endpointId);
        return mockRuntimeResolver.resolveDraft(new MockSimulationRequest(
                request.draftRules() == null ? List.of() : request.draftRules().stream()
                        .map(rule -> new MockRuleUpsertItem(
                                rule.ruleName(),
                                rule.priority(),
                                rule.enabled(),
                                rule.queryConditions(),
                                rule.headerConditions(),
                                rule.bodyConditions(),
                                rule.statusCode(),
                                rule.mediaType(),
                                rule.body(),
                                Math.max(rule.delayMs(), 0),
                                rule.templateMode()))
                        .toList(),
                request.draftResponses(),
                request.querySamples(),
                request.headerSamples(),
                request.bodySample()));
    }

    @Transactional(readOnly = true)
    public List<VersionDetail> listVersions(Long endpointId) {
        return listVersions(1L, endpointId);
    }

    @Transactional(readOnly = true)
    public List<VersionDetail> listVersions(Long userId, Long endpointId) {
        requireEndpointReadAccess(userId, endpointId);
        return endpointRepository.listVersions(endpointId);
    }

    public VersionDetail createVersion(Long endpointId, CreateVersionRequest request) {
        return createVersion(1L, endpointId, request);
    }

    public VersionDetail createVersion(Long userId, Long endpointId, CreateVersionRequest request) {
        requireEndpointWriteAccess(userId, endpointId);
        VersionDetail created = endpointRepository.createVersion(userId, endpointId, request);
        recordAudit(endpointRepository.findEndpointReference(endpointId).orElseThrow().projectId(), userId, "version.create", "version", created.id(), created.version(), Map.of("endpointId", endpointId));
        return created;
    }

    public EndpointDetail releaseVersion(Long endpointId, Long versionId) {
        return releaseVersion(1L, endpointId, versionId);
    }

    public EndpointDetail releaseVersion(Long userId, Long endpointId, Long versionId) {
        requireEndpointWriteAccess(userId, endpointId);
        EndpointRepository.EndpointReference endpointReference = endpointRepository.findEndpointReference(endpointId).orElseThrow();
        VersionDetail version = endpointRepository.findVersion(versionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Version not found"));
        if (!endpointId.equals(version.endpointId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Version not found");
        }
        EndpointDetail released = endpointRepository.releaseVersion(userId, endpointId, versionId);
        recordAudit(endpointReference.projectId(), userId, "version.release", "version", versionId, version.version(), Map.of("endpointId", endpointId));
        projectWebhookNotifier.dispatchProjectEvent(
                endpointReference.projectId(),
                ProjectWebhookNotifier.EVENT_VERSION_RELEASED,
                userId,
                "version",
                versionId,
                version.version(),
                Map.of(
                        "endpointId", endpointId,
                        "endpointName", released.name(),
                        "method", released.method(),
                        "path", released.path(),
                        "versionId", versionId,
                        "versionLabel", version.version(),
                        "releasedAt", released.releasedAt() == null ? "" : released.releasedAt().toString()));
        return released;
    }

    public EndpointDetail clearEndpointRelease(Long endpointId) {
        return clearEndpointRelease(1L, endpointId);
    }

    public EndpointDetail clearEndpointRelease(Long userId, Long endpointId) {
        requireEndpointWriteAccess(userId, endpointId);
        EndpointDetail cleared = endpointRepository.clearReleasedVersion(userId, endpointId);
        recordAudit(endpointRepository.findEndpointReference(endpointId).orElseThrow().projectId(), userId, "version.release.clear", "endpoint", endpointId, cleared.name(), Map.of());
        return cleared;
    }

    @Transactional(readOnly = true)
    public VersionComparisonResult compareVersions(Long userId, Long endpointId, Long baseVersionId, Long targetVersionId) {
        EndpointDetail endpoint = requireEndpointReadAccess(userId, endpointId);
        VersionDetail baseVersion = requireVersionForEndpoint(endpointId, baseVersionId);

        VersionComparisonService.SnapshotSide baseSide = new VersionComparisonService.SnapshotSide(
                baseVersion.id(),
                baseVersion.version(),
                baseVersion.changeSummary(),
                false,
                baseVersion.released(),
                baseVersion.releasedAt());

        VersionComparisonService.SnapshotSide targetSide;
        String targetSnapshotJson;
        if (targetVersionId != null) {
            VersionDetail targetVersion = requireVersionForEndpoint(endpointId, targetVersionId);
            targetSide = new VersionComparisonService.SnapshotSide(
                    targetVersion.id(),
                    targetVersion.version(),
                    targetVersion.changeSummary(),
                    false,
                    targetVersion.released(),
                    targetVersion.releasedAt());
            targetSnapshotJson = targetVersion.snapshotJson();
        } else {
            targetSide = new VersionComparisonService.SnapshotSide(
                    null,
                    "Current Draft",
                    endpoint.releasedVersionLabel() == null ? "Current editable draft" : "Compare against current editable draft",
                    true,
                    false,
                    null);
            targetSnapshotJson = versionComparisonService.buildDraftSnapshotJson(
                    endpoint,
                    endpointRepository.listParameters(endpointId),
                    endpointRepository.listResponses(endpointId));
        }

        return versionComparisonService.compareSnapshots(
                endpointId,
                baseSide,
                baseVersion.snapshotJson(),
                targetSide,
                targetSnapshotJson);
    }

    private ProjectDetail requireProjectReadAccess(Long userId, Long projectId) {
        ProjectDetail project = projectRepository.findProject(userId, projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        return project;
    }

    private VersionDetail requireVersionForEndpoint(Long endpointId, Long versionId) {
        VersionDetail version = endpointRepository.findVersion(versionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Version not found"));
        if (!endpointId.equals(version.endpointId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Version not found");
        }
        return version;
    }

    private ProjectDetail requireProjectWriteAccess(Long userId, Long projectId) {
        ProjectDetail project = requireProjectReadAccess(userId, projectId);
        if (!project.canWrite()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Project write access denied");
        }
        return project;
    }

    private ProjectDetail requireProjectMemberAdminAccess(Long userId, Long projectId) {
        ProjectDetail project = requireProjectReadAccess(userId, projectId);
        if (!project.canManageMembers()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Project member management denied");
        }
        return project;
    }

    private ProjectRepository.ProjectWebhookReference requireProjectWebhookWriteAccess(Long userId, Long webhookId) {
        ProjectRepository.ProjectWebhookReference reference = projectRepository.findProjectWebhookReference(webhookId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Webhook not found"));
        requireProjectWriteAccess(userId, reference.projectId());
        return reference;
    }

    private ProjectRepository.ModuleReference requireModuleReadAccess(Long userId, Long moduleId) {
        ProjectRepository.ModuleReference module = projectRepository.findModuleReference(moduleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Module not found"));
        requireProjectReadAccess(userId, module.projectId());
        return module;
    }

    private ProjectRepository.ModuleReference requireModuleWriteAccess(Long userId, Long moduleId) {
        ProjectRepository.ModuleReference module = requireModuleReadAccess(userId, moduleId);
        requireProjectWriteAccess(userId, module.projectId());
        return module;
    }

    private ProjectRepository.GroupReference requireGroupReadAccess(Long userId, Long groupId) {
        ProjectRepository.GroupReference group = projectRepository.findGroupReference(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));
        if (!projectRepository.canAccessGroup(userId, groupId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found");
        }
        return group;
    }

    private ProjectRepository.GroupReference requireGroupWriteAccess(Long userId, Long groupId) {
        ProjectRepository.GroupReference group = requireGroupReadAccess(userId, groupId);
        if (!projectRepository.canWriteGroup(userId, groupId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Group write access denied");
        }
        return group;
    }

    private EndpointDetail requireEndpointReadAccess(Long userId, Long endpointId) {
        EndpointRepository.EndpointReference endpointReference = endpointRepository.findEndpointReference(endpointId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Endpoint not found"));
        if (!projectRepository.canAccessGroup(userId, endpointReference.groupId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Endpoint not found");
        }
        return endpointRepository.findEndpoint(endpointId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Endpoint not found"));
    }

    private EndpointDetail requireEndpointWriteAccess(Long userId, Long endpointId) {
        EndpointDetail endpoint = requireEndpointReadAccess(userId, endpointId);
        EndpointRepository.EndpointReference endpointReference = endpointRepository.findEndpointReference(endpointId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Endpoint not found"));
        if (!projectRepository.canWriteGroup(userId, endpointReference.groupId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Endpoint write access denied");
        }
        return endpoint;
    }

    private EnvironmentDetail requireEnvironmentReadAccess(Long userId, Long environmentId) {
        EnvironmentDetail environment = projectRepository.findEnvironment(environmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Environment not found"));
        requireProjectReadAccess(userId, environment.projectId());
        return environment;
    }

    private EnvironmentDetail requireEnvironmentWriteAccess(Long userId, Long environmentId) {
        EnvironmentDetail environment = requireEnvironmentReadAccess(userId, environmentId);
        requireProjectWriteAccess(userId, environment.projectId());
        return environment;
    }

    private Long resolveTargetSpaceId(Long userId, Long requestedSpaceId) {
        if (requestedSpaceId != null) {
            SpaceSummary space = requireSpaceVisible(userId, requestedSpaceId);
            if (!space.canCreateProject()) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Space project creation denied");
            }
            return requestedSpaceId;
        }

        return projectRepository.listSpaces(userId).stream()
                .filter(SpaceSummary::canCreateProject)
                .map(SpaceSummary::id)
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "No writable space available"));
    }

    private SpaceSummary requireSpaceVisible(Long userId, Long spaceId) {
        return projectRepository.listSpaces(userId).stream()
                .filter(space -> space.id().equals(spaceId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Space not found"));
    }

    private void validateSpaceRequest(CreateSpaceRequest request) {
        if (request == null || request.name() == null || request.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Space name is required");
        }
    }

    private void validateProjectWebhookRequest(UpdateProjectWebhookRequest request) {
        if (request == null || request.name() == null || request.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Webhook name is required");
        }
        if (request.targetUrl() == null || request.targetUrl().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Webhook target URL is required");
        }
        String normalizedUrl = request.targetUrl().trim().toLowerCase();
        if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Webhook target URL must use http or https");
        }
        List<String> eventTypes = request.eventTypes() == null ? List.of() : request.eventTypes().stream()
                .filter(item -> item != null && !item.isBlank())
                .map(String::trim)
                .toList();
        if (eventTypes.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Webhook event types are required");
        }
        Set<String> supported = Set.of(
                ProjectWebhookNotifier.EVENT_VERSION_RELEASED,
                ProjectWebhookNotifier.EVENT_MOCK_RELEASED,
                ProjectWebhookNotifier.EVENT_TEST_SUITE_FAILED);
        if (eventTypes.stream().anyMatch(item -> !supported.contains(item))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported webhook event type");
        }
    }

    private String writeJson(Object value) {
        try {
            return OBJECT_MAPPER.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize mock release snapshot", exception);
        }
    }

    @Transactional(readOnly = true)
    public List<AuditLogDetail> listAuditLogs(Long userId, Long projectId, int limit) {
        requireProjectReadAccess(userId, projectId);
        return projectRepository.listAuditLogs(projectId, limit);
    }

    @Transactional(readOnly = true)
    public List<ProjectWebhookDetail> listProjectWebhooks(Long userId, Long projectId) {
        requireProjectReadAccess(userId, projectId);
        return projectRepository.listProjectWebhooks(projectId);
    }

    public ProjectWebhookDetail createProjectWebhook(Long userId, Long projectId, CreateProjectWebhookRequest request) {
        requireProjectWriteAccess(userId, projectId);
        validateProjectWebhookRequest(new UpdateProjectWebhookRequest(
                request == null ? null : request.name(),
                request == null ? null : request.targetUrl(),
                request == null ? null : request.eventTypes(),
                request == null ? null : request.secret(),
                request == null ? null : request.enabled()));
        ProjectWebhookDetail created = projectRepository.createProjectWebhook(userId, projectId, request);
        recordAudit(projectId, userId, "webhook.create", "project_webhook", created.id(), created.name(), Map.of("targetUrl", created.targetUrl()));
        return created;
    }

    public ProjectWebhookDetail updateProjectWebhook(Long userId, Long webhookId, UpdateProjectWebhookRequest request) {
        ProjectRepository.ProjectWebhookReference reference = requireProjectWebhookWriteAccess(userId, webhookId);
        validateProjectWebhookRequest(request);
        ProjectWebhookDetail updated = projectRepository.updateProjectWebhook(userId, webhookId, request);
        recordAudit(reference.projectId(), userId, "webhook.update", "project_webhook", updated.id(), updated.name(), Map.of("targetUrl", updated.targetUrl()));
        return updated;
    }

    public void deleteProjectWebhook(Long userId, Long webhookId) {
        ProjectRepository.ProjectWebhookReference reference = requireProjectWebhookWriteAccess(userId, webhookId);
        projectRepository.deleteProjectWebhook(webhookId);
        recordAudit(reference.projectId(), userId, "webhook.delete", "project_webhook", webhookId, reference.name(), Map.of());
    }

    @Transactional(readOnly = true)
    public List<WebhookDeliveryDetail> listWebhookDeliveries(Long userId, Long projectId, int limit) {
        requireProjectReadAccess(userId, projectId);
        return projectRepository.listWebhookDeliveries(projectId, limit);
    }

    public WebhookDeliveryDetail testProjectWebhook(Long userId, Long projectId, Long webhookId) {
        ProjectRepository.ProjectWebhookReference reference = requireProjectWebhookWriteAccess(userId, webhookId);
        if (!reference.projectId().equals(projectId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Webhook not found");
        }
        WebhookDeliveryDetail delivery = projectWebhookNotifier.dispatchWebhookTest(projectId, webhookId, userId);
        recordAudit(projectId, userId, "webhook.test", "project_webhook", webhookId, reference.name(), Map.of("deliveryId", delivery.id()));
        return delivery;
    }

    private void recordAudit(Long projectId,
                             Long actorUserId,
                             String actionType,
                             String resourceType,
                             Long resourceId,
                             String resourceName,
                             Map<String, Object> detail) {
        projectRepository.createAuditLog(
                projectId,
                actorUserId,
                actionType,
                resourceType,
                resourceId,
                resourceName,
                writeJson(detail));
    }

    private List<ModuleVersionTagEndpointSnapshot> readModuleVersionTagSnapshot(String snapshotJson) {
        try {
            if (snapshotJson == null || snapshotJson.isBlank()) {
                return List.of();
            }
            return OBJECT_MAPPER.readerForListOf(ModuleVersionTagEndpointSnapshot.class).readValue(snapshotJson);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to parse module version tag snapshot", exception);
        }
    }

    private ModuleVersionTagDetail toModuleVersionTagDetail(ProjectRepository.ModuleVersionTagRecord record) {
        List<ModuleVersionTagEndpointSnapshot> endpoints = readModuleVersionTagSnapshot(record.snapshotJson());
        int releasedCount = (int) endpoints.stream().filter(item -> item.releasedVersionId() != null).count();
        return new ModuleVersionTagDetail(
                record.id(),
                record.moduleId(),
                record.tagName(),
                record.description(),
                endpoints.size(),
                releasedCount,
                endpoints,
                record.createdAt());
    }

    private void validateProjectMemberRequest(UpsertProjectMemberRequest request) {
        if (request == null || request.username() == null || request.username().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Project member username is required");
        }
        if (request.roleCode() == null || request.roleCode().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Project member role is required");
        }
        if (!List.of("project_admin", "editor", "tester", "viewer").contains(request.roleCode())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported project member role");
        }
    }

    private ProjectResourcePermissionRequest normalizeProjectResourcePermissionRequest(Long projectId,
                                                                                      UpsertProjectResourcePermissionRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Resource permission request is required");
        }
        String resourceType = normalizeLowercase(request.resourceType());
        if (!Set.of("project", "group").contains(resourceType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported resource type");
        }
        String permissionLevel = normalizeLowercase(request.permissionLevel());
        if (!Set.of("preview", "manage").contains(permissionLevel)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported permission level");
        }
        String username = request.username() == null ? "" : request.username().trim();
        if (username.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username is required");
        }
        var targetUser = authUserRepository.findActiveByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "User not found"));
        Long resourceId = request.resourceId();
        if ("project".equals(resourceType)) {
            resourceId = projectId;
        } else {
            if (resourceId == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Group id is required");
            }
            ProjectRepository.GroupReference group = projectRepository.findGroupReference(resourceId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));
            if (!projectId.equals(group.projectId())) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found");
            }
        }
        return new ProjectResourcePermissionRequest(targetUser.id(), resourceType, resourceId, permissionLevel);
    }

    private String normalizeLowercase(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private record ProjectResourcePermissionRequest(
            Long targetUserId,
            String resourceType,
            Long resourceId,
            String permissionLevel
    ) {
    }
}
