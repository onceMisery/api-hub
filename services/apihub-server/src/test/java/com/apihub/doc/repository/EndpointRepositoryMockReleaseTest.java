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
}
