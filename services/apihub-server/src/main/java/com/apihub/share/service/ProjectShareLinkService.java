package com.apihub.share.service;

import com.apihub.project.model.ProjectDtos.ProjectDetail;
import com.apihub.project.repository.ProjectRepository;
import com.apihub.share.model.ProjectShareDtos.CreateProjectShareLinkRequest;
import com.apihub.share.model.ProjectShareDtos.ProjectShareLinkDetail;
import com.apihub.share.model.ProjectShareDtos.UpdateProjectShareLinkRequest;
import com.apihub.share.repository.ProjectShareLinkRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class ProjectShareLinkService {

    private final ProjectRepository projectRepository;
    private final ProjectShareLinkRepository projectShareLinkRepository;

    public ProjectShareLinkService(ProjectRepository projectRepository,
                                   ProjectShareLinkRepository projectShareLinkRepository) {
        this.projectRepository = projectRepository;
        this.projectShareLinkRepository = projectShareLinkRepository;
    }

    @Transactional(readOnly = true)
    public List<ProjectShareLinkDetail> listShareLinks(Long userId, Long projectId) {
        requireProjectWriteAccess(userId, projectId);
        return projectShareLinkRepository.listByProjectId(projectId);
    }

    public ProjectShareLinkDetail createShareLink(Long userId, Long projectId, CreateProjectShareLinkRequest request) {
        requireProjectWriteAccess(userId, projectId);
        validateName(request.name());
        return projectShareLinkRepository.create(
                userId,
                projectId,
                UUID.randomUUID().toString().replace("-", ""),
                request.name().trim(),
                request.description(),
                !Boolean.FALSE.equals(request.enabled()),
                request.expiresAt());
    }

    public ProjectShareLinkDetail updateShareLink(Long userId,
                                                  Long projectId,
                                                  Long shareLinkId,
                                                  UpdateProjectShareLinkRequest request) {
        requireProjectWriteAccess(userId, projectId);
        ProjectShareLinkDetail current = projectShareLinkRepository.findByProjectIdAndId(projectId, shareLinkId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Share link not found"));
        String name = request.name() != null ? request.name().trim() : current.name();
        validateName(name);
        return projectShareLinkRepository.update(
                shareLinkId,
                projectId,
                name,
                request.description() != null ? request.description() : current.description(),
                request.enabled() != null ? request.enabled() : current.enabled(),
                Boolean.TRUE.equals(request.clearExpiry())
                        ? null
                        : request.expiresAt() != null ? request.expiresAt() : current.expiresAt());
    }

    private ProjectDetail requireProjectWriteAccess(Long userId, Long projectId) {
        ProjectDetail project = projectRepository.findProject(userId, projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        if (!project.canWrite()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Project write access denied");
        }
        return project;
    }

    private void validateName(String name) {
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Share link name is required");
        }
    }
}
