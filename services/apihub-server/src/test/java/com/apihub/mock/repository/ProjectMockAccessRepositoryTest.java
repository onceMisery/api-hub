package com.apihub.mock.repository;

import com.apihub.mock.model.ProjectMockDtos.MockAccessMode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.jdbc.Sql;

import static org.assertj.core.api.Assertions.assertThat;

@JdbcTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:mock-access-repository;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
@Import(ProjectMockAccessRepository.class)
@Sql(scripts = "/project-service-schema.sql")
@Sql(scripts = "/project-service-data.sql")
class ProjectMockAccessRepositoryTest {

    @Autowired
    private ProjectMockAccessRepository repository;

    @Test
    void shouldReadAndUpdateProjectMockAccessSettings() {
        assertThat(repository.findByProjectId(1L)).isPresent();
        assertThat(repository.findByProjectId(1L).orElseThrow().mode()).isEqualTo(MockAccessMode.PRIVATE);

        var updated = repository.update(1L, MockAccessMode.TOKEN, "rotated-mock-token");

        assertThat(updated.mode()).isEqualTo(MockAccessMode.TOKEN);
        assertThat(updated.token()).isEqualTo("rotated-mock-token");
        assertThat(repository.findByProjectId(1L).orElseThrow().token()).isEqualTo("rotated-mock-token");
    }
}
