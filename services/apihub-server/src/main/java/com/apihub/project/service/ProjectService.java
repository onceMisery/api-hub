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
import com.apihub.doc.model.VersionDetail;
import com.apihub.doc.repository.EndpointRepository;
import com.apihub.mock.model.MockDtos.MockReleaseDetail;
import com.apihub.mock.model.MockDtos.MockSimulationRequest;
import com.apihub.mock.model.MockDtos.MockSimulationResponseItem;
import com.apihub.mock.model.MockDtos.MockSimulationResult;
import com.apihub.mock.model.MockDtos.MockRuleDetail;
import com.apihub.mock.model.MockDtos.MockRuleUpsertItem;
import com.apihub.mock.service.MockRuntimeResolver;
import com.apihub.project.model.ProjectDtos.CreateGroupRequest;
import com.apihub.project.model.ProjectDtos.CreateModuleRequest;
import com.apihub.project.model.ProjectDtos.CreateProjectRequest;
import com.apihub.project.model.ProjectDtos.CreateEnvironmentRequest;
import com.apihub.project.model.ProjectDtos.DebugTargetRuleEntry;
import com.apihub.project.model.ProjectDtos.EnvironmentDetail;
import com.apihub.project.model.ProjectDtos.EndpointTreeItem;
import com.apihub.project.model.ProjectDtos.GroupDetail;
import com.apihub.project.model.ProjectDtos.GroupTreeItem;
import com.apihub.project.model.ProjectDtos.ModuleDetail;
import com.apihub.project.model.ProjectDtos.ModuleTreeItem;
import com.apihub.project.model.ProjectDtos.ProjectDetail;
import com.apihub.project.model.ProjectDtos.ProjectMemberDetail;
import com.apihub.project.model.ProjectDtos.SpaceSummary;
import com.apihub.project.model.ProjectDtos.ProjectTreeResponse;
import com.apihub.project.model.ProjectDtos.UpsertProjectMemberRequest;
import com.apihub.project.model.ProjectDtos.UpdateEnvironmentRequest;
import com.apihub.project.model.ProjectDtos.UpdateGroupRequest;
import com.apihub.project.model.ProjectDtos.UpdateModuleRequest;
import com.apihub.project.model.ProjectDtos.UpdateProjectRequest;
import com.apihub.project.repository.ProjectRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@Transactional
public class ProjectService {

    private static final long LEGACY_FALLBACK_SPACE_ID = 1L;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final ProjectRepository projectRepository;
    private final EndpointRepository endpointRepository;
    private final MockRuntimeResolver mockRuntimeResolver;
    private final DebugTargetRuleValidator debugTargetRuleValidator;
    private final AuthUserRepository authUserRepository;

    public ProjectService(ProjectRepository projectRepository,
                          EndpointRepository endpointRepository,
                          MockRuntimeResolver mockRuntimeResolver,
                          DebugTargetRuleValidator debugTargetRuleValidator,
                          AuthUserRepository authUserRepository) {
        this.projectRepository = projectRepository;
        this.endpointRepository = endpointRepository;
        this.mockRuntimeResolver = mockRuntimeResolver;
        this.debugTargetRuleValidator = debugTargetRuleValidator;
        this.authUserRepository = authUserRepository;
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
        return projectRepository.createProject(userId, targetSpaceId, request);
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
        return projectRepository.updateProject(
                userId,
                projectId,
                request.name() != null ? request.name() : current.name(),
                request.description() != null ? request.description() : current.description(),
                debugAllowedHosts);
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
        return projectRepository.listModules(projectId);
    }

    public ModuleDetail createModule(Long projectId, CreateModuleRequest request) {
        return createModule(1L, projectId, request);
    }

    public ModuleDetail createModule(Long userId, Long projectId, CreateModuleRequest request) {
        requireProjectWriteAccess(userId, projectId);
        return projectRepository.createModule(userId, projectId, request);
    }

    public ModuleDetail updateModule(Long moduleId, UpdateModuleRequest request) {
        return updateModule(1L, moduleId, request);
    }

    public ModuleDetail updateModule(Long userId, Long moduleId, UpdateModuleRequest request) {
        requireModuleWriteAccess(userId, moduleId);
        return projectRepository.updateModule(moduleId, request);
    }

    public void deleteModule(Long moduleId) {
        deleteModule(1L, moduleId);
    }

    public void deleteModule(Long userId, Long moduleId) {
        requireModuleWriteAccess(userId, moduleId);
        projectRepository.deleteModule(moduleId);
    }

    @Transactional(readOnly = true)
    public List<GroupDetail> listGroups(Long moduleId) {
        return listGroups(1L, moduleId);
    }

    @Transactional(readOnly = true)
    public List<GroupDetail> listGroups(Long userId, Long moduleId) {
        requireModuleReadAccess(userId, moduleId);
        return projectRepository.listGroups(moduleId);
    }

    public GroupDetail createGroup(Long moduleId, CreateGroupRequest request) {
        return createGroup(1L, moduleId, request);
    }

    public GroupDetail createGroup(Long userId, Long moduleId, CreateGroupRequest request) {
        requireModuleWriteAccess(userId, moduleId);
        return projectRepository.createGroup(userId, moduleId, request);
    }

    public GroupDetail updateGroup(Long groupId, UpdateGroupRequest request) {
        return updateGroup(1L, groupId, request);
    }

    public GroupDetail updateGroup(Long userId, Long groupId, UpdateGroupRequest request) {
        requireGroupWriteAccess(userId, groupId);
        return projectRepository.updateGroup(groupId, request);
    }

