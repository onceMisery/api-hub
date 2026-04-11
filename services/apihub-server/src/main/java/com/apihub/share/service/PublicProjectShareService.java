package com.apihub.share.service;

import com.apihub.doc.repository.EndpointRepository;
import com.apihub.project.model.ProjectDtos.EndpointTreeItem;
import com.apihub.project.model.ProjectDtos.GroupTreeItem;
import com.apihub.project.model.ProjectDtos.ModuleTreeItem;
import com.apihub.project.model.ProjectDtos.ProjectTreeResponse;
import com.apihub.project.repository.ProjectRepository;
import com.apihub.share.model.ProjectShareDtos.ProjectShareLinkDetail;
import com.apihub.share.model.ProjectShareDtos.PublicShareEndpointDetailResponse;
import com.apihub.share.model.ProjectShareDtos.PublicShareOverviewResponse;
import com.apihub.share.model.ProjectShareDtos.PublicSharedProjectSummary;
import com.apihub.share.repository.ProjectShareLinkRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class PublicProjectShareService {

    private final ProjectShareLinkRepository projectShareLinkRepository;
    private final ProjectRepository projectRepository;
    private final EndpointRepository endpointRepository;

    public PublicProjectShareService(ProjectShareLinkRepository projectShareLinkRepository,
                                     ProjectRepository projectRepository,
                                     EndpointRepository endpointRepository) {
        this.projectShareLinkRepository = projectShareLinkRepository;
        this.projectRepository = projectRepository;
        this.endpointRepository = endpointRepository;
    }

    public PublicShareOverviewResponse getShareOverview(String shareCode) {
        ProjectShareLinkDetail share = requireActiveShare(shareCode);
        var project = projectRepository.findProject(share.projectId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Share not found"));
        ProjectTreeResponse tree = new ProjectTreeResponse(projectRepository.listModules(share.projectId()).stream()
                .map(module -> new ModuleTreeItem(
                        module.id(),
                        module.name(),
                        projectRepository.listGroups(module.id()).stream()
                                .map(group -> new GroupTreeItem(
                                        group.id(),
                                        group.name(),
                                        endpointRepository.listEndpoints(group.id()).stream()
                                                .map(endpoint -> new EndpointTreeItem(
                                                        endpoint.id(),
                                                        endpoint.name(),
                                                        endpoint.method(),
                                                        endpoint.path()))
                                                .toList()))
                                .toList()))
                .toList());
        return new PublicShareOverviewResponse(
                share,
                new PublicSharedProjectSummary(project.id(), project.name(), project.projectKey(), project.description()),
                tree);
    }

    public PublicShareEndpointDetailResponse getShareEndpointDetail(String shareCode, Long endpointId) {
        ProjectShareLinkDetail share = requireActiveShare(shareCode);
        EndpointRepository.EndpointReference endpointReference = endpointRepository.findEndpointReference(endpointId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Share not found"));
        if (!share.projectId().equals(endpointReference.projectId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Share not found");
        }
        return new PublicShareEndpointDetailResponse(
                endpointRepository.findEndpoint(endpointId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Share not found")),
                endpointRepository.listParameters(endpointId),
                endpointRepository.listResponses(endpointId),
                endpointRepository.listVersions(endpointId),
                endpointRepository.listMockReleases(endpointId));
    }

    private ProjectShareLinkDetail requireActiveShare(String shareCode) {
        return projectShareLinkRepository.findActiveByShareCode(shareCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Share not found"));
    }
}
