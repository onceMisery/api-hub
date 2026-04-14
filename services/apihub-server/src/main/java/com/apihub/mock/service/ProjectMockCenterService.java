package com.apihub.mock.service;

import com.apihub.doc.model.ResponseDetail;
import com.apihub.doc.repository.EndpointRepository;
import com.apihub.mock.model.MockDtos.MockReleaseDetail;
import com.apihub.mock.model.MockDtos.MockRuleDetail;
import com.apihub.mock.model.MockDtos.MockRuleUpsertItem;
import com.apihub.mock.model.MockDtos.MockSimulationResponseItem;
import com.apihub.mock.model.ProjectMockDtos.MockAccessMode;
import com.apihub.mock.model.ProjectMockDtos.MockAccessSettings;
import com.apihub.mock.model.ProjectMockDtos.MockCenterItem;
import com.apihub.mock.model.ProjectMockDtos.ProjectMockCenterResponse;
import com.apihub.mock.model.ProjectMockDtos.UpdateProjectMockAccessRequest;
import com.apihub.mock.repository.ProjectMockAccessRepository;
import com.apihub.project.model.ProjectDtos.ProjectDetail;
import com.apihub.project.repository.ProjectRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class ProjectMockCenterService {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final ProjectRepository projectRepository;
    private final ProjectMockAccessRepository projectMockAccessRepository;
    private final EndpointRepository endpointRepository;

    public ProjectMockCenterService(ProjectRepository projectRepository,
                                    ProjectMockAccessRepository projectMockAccessRepository,
                                    EndpointRepository endpointRepository) {
        this.projectRepository = projectRepository;
        this.projectMockAccessRepository = projectMockAccessRepository;
        this.endpointRepository = endpointRepository;
    }

    @Transactional(readOnly = true)
    public ProjectMockCenterResponse getMockCenter(Long userId, Long projectId) {
        requireProjectReadAccess(userId, projectId);
        MockAccessSettings settings = projectMockAccessRepository.findByProjectId(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        List<MockCenterItem> items = endpointRepository.listProjectMockCenterCandidates(projectId).stream()
                .map(candidate -> toMockCenterItem(candidate))
                .toList();
        return new ProjectMockCenterResponse(settings, items);
    }

    public MockAccessSettings updateMockAccess(Long userId, Long projectId, UpdateProjectMockAccessRequest request) {
        requireProjectWriteAccess(userId, projectId);
        if (request == null || request.mode() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mock access mode is required");
        }
        MockAccessSettings current = projectMockAccessRepository.findByProjectId(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        String token = request.token();
        if (Boolean.TRUE.equals(request.regenerateToken())) {
            token = UUID.randomUUID().toString().replace("-", "");
        } else if (token == null || token.isBlank()) {
            token = (current.token() == null || current.token().isBlank())
                    ? UUID.randomUUID().toString().replace("-", "")
                    : current.token();
        }
        return projectMockAccessRepository.update(projectId, request.mode(), token);
    }

    public MockReleaseDetail publishEndpoint(Long userId, Long projectId, Long endpointId) {
        requireProjectWriteAccess(userId, projectId);
        EndpointRepository.EndpointReference endpointReference = endpointRepository.findEndpointReference(endpointId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Endpoint not found"));
        if (!projectId.equals(endpointReference.projectId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Endpoint not found");
        }
        return endpointRepository.createMockRelease(
                userId,
                endpointId,
                writeResponseSnapshot(endpointRepository.listResponses(endpointId)),
                writeRuleSnapshot(endpointRepository.listMockRules(endpointId)));
    }

    private MockCenterItem toMockCenterItem(EndpointRepository.ProjectMockCenterCandidate candidate) {
        List<MockRuleDetail> rules = endpointRepository.listMockRules(candidate.endpointId());
        List<ResponseDetail> responses = endpointRepository.listResponses(candidate.endpointId());
        var latestRelease = endpointRepository.findLatestMockRelease(candidate.endpointId());
        String responseSnapshot = writeResponseSnapshot(responses);
        String ruleSnapshot = writeRuleSnapshot(rules);
        boolean draftChanged = latestRelease
                .map(release -> !responseSnapshot.equals(release.responseSnapshotJson()) || !ruleSnapshot.equals(release.rulesSnapshotJson()))
                .orElse(true);
        return new MockCenterItem(
                candidate.endpointId(),
                candidate.endpointName(),
                candidate.method(),
                candidate.path(),
                candidate.moduleName(),
                candidate.groupName(),
                candidate.mockEnabled(),
                latestRelease.map(MockReleaseDetail::releaseNo).orElse(null),
                latestRelease.map(MockReleaseDetail::createdAt).orElse(null),
                draftChanged,
                rules.size(),
                (int) rules.stream().filter(MockRuleDetail::enabled).count(),
                responses.size());
    }

    private ProjectDetail requireProjectReadAccess(Long userId, Long projectId) {
        return projectRepository.findProject(userId, projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
    }

    private ProjectDetail requireProjectWriteAccess(Long userId, Long projectId) {
        ProjectDetail project = requireProjectReadAccess(userId, projectId);
        if (!project.canWrite()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Project write access denied");
        }
        return project;
    }

    private String writeResponseSnapshot(List<ResponseDetail> responses) {
        return writeJson(responses.stream()
                .map(response -> new MockSimulationResponseItem(
                        response.httpStatusCode(),
                        response.mediaType(),
                        response.name() == null ? "" : response.name(),
                        response.dataType(),
                        response.required(),
                        response.description() == null ? "" : response.description(),
                        response.exampleValue() == null ? "" : response.exampleValue()))
                .toList());
    }

    private String writeRuleSnapshot(List<MockRuleDetail> rules) {
        return writeJson(rules.stream()
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
    }

    private String writeJson(Object value) {
        try {
            return OBJECT_MAPPER.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize mock center snapshot", exception);
        }
    }
}
