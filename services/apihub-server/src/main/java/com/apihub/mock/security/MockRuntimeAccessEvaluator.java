package com.apihub.mock.security;

import com.apihub.mock.model.ProjectMockDtos.MockAccessMode;
import com.apihub.mock.repository.ProjectMockAccessRepository;
import com.apihub.project.repository.ProjectRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component
public class MockRuntimeAccessEvaluator {

    private final ProjectMockAccessRepository projectMockAccessRepository;
    private final ProjectRepository projectRepository;

    public MockRuntimeAccessEvaluator(ProjectMockAccessRepository projectMockAccessRepository,
                                      ProjectRepository projectRepository) {
        this.projectMockAccessRepository = projectMockAccessRepository;
        this.projectRepository = projectRepository;
    }

    public boolean isAuthorized(Long projectId, Authentication authentication, String mockToken) {
        var settings = projectMockAccessRepository.findByProjectId(projectId);
        if (settings.isEmpty()) {
            return true;
        }

        return switch (settings.get().mode()) {
            case PUBLIC -> true;
            case PRIVATE -> hasProjectReadAccess(authentication, projectId);
            case TOKEN -> hasProjectReadAccess(authentication, projectId)
                    || (mockToken != null && !mockToken.isBlank() && mockToken.equals(settings.get().token()));
        };
    }

    private boolean hasProjectReadAccess(Authentication authentication, Long projectId) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return false;
        }
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof Number number)) {
            return false;
        }
        return projectRepository.canAccessProject(number.longValue(), projectId);
    }
}
