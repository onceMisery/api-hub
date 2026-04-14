package com.apihub.mock.service;

import com.apihub.mock.model.MockDtos.MockBodyConditionEntry;
import com.apihub.mock.model.MockDtos.MockConditionEntry;
import com.apihub.mock.model.MockDtos.MockRuleTraceItem;
import com.apihub.mock.model.MockDtos.MockSimulationRequest;
import com.apihub.mock.model.MockDtos.MockSimulationResponseItem;
import com.apihub.mock.model.MockDtos.MockSimulationResult;
import com.apihub.mock.model.MockDtos.MockRuleUpsertItem;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.MissingNode;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class MockRuntimeResolver {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private final MockTemplateRenderer mockTemplateRenderer;

    public MockRuntimeResolver() {
        this(new MockTemplateRenderer());
    }

    public MockRuntimeResolver(MockTemplateRenderer mockTemplateRenderer) {
        this.mockTemplateRenderer = mockTemplateRenderer;
    }

    public MockSimulationResult resolveDraft(MockSimulationRequest request) {
        Map<String, String> querySamples = toMap(request.querySamples(), false);
        Map<String, String> headerSamples = toMap(request.headerSamples(), true);
        JsonNode bodyNode = readBodyNode(request.bodySample());
        List<MockRuleUpsertItem> sortedRules = sortRules(request.draftRules());
        List<MockRuleTraceItem> ruleTraces = new ArrayList<>();
        MatchOutcome winner = null;

        for (MockRuleUpsertItem rule : sortedRules) {
            if (!rule.enabled()) {
                ruleTraces.add(new MockRuleTraceItem(
                        normalizeRuleName(rule.ruleName()),
                        rule.priority(),
                        "disabled",
                        List.of(),
                        "Rule is disabled and skipped from draft runtime."
                ));
                continue;
            }

            if (winner != null) {
                ruleTraces.add(new MockRuleTraceItem(
                        normalizeRuleName(rule.ruleName()),
                        rule.priority(),
                        "not_evaluated",
                        List.of(),
                        "Rule not evaluated because a higher-priority rule already matched."
                ));
                continue;
            }

            RuleEvaluationResult evaluationResult = evaluateRule(rule, querySamples, headerSamples, bodyNode);
            if (evaluationResult.matched()) {
                winner = new MatchOutcome(rule, evaluationResult.matchedChecks());
                ruleTraces.add(new MockRuleTraceItem(
                        normalizeRuleName(rule.ruleName()),
                        rule.priority(),
                        "matched",
                        evaluationResult.matchedChecks(),
                        "Rule matched and produced the simulated response."
                ));
                continue;
            }

            ruleTraces.add(new MockRuleTraceItem(
                    normalizeRuleName(rule.ruleName()),
                    rule.priority(),
                    "skipped",
                    evaluationResult.matchedChecks(),
                    evaluationResult.summary()
            ));
        }

        if (winner != null) {
            return new MockSimulationResult(
                    "rule",
                    winner.rule().ruleName(),
                    winner.rule().priority(),
                    winner.explanations().isEmpty()
                            ? List.of("Rule " + normalizeRuleName(winner.rule().ruleName()) + " matched without extra conditions")
                            : winner.explanations(),
                    List.copyOf(ruleTraces),
                    winner.rule().statusCode(),
                    normalizeMediaType(winner.rule().mediaType()),
                    renderRuleBody(winner.rule()),
                    normalizeDelayMs(winner.rule().delayMs())
            );
        }

        List<String> explanations = buildFallbackExplanations(ruleTraces);
        ResponseGroup responseGroup = selectResponseGroup(request.draftResponses());
        return new MockSimulationResult(
                "default-response",
                null,
                null,
                explanations,
                List.copyOf(ruleTraces),
                responseGroup.statusCode(),
                responseGroup.mediaType(),
                buildJsonBody(responseGroup.responses()),
                0
        );
    }

    private RuleEvaluationResult evaluateRule(MockRuleUpsertItem rule,
                                              Map<String, String> querySamples,
                                              Map<String, String> headerSamples,
                                              JsonNode bodyNode) {
        List<String> matchedChecks = new ArrayList<>();

        for (MockConditionEntry condition : safeConditions(rule.queryConditions())) {
            String requestValue = querySamples.get(condition.name());
            if (!condition.value().equals(requestValue)) {
                return new RuleEvaluationResult(
                        false,
                        List.copyOf(matchedChecks),
                        "Rule skipped: missing query " + condition.name() + "=" + condition.value()
                );
            }
            matchedChecks.add("Matched query " + condition.name() + "=" + condition.value());
        }

        for (MockConditionEntry condition : safeConditions(rule.headerConditions())) {
            String requestValue = headerSamples.get(condition.name().toLowerCase(Locale.ROOT));
            if (!condition.value().equals(requestValue)) {
                return new RuleEvaluationResult(
                        false,
                        List.copyOf(matchedChecks),
                        "Rule skipped: missing header " + condition.name() + "=" + condition.value()
                );
            }
            matchedChecks.add("Matched header " + condition.name() + "=" + condition.value());
        }

        for (MockBodyConditionEntry condition : safeBodyConditions(rule.bodyConditions())) {
            String requestValue = resolveJsonPath(bodyNode, condition.jsonPath());
            if (!normalizeBodyValue(condition.expectedValue()).equals(requestValue)) {
                return new RuleEvaluationResult(
                        false,
                        List.copyOf(matchedChecks),
                        "Rule skipped: missing body " + condition.jsonPath() + "=" + condition.expectedValue()
                );
            }
            matchedChecks.add("Matched body " + condition.jsonPath() + "=" + condition.expectedValue());
        }

        if (matchedChecks.isEmpty()) {
            matchedChecks.add("Rule " + normalizeRuleName(rule.ruleName()) + " matched without extra conditions");
        }

        return new RuleEvaluationResult(true, List.copyOf(matchedChecks), "Rule matched and produced the simulated response.");
    }

    private List<String> buildFallbackExplanations(List<MockRuleTraceItem> ruleTraces) {
        List<String> explanations = new ArrayList<>();
        ruleTraces.stream()
                .filter(trace -> "skipped".equals(trace.status()))
                .map(MockRuleTraceItem::summary)
                .forEach(explanations::add);
        explanations.add("No rule matched; fallback to draft default response");
        return explanations;
    }

    private List<MockRuleUpsertItem> sortRules(List<MockRuleUpsertItem> draftRules) {
        return (draftRules == null ? List.<MockRuleUpsertItem>of() : draftRules).stream()
                .sorted(
                        Comparator.comparingInt(MockRuleUpsertItem::priority)
                                .reversed()
                                .thenComparing(rule -> normalizeRuleName(rule.ruleName()))
                )
                .toList();
    }

    private String normalizeRuleName(String ruleName) {
        return isBlank(ruleName) ? "Untitled rule" : ruleName;
    }

    private ResponseGroup selectResponseGroup(List<MockSimulationResponseItem> draftResponses) {
        if (draftResponses == null || draftResponses.isEmpty()) {
            return new ResponseGroup(200, "application/json", List.of());
        }

        MockSimulationResponseItem first = draftResponses.get(0);
        List<MockSimulationResponseItem> groupedResponses = draftResponses.stream()
                .filter(response -> response.httpStatusCode() == first.httpStatusCode())
                .filter(response -> normalizeMediaType(response.mediaType()).equals(normalizeMediaType(first.mediaType())))
                .toList();
        return new ResponseGroup(first.httpStatusCode(), normalizeMediaType(first.mediaType()), groupedResponses);
    }

    private String buildJsonBody(List<MockSimulationResponseItem> responses) {
        try {
            if (responses.isEmpty()) {
                return "{}";
            }

            if (responses.size() == 1 && isBlank(responses.get(0).name())) {
                return OBJECT_MAPPER.writeValueAsString(defaultValue(responses.get(0)));
            }

            Map<String, Object> payload = new LinkedHashMap<>();
            for (MockSimulationResponseItem response : responses) {
                if (isBlank(response.name())) {
                    continue;
                }
                payload.put(response.name(), defaultValue(response));
            }
            return OBJECT_MAPPER.writeValueAsString(payload);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to render simulated mock body", exception);
        }
    }

    private Object defaultValue(MockSimulationResponseItem response) {
        if (!isBlank(response.exampleValue())) {
            return parseExampleValue(response.dataType(), response.exampleValue());
        }
        return defaultValueByType(response.dataType());
    }

    private Object parseExampleValue(String dataType, String exampleValue) {
        try {
            return switch (normalizeType(dataType)) {
                case "integer", "int", "long" -> Integer.parseInt(exampleValue);
                case "number", "float", "double", "decimal" -> Double.parseDouble(exampleValue);
                case "boolean" -> Boolean.parseBoolean(exampleValue);
                case "array", "object" -> OBJECT_MAPPER.readValue(exampleValue, Object.class);
                default -> exampleValue;
            };
        } catch (Exception ignored) {
            return defaultValueByType(dataType);
        }
    }

    private Object defaultValueByType(String dataType) {
        return switch (normalizeType(dataType)) {
            case "integer", "int", "long" -> 0;
            case "number", "float", "double", "decimal" -> 0;
            case "boolean" -> true;
            case "array" -> List.of();
            case "object" -> Map.of();
            default -> "";
        };
    }

    private Map<String, String> toMap(List<MockConditionEntry> entries, boolean lowerCaseKey) {
        Map<String, String> mapped = new LinkedHashMap<>();
        for (MockConditionEntry entry : safeConditions(entries)) {
            String key = lowerCaseKey ? entry.name().toLowerCase(Locale.ROOT) : entry.name();
            mapped.put(key, entry.value());
        }
        return mapped;
    }

    private List<MockConditionEntry> safeConditions(List<MockConditionEntry> conditions) {
        return conditions == null ? List.of() : conditions;
    }

    private List<MockBodyConditionEntry> safeBodyConditions(List<MockBodyConditionEntry> conditions) {
        return conditions == null ? List.of() : conditions;
    }

    private JsonNode readBodyNode(String bodySample) {
        if (isBlank(bodySample)) {
            return MissingNode.getInstance();
        }

        try {
            return OBJECT_MAPPER.readTree(bodySample);
        } catch (JsonProcessingException exception) {
            return MissingNode.getInstance();
        }
    }

    private String resolveJsonPath(JsonNode bodyNode, String jsonPath) {
        if (bodyNode == null || bodyNode.isMissingNode() || isBlank(jsonPath) || !jsonPath.startsWith("$")) {
            return null;
        }

        JsonNode current = bodyNode;
        int index = 1;
        while (index < jsonPath.length()) {
            char token = jsonPath.charAt(index);
            if (token == '.') {
                int nextBoundary = findNextBoundary(jsonPath, index + 1);
                String fieldName = jsonPath.substring(index + 1, nextBoundary);
                if (fieldName.isBlank() || current == null) {
                    return null;
                }
                current = current.get(fieldName);
                index = nextBoundary;
                continue;
            }

            if (token == '[') {
                int closingIndex = jsonPath.indexOf(']', index);
                if (closingIndex == -1 || current == null || !current.isArray()) {
                    return null;
                }

                String rawIndex = jsonPath.substring(index + 1, closingIndex).trim();
                int arrayIndex;
                try {
                    arrayIndex = Integer.parseInt(rawIndex);
                } catch (NumberFormatException exception) {
                    return null;
                }
                current = current.get(arrayIndex);
                index = closingIndex + 1;
                continue;
            }

            return null;
        }

        return normalizeResolvedBodyValue(current);
    }

    private int findNextBoundary(String jsonPath, int start) {
        int index = start;
        while (index < jsonPath.length()) {
            char token = jsonPath.charAt(index);
            if (token == '.' || token == '[') {
                break;
            }
            index++;
        }
        return index;
    }

    private String normalizeResolvedBodyValue(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }

        if (node.isContainerNode()) {
            try {
                return OBJECT_MAPPER.writeValueAsString(node);
            } catch (JsonProcessingException exception) {
                return null;
            }
        }

        return node.asText();
    }

    private String normalizeBodyValue(String expectedValue) {
        return expectedValue == null ? "" : expectedValue.trim();
    }

    private String normalizeMediaType(String mediaType) {
        return isBlank(mediaType) ? "application/json" : mediaType;
    }

    private String normalizeRuleBody(String body) {
        return isBlank(body) ? "{}" : body;
    }

    private String renderRuleBody(MockRuleUpsertItem rule) {
        return mockTemplateRenderer.render(rule.templateMode(), normalizeRuleBody(rule.body()));
    }

    private int normalizeDelayMs(int delayMs) {
        return Math.max(delayMs, 0);
    }

    private String normalizeType(String dataType) {
        return dataType == null ? "string" : dataType.toLowerCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private record RuleEvaluationResult(boolean matched, List<String> matchedChecks, String summary) {
    }

    private record MatchOutcome(MockRuleUpsertItem rule, List<String> explanations) {
    }

    private record ResponseGroup(int statusCode, String mediaType, List<MockSimulationResponseItem> responses) {
    }
}