    public void deleteGroup(Long groupId) {
        deleteGroup(1L, groupId);
    }

    public void deleteGroup(Long userId, Long groupId) {
        requireGroupWriteAccess(userId, groupId);
        projectRepository.deleteGroup(groupId);
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
        return projectRepository.createEnvironment(userId, projectId, request);
    }

    public EnvironmentDetail updateEnvironment(Long environmentId, UpdateEnvironmentRequest request) {
        return updateEnvironment(1L, environmentId, request);
    }

    public EnvironmentDetail updateEnvironment(Long userId, Long environmentId, UpdateEnvironmentRequest request) {
        EnvironmentDetail current = requireEnvironmentWriteAccess(userId, environmentId);
        debugTargetRuleValidator.validateRules(request.debugAllowedHosts() != null ? request.debugAllowedHosts() : current.debugAllowedHosts());
        debugTargetRuleValidator.validateEnvironmentMode(request.debugHostMode() != null ? request.debugHostMode() : current.debugHostMode());
        validateEnvironmentAuthMode(request.authMode() != null ? request.authMode() : current.authMode());
        return projectRepository.updateEnvironment(environmentId, request);
    }

    private void validateEnvironmentAuthMode(String authMode) {
        String normalized = authMode == null ? "none" : authMode.trim().toLowerCase();
        if (!List.of("none", "bearer", "api_key_header", "api_key_query", "basic").contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported environment auth mode");
        }
    }

    public void deleteEnvironment(Long environmentId) {
        deleteEnvironment(1L, environmentId);
    }

    public void deleteEnvironment(Long userId, Long environmentId) {
        requireEnvironmentWriteAccess(userId, environmentId);
        projectRepository.deleteEnvironment(environmentId);
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

        return projectRepository.saveProjectMember(projectId, targetMember.userId(), request);
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
        return endpointRepository.createEndpoint(userId, requireGroupWriteAccess(userId, groupId), request);
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
        return endpointRepository.updateEndpoint(userId, endpointId, new UpdateEndpointRequest(
                request.name() != null ? request.name() : current.name(),
                request.method() != null ? request.method() : current.method(),
                request.path() != null ? request.path() : current.path(),
                request.description() != null ? request.description() : current.description(),
                request.mockEnabled() != null ? request.mockEnabled() : current.mockEnabled()));
    }

    public void deleteEndpoint(Long endpointId) {
        deleteEndpoint(1L, endpointId);
    }

    public void deleteEndpoint(Long userId, Long endpointId) {
        requireEndpointWriteAccess(userId, endpointId);
        endpointRepository.deleteEndpoint(endpointId);
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
                        rule.body()))
                .toList());

        return endpointRepository.createMockRelease(userId, endpointId, responseSnapshotJson, rulesSnapshotJson);
    }

    public MockSimulationResult simulateMock(Long endpointId, MockSimulationRequest request) {
        return simulateMock(1L, endpointId, request);
    }

    public MockSimulationResult simulateMock(Long userId, Long endpointId, MockSimulationRequest request) {
        requireEndpointReadAccess(userId, endpointId);
        return mockRuntimeResolver.resolveDraft(request);
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
        return endpointRepository.createVersion(userId, endpointId, request);
    }

    public EndpointDetail releaseVersion(Long endpointId, Long versionId) {
        return releaseVersion(1L, endpointId, versionId);
    }

    public EndpointDetail releaseVersion(Long userId, Long endpointId, Long versionId) {
        requireEndpointWriteAccess(userId, endpointId);
        VersionDetail version = endpointRepository.findVersion(versionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Version not found"));
        if (!endpointId.equals(version.endpointId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Version not found");
        }
        return endpointRepository.releaseVersion(userId, endpointId, versionId);
    }

    public EndpointDetail clearEndpointRelease(Long endpointId) {
        return clearEndpointRelease(1L, endpointId);
    }

    public EndpointDetail clearEndpointRelease(Long userId, Long endpointId) {
        requireEndpointWriteAccess(userId, endpointId);
        return endpointRepository.clearReleasedVersion(userId, endpointId);
    }

    private ProjectDetail requireProjectReadAccess(Long userId, Long projectId) {
        ProjectDetail project = projectRepository.findProject(userId, projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        return project;
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
        requireProjectReadAccess(userId, group.projectId());
        return group;
    }

    private ProjectRepository.GroupReference requireGroupWriteAccess(Long userId, Long groupId) {
        ProjectRepository.GroupReference group = requireGroupReadAccess(userId, groupId);
        requireProjectWriteAccess(userId, group.projectId());
        return group;
    }

    private EndpointDetail requireEndpointReadAccess(Long userId, Long endpointId) {
        EndpointRepository.EndpointReference endpointReference = endpointRepository.findEndpointReference(endpointId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Endpoint not found"));
        requireProjectReadAccess(userId, endpointReference.projectId());
        return endpointRepository.findEndpoint(endpointId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Endpoint not found"));
    }

    private EndpointDetail requireEndpointWriteAccess(Long userId, Long endpointId) {
        EndpointDetail endpoint = requireEndpointReadAccess(userId, endpointId);
        EndpointRepository.EndpointReference endpointReference = endpointRepository.findEndpointReference(endpointId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Endpoint not found"));
        requireProjectWriteAccess(userId, endpointReference.projectId());
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

    private String writeJson(Object value) {
        try {
            return OBJECT_MAPPER.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize mock release snapshot", exception);
        }
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
}
