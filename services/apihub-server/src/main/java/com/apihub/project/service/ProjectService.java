package com.apihub.project.service;

import com.apihub.doc.model.DocDtos.CreateEndpointRequest;
import com.apihub.doc.model.DocDtos.CreateVersionRequest;
import com.apihub.doc.model.DocDtos.UpdateEndpointRequest;
import com.apihub.doc.model.EndpointDetail;
import com.apihub.doc.model.VersionDetail;
import com.apihub.project.model.ProjectDtos.CreateGroupRequest;
import com.apihub.project.model.ProjectDtos.CreateModuleRequest;
import com.apihub.project.model.ProjectDtos.CreateProjectRequest;
import com.apihub.project.model.ProjectDtos.EndpointTreeItem;
import com.apihub.project.model.ProjectDtos.GroupDetail;
import com.apihub.project.model.ProjectDtos.GroupTreeItem;
import com.apihub.project.model.ProjectDtos.ModuleDetail;
import com.apihub.project.model.ProjectDtos.ModuleTreeItem;
import com.apihub.project.model.ProjectDtos.ProjectDetail;
import com.apihub.project.model.ProjectDtos.ProjectTreeResponse;
import com.apihub.project.model.ProjectDtos.UpdateProjectRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class ProjectService {

    private final AtomicLong projectIdGenerator = new AtomicLong(1);
    private final AtomicLong moduleIdGenerator = new AtomicLong(1);
    private final AtomicLong groupIdGenerator = new AtomicLong(1);
    private final AtomicLong endpointIdGenerator = new AtomicLong(1);
    private final AtomicLong versionIdGenerator = new AtomicLong(1);

    private final Map<Long, ProjectState> projects = new LinkedHashMap<>();
    private final Map<Long, ModuleState> modules = new LinkedHashMap<>();
    private final Map<Long, GroupState> groups = new LinkedHashMap<>();
    private final Map<Long, EndpointState> endpoints = new LinkedHashMap<>();
    private final Map<Long, VersionState> versions = new LinkedHashMap<>();

    public ProjectService() {
        long projectId = projectIdGenerator.getAndIncrement();
        projects.put(projectId, new ProjectState(projectId, "Default Project", "default", "Seed project"));
    }

    public ProjectDetail createProject(CreateProjectRequest request) {
        long projectId = projectIdGenerator.getAndIncrement();
        ProjectState project = new ProjectState(projectId, request.name(), request.projectKey(), request.description());
        projects.put(projectId, project);
        return toProjectDetail(project);
    }

    public List<ProjectDetail> listProjects() {
        return projects.values().stream()
                .sorted(Comparator.comparingLong(project -> project.id))
                .map(this::toProjectDetail)
                .toList();
    }

    public ProjectDetail getProject(Long projectId) {
        return toProjectDetail(requireProject(projectId));
    }

    public ProjectDetail updateProject(Long projectId, UpdateProjectRequest request) {
        ProjectState project = requireProject(projectId);
        if (request.name() != null) {
            project.name = request.name();
        }
        if (request.description() != null) {
            project.description = request.description();
        }
        return toProjectDetail(project);
    }

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

    public List<ModuleDetail> listModules(Long projectId) {
        requireProject(projectId);
        return modules.values().stream()
                .filter(module -> module.projectId.equals(projectId))
                .sorted(Comparator.comparingLong(module -> module.id))
                .map(this::toModuleDetail)
                .toList();
    }

    public ModuleDetail createModule(Long projectId, CreateModuleRequest request) {
        requireProject(projectId);
        long moduleId = moduleIdGenerator.getAndIncrement();
        ModuleState module = new ModuleState(moduleId, projectId, request.name());
        modules.put(moduleId, module);
        return toModuleDetail(module);
    }

    public List<GroupDetail> listGroups(Long moduleId) {
        requireModule(moduleId);
        return groups.values().stream()
                .filter(group -> group.moduleId.equals(moduleId))
                .sorted(Comparator.comparingLong(group -> group.id))
                .map(this::toGroupDetail)
                .toList();
    }

    public GroupDetail createGroup(Long moduleId, CreateGroupRequest request) {
        requireModule(moduleId);
        long groupId = groupIdGenerator.getAndIncrement();
        GroupState group = new GroupState(groupId, moduleId, request.name());
        groups.put(groupId, group);
        return toGroupDetail(group);
    }

    public List<EndpointDetail> listEndpoints(Long groupId) {
        requireGroup(groupId);
        return endpoints.values().stream()
                .filter(endpoint -> endpoint.groupId.equals(groupId))
                .sorted(Comparator.comparingLong(endpoint -> endpoint.id))
                .map(this::toEndpointDetail)
                .toList();
    }

    public EndpointDetail createEndpoint(Long groupId, CreateEndpointRequest request) {
        requireGroup(groupId);
        long endpointId = endpointIdGenerator.getAndIncrement();
        EndpointState endpoint = new EndpointState(
                endpointId,
                groupId,
                request.name(),
                request.method(),
                request.path(),
                request.description());
        endpoints.put(endpointId, endpoint);
        return toEndpointDetail(endpoint);
    }

    public EndpointDetail getEndpoint(Long endpointId) {
        return toEndpointDetail(requireEndpoint(endpointId));
    }

    public EndpointDetail updateEndpoint(Long endpointId, UpdateEndpointRequest request) {
        EndpointState endpoint = requireEndpoint(endpointId);
        if (request.name() != null) {
            endpoint.name = request.name();
        }
        if (request.method() != null) {
            endpoint.method = request.method();
        }
        if (request.path() != null) {
            endpoint.path = request.path();
        }
        if (request.description() != null) {
            endpoint.description = request.description();
        }
        return toEndpointDetail(endpoint);
    }

    public List<VersionDetail> listVersions(Long endpointId) {
        requireEndpoint(endpointId);
        return versions.values().stream()
                .filter(version -> version.endpointId.equals(endpointId))
                .sorted(Comparator.comparingLong(version -> version.id))
                .map(this::toVersionDetail)
                .toList();
    }

    public VersionDetail createVersion(Long endpointId, CreateVersionRequest request) {
        requireEndpoint(endpointId);
        long versionId = versionIdGenerator.getAndIncrement();
        VersionState version = new VersionState(
                versionId,
                endpointId,
                request.version(),
                request.changeSummary(),
                request.snapshotJson());
        versions.put(versionId, version);
        return toVersionDetail(version);
    }

    private ProjectState requireProject(Long projectId) {
        ProjectState project = projects.get(projectId);
        if (project == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found");
        }
        return project;
    }

    private ModuleState requireModule(Long moduleId) {
        ModuleState module = modules.get(moduleId);
        if (module == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Module not found");
        }
        return module;
    }

    private GroupState requireGroup(Long groupId) {
        GroupState group = groups.get(groupId);
        if (group == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found");
        }
        return group;
    }

    private EndpointState requireEndpoint(Long endpointId) {
        EndpointState endpoint = endpoints.get(endpointId);
        if (endpoint == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Endpoint not found");
        }
        return endpoint;
    }

    private ProjectDetail toProjectDetail(ProjectState project) {
        return new ProjectDetail(project.id, project.name, project.projectKey, project.description);
    }

    private ModuleDetail toModuleDetail(ModuleState module) {
        return new ModuleDetail(module.id, module.projectId, module.name);
    }

    private GroupDetail toGroupDetail(GroupState group) {
        return new GroupDetail(group.id, group.moduleId, group.name);
    }

    private EndpointDetail toEndpointDetail(EndpointState endpoint) {
        return new EndpointDetail(
                endpoint.id,
                endpoint.groupId,
                endpoint.name,
                endpoint.method,
                endpoint.path,
                endpoint.description);
    }

    private VersionDetail toVersionDetail(VersionState version) {
        return new VersionDetail(
                version.id,
                version.endpointId,
                version.version,
                version.changeSummary,
                version.snapshotJson);
    }

    private static final class ProjectState {
        private final Long id;
        private String name;
        private final String projectKey;
        private String description;

        private ProjectState(Long id, String name, String projectKey, String description) {
            this.id = id;
            this.name = name;
            this.projectKey = projectKey;
            this.description = description;
        }
    }

    private static final class ModuleState {
        private final Long id;
        private final Long projectId;
        private final String name;

        private ModuleState(Long id, Long projectId, String name) {
            this.id = id;
            this.projectId = projectId;
            this.name = name;
        }
    }

    private static final class GroupState {
        private final Long id;
        private final Long moduleId;
        private final String name;

        private GroupState(Long id, Long moduleId, String name) {
            this.id = id;
            this.moduleId = moduleId;
            this.name = name;
        }
    }

    private static final class EndpointState {
        private final Long id;
        private final Long groupId;
        private String name;
        private String method;
        private String path;
        private String description;

        private EndpointState(Long id, Long groupId, String name, String method, String path, String description) {
            this.id = id;
            this.groupId = groupId;
            this.name = name;
            this.method = method;
            this.path = path;
            this.description = description;
        }
    }

    private static final class VersionState {
        private final Long id;
        private final Long endpointId;
        private final String version;
        private final String changeSummary;
        private final String snapshotJson;

        private VersionState(Long id, Long endpointId, String version, String changeSummary, String snapshotJson) {
            this.id = id;
            this.endpointId = endpointId;
            this.version = version;
            this.changeSummary = changeSummary;
            this.snapshotJson = snapshotJson;
        }
    }
}
