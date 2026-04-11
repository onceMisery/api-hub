package com.apihub.mock.service;

import com.apihub.mock.model.MockDtos.MockBodyConditionEntry;
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
                List.of(new MockConditionEntry("x-scenario", "unauthorized")),
                ""
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
                List.of(),
                ""
        ));

        assertThat(result.source()).isEqualTo("default-response");
        assertThat(result.matchedRuleName()).isNull();
        assertThat(result.matchedRulePriority()).isNull();
        assertThat(result.statusCode()).isEqualTo(200);
        assertThat(result.body()).isEqualTo("{\"userId\":\"u_1001\"}");
        assertThat(result.explanations()).contains(
                "Rule skipped: missing header x-scenario=unauthorized",
                "No rule matched; fallback to draft default response"
        );
    }

    @Test
    void shouldMatchRuleByBodyJsonPath() {
        MockSimulationResult result = resolver.resolveDraft(new MockSimulationRequest(
                List.of(new MockRuleUpsertItem(
                        "Match request body",
                        120,
                        true,
                        List.of(),
                        List.of(),
                        List.of(new MockBodyConditionEntry("$.user.id", "31")),
                        202,
                        "application/json",
                        "{\"matched\":true}"
                )),
                List.of(),
                List.of(),
                List.of(),
                "{\"user\":{\"id\":31}}"
        ));

        assertThat(result.source()).isEqualTo("rule");
        assertThat(result.matchedRuleName()).isEqualTo("Match request body");
        assertThat(result.statusCode()).isEqualTo(202);
        assertThat(result.explanations()).contains("Matched body $.user.id=31");
    }

    @Test
    void shouldBuildRuleTracesForDisabledSkippedMatchedAndNotEvaluatedRules() {
        MockSimulationResult result = resolver.resolveDraft(new MockSimulationRequest(
                List.of(
                        new MockRuleUpsertItem(
                                "Disabled rule",
                                300,
                                false,
                                List.of(new MockConditionEntry("mode", "strict")),
                                List.of(),
                                List.of(),
                                503,
                                "application/json",
                                "{\"disabled\":true}"
                        ),
                        new MockRuleUpsertItem(
                                "Skipped rule",
                                220,
                                true,
                                List.of(new MockConditionEntry("mode", "strict")),
                                List.of(new MockConditionEntry("x-scenario", "blocked")),
                                List.of(),
                                401,
                                "application/json",
                                "{\"skipped\":true}"
                        ),
                        new MockRuleUpsertItem(
                                "Matched rule",
                                120,
                                true,
                                List.of(new MockConditionEntry("mode", "strict")),
                                List.of(),
                                List.of(new MockBodyConditionEntry("$.user.id", "31")),
                                202,
                                "application/json",
                                "{\"matched\":true}"
                        ),
                        new MockRuleUpsertItem(
                                "Not evaluated rule",
                                80,
                                true,
                                List.of(),
                                List.of(),
                                List.of(),
                                200,
                                "application/json",
                                "{\"late\":true}"
                        )
                ),
                List.of(),
                List.of(new MockConditionEntry("mode", "strict")),
                List.of(),
                "{\"user\":{\"id\":31}}"
        ));

        assertThat(result.source()).isEqualTo("rule");
        assertThat(result.matchedRuleName()).isEqualTo("Matched rule");
        assertThat(result.ruleTraces()).hasSize(4);
        assertThat(result.ruleTraces())
                .extracting(trace -> trace.ruleName() + ":" + trace.status())
                .containsExactly(
                        "Disabled rule:disabled",
                        "Skipped rule:skipped",
                        "Matched rule:matched",
                        "Not evaluated rule:not_evaluated"
                );
        assertThat(result.ruleTraces().get(1).summary()).contains("missing header x-scenario=blocked");
        assertThat(result.ruleTraces().get(2).checks()).contains("Matched query mode=strict", "Matched body $.user.id=31");
        assertThat(result.ruleTraces().get(3).summary()).contains("higher-priority rule");
    }

    @Test
    void shouldBuildSkippedTracesWhenDraftFallsBackToDefaultResponse() {
        MockSimulationResult result = resolver.resolveDraft(new MockSimulationRequest(
                List.of(
                        new MockRuleUpsertItem(
                                "Strict mode",
                                120,
                                true,
                                List.of(new MockConditionEntry("mode", "strict")),
                                List.of(),
                                List.of(),
                                401,
                                "application/json",
                                "{\"strict\":true}"
                        ),
                        new MockRuleUpsertItem(
                                "Admin body rule",
                                100,
                                true,
                                List.of(),
                                List.of(),
                                List.of(new MockBodyConditionEntry("$.user.role", "admin")),
                                202,
                                "application/json",
                                "{\"admin\":true}"
                        )
                ),
                List.of(new MockSimulationResponseItem(
                        200,
                        "application/json",
                        "userId",
                        "string",
                        true,
                        "",
                        "u_1001"
                )),
                List.of(new MockConditionEntry("mode", "preview")),
                List.of(),
                "{\"user\":{\"role\":\"viewer\"}}"
        ));

        assertThat(result.source()).isEqualTo("default-response");
        assertThat(result.ruleTraces()).hasSize(2);
        assertThat(result.ruleTraces()).extracting(trace -> trace.status()).containsExactly("skipped", "skipped");
        assertThat(result.explanations()).contains("No rule matched; fallback to draft default response");
    }
}
