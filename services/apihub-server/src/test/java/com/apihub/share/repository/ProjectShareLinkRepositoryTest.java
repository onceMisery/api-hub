package com.apihub.share.repository;

import com.apihub.share.model.ProjectShareDtos.ProjectShareLinkDetail;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.jdbc.Sql;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.groups.Tuple.tuple;

@JdbcTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:share-link-repository;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
@Import(ProjectShareLinkRepository.class)
@Sql(scripts = "/project-service-schema.sql")
@Sql(scripts = "/project-service-data.sql")
class ProjectShareLinkRepositoryTest {

    @Autowired
    private ProjectShareLinkRepository repository;

    @Test
    void shouldCreateListAndUpdateProjectShareLinks() {
        ProjectShareLinkDetail created = repository.create(3L, 1L, "fresh-share-code", "Partner Docs", "Share docs", true,
                Instant.parse("2099-05-01T00:00:00Z"));

        assertThat(repository.listByProjectId(1L))
                .extracting(ProjectShareLinkDetail::shareCode, ProjectShareLinkDetail::name)
                .contains(tuple("fresh-share-code", "Partner Docs"));

        ProjectShareLinkDetail updated = repository.update(1L, 1L, "Renamed Docs", "Updated description", false,
                Instant.parse("2099-06-01T00:00:00Z"));

        assertThat(created.id()).isNotNull();
        assertThat(updated.name()).isEqualTo("Renamed Docs");
        assertThat(updated.enabled()).isFalse();
        assertThat(updated.expiresAt()).isEqualTo(Instant.parse("2099-06-01T00:00:00Z"));
    }

    @Test
    void shouldResolveOnlyEnabledAndUnexpiredShareCodes() {
        assertThat(repository.findActiveByShareCode("active-share-code")).isPresent();
        assertThat(repository.findActiveByShareCode("disabled-share-code")).isEmpty();
        assertThat(repository.findActiveByShareCode("expired-share-code")).isEmpty();
    }
}
