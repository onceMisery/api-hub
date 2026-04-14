package com.apihub.doc.service;

import com.apihub.doc.model.VersionComparisonResult;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class VersionComparisonServiceTest {

    private final VersionComparisonService versionComparisonService = new VersionComparisonService();

    @Test
    void shouldCompareVersionSnapshotAgainstDraftSnapshot() {
        String baseSnapshot = """
                {
                  "sourceType": "openapi",
                  "endpoint": {
                    "name": "Get User",
                    "method": "GET",
                    "path": "/users/{id}",
                    "description": "Load a user",
                    "mockEnabled": false
                  },
                  "parameters": [
                    {
                      "rowId": "p-1",
                      "sectionType": "query",
                      "name": "verbose",
                      "dataType": "boolean",
                      "required": false,
                      "description": "Verbose view",
                      "exampleValue": "false"
                    }
                  ],
                  "responses": [
                    {
                      "rowId": "r-1",
                      "httpStatusCode": 200,
                      "mediaType": "application/json",
                      "name": "id",
                      "dataType": "long",
                      "required": true,
                      "description": "User id",
                      "exampleValue": "1"
                    }
                  ]
                }
                """;
        String draftSnapshot = """
                {
                  "endpoint": {
                    "name": "Get User Detail",
                    "method": "GET",
                    "path": "/users/{id}",
                    "description": "Load a detailed user",
                    "mockEnabled": true
                  },
                  "parameters": [
                    {
                      "sectionType": "query",
                      "name": "verbose",
                      "dataType": "boolean",
                      "required": true,
                      "description": "Verbose view",
                      "exampleValue": "true"
                    },
                    {
                      "sectionType": "header",
                      "name": "x-trace-id",
                      "dataType": "string",
                      "required": false,
                      "description": "Trace id",
                      "exampleValue": "trace-1"
                    }
                  ],
                  "responses": [
                    {
                      "httpStatusCode": 200,
                      "mediaType": "application/json",
                      "name": "id",
                      "dataType": "string",
                      "required": true,
                      "description": "User id string",
                      "exampleValue": "u-1"
                    },
                    {
                      "httpStatusCode": 200,
                      "mediaType": "application/json",
                      "name": "nickname",
                      "dataType": "string",
                      "required": false,
                      "description": "Nick name",
                      "exampleValue": "neo"
                    }
                  ]
                }
                """;

        VersionComparisonResult result = versionComparisonService.compareSnapshots(
                31L,
                new VersionComparisonService.SnapshotSide(7L, "v1.0.0", "initial", false, true, Instant.parse("2026-04-12T10:00:00Z")),
                baseSnapshot,
                new VersionComparisonService.SnapshotSide(null, "Current Draft", "draft", true, false, null),
                draftSnapshot);

        assertThat(result.summary().endpointFieldsChanged()).isEqualTo(3);
        assertThat(result.summary().modifiedParameters()).isEqualTo(1);
        assertThat(result.summary().addedParameters()).isEqualTo(1);
        assertThat(result.summary().modifiedResponses()).isEqualTo(1);
        assertThat(result.summary().addedResponses()).isEqualTo(1);
        assertThat(result.endpointChanges()).extracting(VersionComparisonResult.FieldChange::field)
                .containsExactly("name", "description", "mockEnabled");
        assertThat(result.parameterChanges()).extracting(VersionComparisonResult.ParameterChange::changeType)
                .containsExactly("added", "modified");
        assertThat(result.responseChanges()).extracting(VersionComparisonResult.ResponseChange::changeType)
                .containsExactly("modified", "added");
        assertThat(result.summary().breakingChanges()).isEqualTo(2);
        assertThat(result.breakingChanges()).extracting(VersionComparisonResult.BreakingChange::title)
                .contains("请求参数要求收紧", "响应字段类型发生变化");
        assertThat(result.changelog()).isNotEmpty();
    }
}
