package com.apihub.mock.service;

import com.apihub.mock.model.MockDtos.MockConditionEntry;
import com.apihub.mock.model.MockDtos.MockSimulationRequest;
import com.apihub.mock.model.MockDtos.MockSimulationResponseItem;
import com.apihub.mock.model.MockDtos.MockSimulationResult;
import com.apihub.mock.model.MockDtos.MockRuleUpsertItem;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
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

    public MockSimulationResult resolveDraft(MockSimulationRequest request) {
        Map<String, String> querySamples = toMap(request.querySamples(), false);
        Map<String, String> headerSamples = toMap(request.headerSamples(), true);

        for (MockRuleUpsertItem rule : request.draftRules().stream()
                .filter(MockRuleUpsertItem::enabled)
                .sorted(Comparator.comparingInt(MockRuleUpsertItem::priority).reversed().thenComparing(MockRuleUpsertItem::ruleName))
                .toList()) {
            RuleMatchResult matchResult = tryMatch(rule, querySamples, headerSamples);
            if (matchResult.matched()) {
                return new MockSimulationResult(
                        "rule",
                        rule.ruleName(),
                        rule.priority(),
                        matchResult.explanations(),
                        rule.statusCode(),
                        normalizeMediaType(rule.mediaType()),
                        normalizeRuleBody(rule.body())
                );
            }
        }

        List<String> explanations = buildFallbackExplanations(request.draftRules(), querySamples, headerSamples);
        ResponseGroup responseGroup = selectResponseGroup(request.draftResponses());
        return new MockSimulationResult(
                "default-response",
                null,
                null,
                explanations,
                responseGroup.statusCode(),
                responseGroup.mediaType(),
                buildJsonBody(responseGroup.responses())
        );
    }

    private RuleMatchResult tryMatch(MockRuleUpsertItem rule, Map<String, String> querySamples, Map<String, String> headerSamples) {
        List<String> explanations = new ArrayList<>();

        for (MockConditionEntry condition : safeConditions(rule.queryConditions())) {
            String requestValue = querySamples.get(condition.name());
            if (!condition.value().equals(requestValue)) {
                return new RuleMatchResult(false, List.of(
                        "Rule " + rule.ruleName() + " skipped: missing query " + condition.name() + "=" + condition.value()
                ));
            }
            explanations.add("Matched query " + condition.name() + "=" + condition.value());
        }

        for (MockConditionEntry condition : safeConditions(rule.headerConditions())) {
            String requestValue = headerSamples.get(condition.name().toLowerCase(Locale.ROOT));
            if (!condition.value().equals(requestValue)) {
                return new RuleMatchResult(false, List.of(
                        "Rule " + rule.ruleName() + " skipped: missing header " + condition.name() + "=" + condition.value()
                ));
            }
            explanations.add("Matched header " + condition.name() + "=" + condition.value());
        }

        if (explanations.isEmpty()) {
            explanations.add("Rule " + rule.ruleName() + " matched without extra conditions");
        }

        return new RuleMatchResult(true, explanations);
    }

    private List<String> buildFallbackExplanations(List<MockRuleUpsertItem> rules,
                                                   Map<String, String> querySamples,
                                                   Map<String, String> headerSamples) {
        List<String> explanations = new ArrayList<>();
        for (MockRuleUpsertItem rule : rules) {
            RuleMatchResult result = tryMatch(rule, querySamples, headerSamples);
            if (!result.matched()) {
                explanations.addAll(result.explanations());
            }
        }
        explanations.add("No rule matched; fallback to draft default response");
        return explanations;
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

    private String normalizeMediaType(String mediaType) {
        return isBlank(mediaType) ? "application/json" : mediaType;
    }

    private String normalizeRuleBody(String body) {
        return isBlank(body) ? "{}" : body;
    }

    private String normalizeType(String dataType) {
        return dataType == null ? "string" : dataType.toLowerCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private record RuleMatchResult(boolean matched, List<String> explanations) {
    }

    private record ResponseGroup(int statusCode, String mediaType, List<MockSimulationResponseItem> responses) {
    }
}
