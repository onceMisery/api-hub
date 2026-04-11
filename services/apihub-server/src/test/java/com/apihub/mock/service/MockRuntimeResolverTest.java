package com.apihub.mock.service;

import com.apihub.mock.model.MockDtos.MockConditionEntry;
import com.apihub.mock.model.MockDtos.MockSimulationRequest;
import com.apihub.mock.model.MockDtos.MockSimulationResponseItem;
import com.apihub.mock.model.MockDtos.MockSimulationResult;
import com.apihub.mock.model.MockDtos.MockRuleUpsertItem;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class MockRuntimeResolverTest {

    private final MockRuntimeResolver resolver = new MockRuntimeResolver();

    @Test
    void shouldMatchRuleByQueryAndHeader() {
        MockSimulationResult result = resolver.resolveDraft(new MockSimulationRequest(
                List.of(new MockRuleUpsertItem(
                        "Unauthorized",
                        100,
                        true,
                        List.of(new MockConditionEntry("mode", "strict")),
                        List.of(new MockConditionEntry("x-scenario", "unauthorized")),
                        List.of(),
                        401,
                        "application/json",
                        "{\"error\":\"token expired\"}"
                )),
                List.of(new MockSimulationResponseItem(
                        200,
                        "application/json",
                        "userId",
                        "string",
                        true,
                        "",
                        "u_1001"
                )),
                List.of(new MockConditionEntry("mode", "strict")),
                List.of(new MockConditionEntry("x-scenario", "unauthorized"))
        ));

        assertThat(result.source()).isEqualTo("rule");
        assertThat(result.matchedRuleName()).isEqualTo("Unauthorized");
        assertThat(result.matchedRulePriority()).isEqualTo(100);
        assertThat(result.statusCode()).isEqualTo(401);
        assertThat(result.body()).isEqualTo("{\"error\":\"token expired\"}");
        assertThat(result.explanations()).contains("Matched query mode=strict", "Matched header x-scenario=unauthorized");
    }

    @Test
    void shouldFallbackWhenNoRuleMatched() {
        MockSimulationResult result = resolver.resolveDraft(new MockSimulationRequest(
                List.of(new MockRuleUpsertItem(
                        "Unauthorized",
                        100,
                        true,
                        List.of(),
                        List.of(new MockConditionEntry("x-scenario", "unauthorized")),
                        List.of(),
                        401,
                        "application/json",
                        "{\"error\":\"token expired\"}"
                )),
                List.of(new MockSimulationResponseItem(
                        200,
                        "application/json",
                        "userId",
                        "string",
                        true,
                        "",
                        "u_1001"
                )),
                List.of(),
                List.of()
        ));

        assertThat(result.source()).isEqualTo("default-response");
        assertThat(result.matchedRuleName()).isNull();
        assertThat(result.matchedRulePriority()).isNull();
        assertThat(result.statusCode()).isEqualTo(200);
        assertThat(result.body()).isEqualTo("{\"userId\":\"u_1001\"}");
        assertThat(result.explanations()).contains(
                "Rule Unauthorized skipped: missing header x-scenario=unauthorized",
                "No rule matched; fallback to draft default response"
        );
    }
}
