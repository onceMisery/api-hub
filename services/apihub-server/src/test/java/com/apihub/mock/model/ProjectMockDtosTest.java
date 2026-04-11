package com.apihub.mock.model;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ProjectMockDtosTest {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Test
    void shouldSerializeAndDeserializeMockAccessModeAsLowercaseJson() throws Exception {
        String serialized = OBJECT_MAPPER.writeValueAsString(ProjectMockDtos.MockAccessMode.PUBLIC);
        ProjectMockDtos.UpdateProjectMockAccessRequest request = OBJECT_MAPPER.readValue(
                """
                {"mode":"token","token":"mock-token"}
                """,
                ProjectMockDtos.UpdateProjectMockAccessRequest.class);

        assertThat(serialized).isEqualTo("\"public\"");
        assertThat(request.mode()).isEqualTo(ProjectMockDtos.MockAccessMode.TOKEN);
    }
}
