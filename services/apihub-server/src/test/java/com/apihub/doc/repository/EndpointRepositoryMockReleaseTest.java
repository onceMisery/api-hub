package com.apihub.doc.repository;

import com.apihub.mock.model.MockDtos.MockReleaseDetail;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.jdbc.Sql;

import static org.assertj.core.api.Assertions.assertThat;

@JdbcTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:endpoint-repository-mock-release;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
@Import(EndpointRepository.class)
@Sql(scripts = "/project-service-schema.sql")
@Sql(scripts = "/project-service-data.sql")
class EndpointRepositoryMockReleaseTest {

    @Autowired
    private EndpointRepository endpointRepository;

    @Test
    void shouldCreateAndListMockReleases() {
        assertThat(endpointRepository.listMockReleases(1L)).isEmpty();

        MockReleaseDetail created = endpointRepository.createMockRelease(1L, "[]", "[]");

        assertThat(created.releaseNo()).isEqualTo(1);
        assertThat(endpointRepository.findLatestMockRelease(1L)).isPresent();
        assertThat(endpointRepository.listMockReleases(1L)).hasSize(1);
    }

    @Test
    void shouldReleaseEndpointVersionAndReturnToDraftLane() {
        endpointRepository.releaseVersion(1L, 1L, 1L);

        var releasedEndpoint = endpointRepository.findEndpoint(1L).orElseThrow();
        var releasedVersion = endpointRepository.listVersions(1L).get(0);

        assertThat(releasedEndpoint.status()).isEqualTo("released");
        assertThat(releasedEndpoint.releasedVersionId()).isEqualTo(1L);
        assertThat(releasedEndpoint.releasedVersionLabel()).isEqualTo("v1");
        assertThat(releasedEndpoint.releasedAt()).isNotNull();
        assertThat(releasedVersion.released()).isTrue();
        assertThat(releasedVersion.releasedAt()).isNotNull();

        endpointRepository.clearReleasedVersion(1L, 1L);

        var draftEndpoint = endpointRepository.findEndpoint(1L).orElseThrow();
        var clearedVersion = endpointRepository.listVersions(1L).get(0);

        assertThat(draftEndpoint.status()).isEqualTo("draft");
        assertThat(draftEndpoint.releasedVersionId()).isNull();
        assertThat(draftEndpoint.releasedVersionLabel()).isNull();
        assertThat(draftEndpoint.releasedAt()).isNull();
        assertThat(clearedVersion.released()).isFalse();
        assertThat(clearedVersion.releasedAt()).isNull();
    }
}
