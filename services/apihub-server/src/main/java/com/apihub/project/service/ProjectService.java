package com.apihub.project.service;

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
import com.apihub.project.model.ProjectDtos.ProjectTreeResponse;
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

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final ProjectRepository projectRepository;
    private final EndpointRepository endpointRepository;
    private final MockRuntimeResolver mockRuntimeResolver;
    private final DebugTargetRuleValidator debugTargetRuleValidator;

    public ProjectService(ProjectRepository projectRepository,
                          EndpointRepository endpointRepository,
                          MockRuntimeResolver mockRuntimeResolver,
                          DebugTargetRuleValidator debugTargetRuleValidator) {
        this.projectRepository = projectRepository;
        this.endpointRepository = endpointRepository;
        this.mockRuntimeResolver = mockRuntimeResolver;
        this.debugTargetRuleValidator = debugTargetRuleValidator;
    }

    @Transactional(readOnly = true)
    public List<ProjectDetail> listProjects() {
        return projectRepository.listProjects();
    }

    public ProjectDetail createProject(CreateProjectRequest request) {
        debugTargetRuleValidator.validateRules(request.debugAllowedHosts());
        return projectRepository.createProject(request);
    }

    @Transactional(readOnly = true)
    public ProjectDetail getProject(Long projectId) {
        return requireProject(projectId);
    }

    public ProjectDetail updateProject(Long projectId, UpdateProjectRequest request) {
        ProjectDetail current = requireProject(projectId);
        List<DebugTargetRuleEntry> debugAllowedHosts = request.debugAllowedHosts() != null
                ? request.debugAllowedHosts()
                : current.debugAllowedHosts();
        debugTargetRuleValidator.validateRules(debugAllowedHosts);
        return projectRepository.updateProject(
                projectId,
                request.name() != null ? request.name() : current.name(),
                request.description() != null ? request.description() : current.description(),
                debugAllowedHosts);
    }

    @Transactional(readOnly = true)
    public ProjectTreeResponse getProjectTree(Long projectId) {
        requireProject(projectId);
        return new ProjectTreeResponse(listModules(projectId).stream()
                .map(module -> new ModuleTreeItem(
                        module.id(),
                        module.name(),
                        listGroups(module.id()).stream()
                                .map(group -> new GroupTreeItem(
                                        group.id(),
                                        group.name(),
                                        listEndpoints(group.id()).stream()
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
        requireProject(projectId);
        return projectRepository.listModules(projectId);
    }

    public ModuleDetail createModule(Long projectId, CreateModuleRequest request) {
        requireProject(projectId);
        return projectRepository.createModule(projectId, request);
    }

    public ModuleDetail updateModule(Long moduleId, UpdateModuleRequest request) {
        requireModule(moduleId);
        return projectRepository.updateModule(moduleId, request);
    }

    public void deleteModule(Long moduleId) {
        requireModule(moduleId);
        projectRepository.deleteModule(moduleId);
    }

    @Transactional(readOnly = true)
    public List<GroupDetail> listGroups(Long moduleId) {
        requireModule(moduleId);
        return projectRepository.listGroups(moduleId);
    }

    public GroupDetail createGroup(Long moduleId, CreateGroupRequest request) {
        requireModule(moduleId);
        return projectRepository.createGroup(moduleId, request);
    }

    public GroupDetail updateGroup(Long groupId, UpdateGroupRequest request) {
        requireGroup(groupId);
        return projectRepository.updateGroup(groupId, request);
    }

    public void deleteGroup(Long groupId) {
        requireGroup(groupId);
        projectRepository.deleteGroup(groupId);
    }

    @Transactional(readOnly = true)
    public List<EnvironmentDetail> listEnvironments(Long projectId) {
        requireProject(projectId);
        return projectRepository.listEnvironments(projectId);
    }

    public EnvironmentDetail createEnvironment(Long projectId, CreateEnvironmentRequest request) {
        requireProject(projectId);
        debugTargetRuleValidator.validateRules(request.debugAllowedHosts());
        debugTargetRuleValidator.validateEnvironmentMode(request.debugHostMode());
        return projectRepository.createEnvironment(projectId, request);
    }

    public EnvironmentDetail updateEnvironment(Long environmentId, UpdateEnvironmentRequest request) {
        EnvironmentDetail current = requireEnvironment(environmentId);
        debugTargetRuleValidator.validateRules(request.debugAllowedHosts() != null ? request.debugAllowedHosts() : current.debugAllowedHosts());
        debugTargetRuleValidator.validateEnvironmentMode(request.debugHostMode() != null ? request.debugHostMode() : current.debugHostMode());
        return projectRepository.updateEnvironment(environmentId, request);
    }

    public void deleteEnvironment(Long environmentId) {
        requireEnvironment(environmentId);
        projectRepository.deleteEnvironment(environmentId);
    }

    @Transactional(readOnly = true)
    public List<EndpointDetail> listEndpoints(Long groupId) {
        requireGroup(groupId);
        return endpointRepository.listEndpoints(groupId);
    }

    public EndpointDetail createEndpoint(Long groupId, CreateEndpointRequest request) {
        return endpointRepository.createEndpoint(requireGroup(groupId), request);
    }

    @Transactional(readOnly = true)
    public EndpointDetail getEndpoint(Long endpointId) {
        return requireEndpoint(endpointId);
    }

    public EndpointDetail updateEndpoint(Long endpointId, UpdateEndpointRequest request) {
        EndpointDetail current = requireEndpoint(endpointId);
        return endpointRepository.updateEndpoint(endpointId, new UpdateEndpointRequest(
                request.name() != null ? request.name() : current.name(),
                request.method() != null ? request.method() : current.method(),
                request.path() != null ? request.path() : current.path(),
                request.description() != null ? request.description() : current.description(),
                request.mockEnabled() != null ? request.mockEnabled() : current.mockEnabled()));
    }

    public void deleteEndpoint(Long endpointId) {
        requireEndpoint(endpointId);
        endpointRepository.deleteEndpoint(endpointId);
    }

    @Transactional(readOnly = true)
    public List<ParameterDetail> listParameters(Long endpointId) {
        requireEndpoint(endpointId);
        return endpointRepository.listParameters(endpointId);
    }

    public void replaceParameters(Long endpointId, List<ParameterUpsertItem> items) {
        requireEndpoint(endpointId);
        endpointRepository.replaceParameters(endpointId, items);
    }

    @Transactional(readOnly = true)
    public List<ResponseDetail> listResponses(Long endpointId) {
        requireEndpoint(endpointId);
        return endpointRepository.listResponses(endpointId);
    }

    public void replaceResponses(Long endpointId, List<ResponseUpsertItem> items) {
        requireEndpoint(endpointId);
        endpointRepository.replaceResponses(endpointId, items);
    }

    @Transactional(readOnly = true)
    public List<MockRuleDetail> listMockRules(Long endpointId) {
        requireEndpoint(endpointId);
        return endpointRepository.listMockRules(endpointId);
    }

    public void replaceMockRules(Long endpointId, List<MockRuleUpsertItem> items) {
        requireEndpoint(endpointId);
        endpointRepository.replaceMockRules(endpointId, items);
    }

    @Transactional(readOnly = true)
    public List<MockReleaseDetail> listMockReleases(Long endpointId) {
        requireEndpoint(endpointId);
        return endpointRepository.listMockReleases(endpointId);
    }

    public MockReleaseDetail publishMockRelease(Long endpointId) {
        requireEndpoint(endpointId);

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

        return endpointRepository.createMockRelease(endpointId, responseSnapshotJson, rulesSnapshotJson);
    }

    public MockSimulationResult simulateMock(Long endpointId, MockSimulationRequest request) {
        requireEndpoint(endpointId);
        return mockRuntimeResolver.resolveDraft(request);
    }

    @Transactional(readOnly = true)
    public List<VersionDetail> listVersions(Long endpointId) {
        requireEndpoint(endpointId);
        return endpointRepository.listVersions(endpointId);
    }

    public VersionDetail createVersion(Long endpointId, CreateVersionRequest request) {
        requireEndpoint(endpointId);
        return endpointRepository.createVersion(endpointId, request);
    }

    private ProjectDetail requireProject(Long projectId) {
        return projectRepository.findProject(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
    }

    private ProjectRepository.ModuleReference requireModule(Long moduleId) {
        return projectRepository.findModuleReference(moduleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Module not found"));
    }

    private ProjectRepository.GroupReference requireGroup(Long groupId) {
        return projectRepository.findGroupReference(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));
    }

    private EndpointDetail requireEndpoint(Long endpointId) {
        return endpointRepository.findEndpoint(endpointId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Endpoint not found"));
    }

    private EnvironmentDetail requireEnvironment(Long environmentId) {
        return projectRepository.findEnvironment(environmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Environment not found"));
    }

    private String writeJson(Object value) {
        try {
            return OBJECT_MAPPER.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize mock release snapshot", exception);
        }
    }
}
