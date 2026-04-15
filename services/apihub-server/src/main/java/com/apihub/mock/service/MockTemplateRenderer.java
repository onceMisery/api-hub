package com.apihub.mock.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class MockTemplateRenderer {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final Pattern TOKEN_PATTERN = Pattern.compile("@([a-zA-Z]+)(?:\\(([^)]*)\\))?");
    private static final Pattern KEY_RULE_PATTERN = Pattern.compile("^([^|]+)\\|(.+)$");
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ISO_OFFSET_DATE_TIME.withZone(ZoneOffset.UTC);
    private static final List<String> NAMES = List.of("Alice", "Bob", "Carol", "David", "Evelyn", "Frank");
    private static final List<String> WORDS = List.of("alpha", "bravo", "charlie", "delta", "echo", "falcon");

    public String render(String templateMode, String body) {
        String normalizedMode = normalizeTemplateMode(templateMode);
        if (!"mockjs".equals(normalizedMode)) {
            return isBlank(body) ? "{}" : body;
        }
        return renderMockJs(body);
    }

    public String normalizeTemplateMode(String templateMode) {
        return isBlank(templateMode) ? "plain" : templateMode.trim().toLowerCase(Locale.ROOT);
    }

    private String renderMockJs(String body) {
        if (isBlank(body)) {
            return "{}";
        }
        try {
            JsonNode root = OBJECT_MAPPER.readTree(body);
            Object rendered = renderNode(root);
            return OBJECT_MAPPER.writeValueAsString(rendered);
        } catch (Exception ignored) {
            return renderInlineTokens(body);
        }
    }

    private Object renderNode(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node.isObject()) {
            return renderObject(node);
        }
        if (node.isArray()) {
            List<Object> items = new ArrayList<>();
            for (JsonNode child : node) {
                items.add(renderNode(child));
            }
            return items;
        }
        if (node.isTextual()) {
            return renderScalar(node.asText());
        }
        if (node.isBoolean()) {
            return node.booleanValue();
        }
        if (node.isInt() || node.isLong()) {
            return node.longValue();
        }
        if (node.isFloat() || node.isDouble() || node.isBigDecimal()) {
            return node.doubleValue();
        }
        return node.asText();
    }

    private Object renderObject(JsonNode node) {
        Map<String, Object> payload = new LinkedHashMap<>();
        Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> entry = fields.next();
            Matcher matcher = KEY_RULE_PATTERN.matcher(entry.getKey());
            if (!matcher.matches()) {
                payload.put(entry.getKey(), renderNode(entry.getValue()));
                continue;
            }

            String actualKey = matcher.group(1);
            String rule = matcher.group(2);
            JsonNode valueNode = entry.getValue();
            if (valueNode.isArray() && valueNode.size() > 0) {
                int count = resolveCount(rule);
                List<Object> items = new ArrayList<>();
                for (int index = 0; index < count; index++) {
                    items.add(renderNode(valueNode.get(0)));
                }
                payload.put(actualKey, items);
                continue;
            }
            if (valueNode.isNumber()) {
                payload.put(actualKey, resolveNumericValue(rule, valueNode.numberValue()));
                continue;
            }
            if (valueNode.isBoolean()) {
                payload.put(actualKey, resolveBooleanValue(rule, valueNode.booleanValue()));
                continue;
            }
            payload.put(actualKey, renderNode(valueNode));
        }
        return payload;
    }

    private Object renderScalar(String value) {
        Matcher matcher = TOKEN_PATTERN.matcher(value);
        if (matcher.matches()) {
            return resolveToken(matcher.group(1), matcher.group(2));
        }
        return renderInlineTokens(value);
    }

    private String renderInlineTokens(String value) {
        Matcher matcher = TOKEN_PATTERN.matcher(value);
        StringBuffer buffer = new StringBuffer();
        while (matcher.find()) {
            Object replacement = resolveToken(matcher.group(1), matcher.group(2));
            matcher.appendReplacement(buffer, Matcher.quoteReplacement(String.valueOf(replacement)));
        }
        matcher.appendTail(buffer);
        return buffer.toString();
    }

    private Object resolveToken(String tokenName, String rawArgs) {
        String token = tokenName.toLowerCase(Locale.ROOT);
        String[] args = splitArgs(rawArgs);
        return switch (token) {
            case "guid", "uuid" -> UUID.randomUUID().toString();
            case "email" -> "user" + randomInt(1000, 9999) + "@example.com";
            case "integer", "natural", "int" -> randomInt(resolveMin(args, 0), resolveMax(args, 9999));
            case "float" -> randomFloat(args);
            case "boolean", "bool" -> ThreadLocalRandom.current().nextBoolean();
            case "word" -> WORDS.get(randomInt(0, WORDS.size() - 1));
            case "name", "cname" -> NAMES.get(randomInt(0, NAMES.size() - 1));
            case "phone" -> "1" + randomInt(300000000, 999999999);
            case "datetime", "date" -> DATE_TIME_FORMATTER.format(Instant.now());
            default -> "@" + tokenName + (rawArgs == null ? "" : "(" + rawArgs + ")");
        };
    }

    private int resolveCount(String rule) {
        String normalized = rule.trim();
        if (normalized.contains("-")) {
            String[] segments = normalized.split("-", 2);
            return randomInt(parseInt(segments[0], 1), parseInt(segments[1], 3));
        }
        return parseInt(normalized, 1);
    }

    private Number resolveNumericValue(String rule, Number fallback) {
        String normalized = rule.trim();
        if (normalized.contains("-")) {
            String[] segments = normalized.split("-", 2);
            return randomInt(parseInt(segments[0], fallback.intValue()), parseInt(segments[1], fallback.intValue()));
        }
        return parseInt(normalized, fallback.intValue());
    }

    private boolean resolveBooleanValue(String rule, boolean fallback) {
        if ("1".equals(rule.trim())) {
            return ThreadLocalRandom.current().nextBoolean();
        }
        return fallback;
    }

    private double randomFloat(String[] args) {
        double min = resolveMinDouble(args, 0D);
        double max = resolveMaxDouble(args, 100D);
        int scale = args.length >= 4 ? parseInt(args[3], 2) : 2;
        double raw = ThreadLocalRandom.current().nextDouble(min, max);
        double factor = Math.pow(10, scale);
        return Math.round(raw * factor) / factor;
    }

    private String[] splitArgs(String rawArgs) {
        if (isBlank(rawArgs)) {
            return new String[0];
        }
        return rawArgs.split("\\s*,\\s*");
    }

    private int resolveMin(String[] args, int fallback) {
        return args.length >= 1 ? parseInt(args[0], fallback) : fallback;
    }

    private int resolveMax(String[] args, int fallback) {
        return args.length >= 2 ? parseInt(args[1], fallback) : fallback;
    }

    private double resolveMinDouble(String[] args, double fallback) {
        return args.length >= 1 ? parseDouble(args[0], fallback) : fallback;
    }

    private double resolveMaxDouble(String[] args, double fallback) {
        return args.length >= 2 ? parseDouble(args[1], fallback) : fallback;
    }

    private int randomInt(int min, int max) {
        if (max < min) {
            return min;
        }
        return ThreadLocalRandom.current().nextInt(min, max + 1);
    }

    private int parseInt(String value, int fallback) {
        try {
            return Integer.parseInt(value.trim());
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private double parseDouble(String value, double fallback) {
        try {
            return Double.parseDouble(value.trim());
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
