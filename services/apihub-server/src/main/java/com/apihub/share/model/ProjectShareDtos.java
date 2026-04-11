package com.apihub.share.model;

import com.apihub.doc.model.EndpointDetail;
import com.apihub.doc.model.ParameterDetail;
import com.apihub.doc.model.ResponseDetail;
import com.apihub.doc.model.VersionDetail;
import com.apihub.mock.model.MockDtos.MockReleaseDetail;
import com.apihub.project.model.ProjectDtos.ProjectTreeResponse;

import java.time.Instant;
import java.util.List;

public final class ProjectShareDtos {

    private ProjectShareDtos() {
    }

    public record ProjectShareLinkDetail(
            Long id,
            Long projectId,
            String shareCode,
            String name,
            String description,
            boolean enabled,
            Instant expiresAt,
            Instant createdAt,
            Instant updatedAt
    ) {
    }

    public record CreateProjectShareLinkRequest(
            String name,
            String description,
            Boolean enabled,
            Instant expiresAt
    ) {
    }

    public record UpdateProjectShareLinkRequest(
            String name,
            String description,
            Boolean enabled,
            Instant expiresAt,
            Boolean clearExpiry
    ) {
    }

    public record PublicSharedProjectSummary(
            Long id,
            String name,
            String projectKey,
            String description
    ) {
    }

    public record PublicShareOverviewResponse(
            ProjectShareLinkDetail share,
            PublicSharedProjectSummary project,
            ProjectTreeResponse tree
    ) {
    }

    public record PublicShareEndpointDetailResponse(
            EndpointDetail endpoint,
            List<ParameterDetail> parameters,
            List<ResponseDetail> responses,
            List<VersionDetail> versions,
            List<MockReleaseDetail> mockReleases
    ) {
    }
}
