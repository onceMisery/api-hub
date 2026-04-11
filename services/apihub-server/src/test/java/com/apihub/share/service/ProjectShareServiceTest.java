package com.apihub.share.service;

import com.apihub.auth.repository.AuthUserRepository;
import com.apihub.doc.repository.EndpointRepository;
import com.apihub.project.repository.ProjectRepository;
import com.apihub.share.model.ProjectShareDtos.CreateProjectShareLinkRequest;
import com.apihub.share.model.ProjectShareDtos.UpdateProjectShareLinkRequest;
import com.apihub.share.repository.ProjectShareLinkRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@JdbcTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:share-service;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
@Import({
        ProjectShareLinkService.class,
        PublicProjectShareService.class,
        ProjectShareLinkRepository.class,
        ProjectRepository.class,
        EndpointRepository.class,
        AuthUserRepository.class
})
@Sql(scripts = "/project-service-schema.sql")
@Sql(scripts = "/project-service-data.sql")
class ProjectShareServiceTest {

    @Autowired
    private ProjectShareLinkService projectShareLinkService;

    @Autowired
    private PublicProjectShareService publicProjectShareService;

    @Test
    void shouldAllowWriterToManageShareLinksAndExposePublicShareViews() {
        var created = projectShareLinkService.createShareLink(3L, 1L, new CreateProjectShareLinkRequest(
                "External Docs",
                "Partner facing docs",
                true,
                Instant.parse("2099-06-01T00:00:00Z")));

        var links = projectShareLinkService.listShareLinks(3L, 1L);
        var overview = publicProjectShareService.getShareOverview("active-share-code");
        var detail = publicProjectShareService.getShareEndpointDetail("active-share-code", 1L);

        assertThat(created.shareCode()).isNotBlank();
        assertThat(links).extracting("name").contains("External Docs");
        assertThat(overview.project().projectKey()).isEqualTo("default");
        assertThat(overview.tree().modules()).hasSize(1);
        assertThat(detail.endpoint().id()).isEqualTo(1L);
        assertThat(detail.mockReleases()).isEmpty();
    }

    @Test
    void shouldRejectViewerManagementAndTreatDisabledOrExpiredShareAsNotFound() {
        assertThatThrownBy(() -> projectShareLinkService.listShareLinks(2L, 1L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);

        assertThatThrownBy(() -> publicProjectShareService.getShareOverview("disabled-share-code"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);

        assertThatThrownBy(() -> publicProjectShareService.getShareOverview("expired-share-code"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void shouldAllowWriterToClearShareExpiry() {
        var updated = projectShareLinkService.updateShareLink(3L, 1L, 1L, new UpdateProjectShareLinkRequest(
                null,
                null,
                null,
                null,
                true));

        assertThat(updated.expiresAt()).isNull();
    }
}
