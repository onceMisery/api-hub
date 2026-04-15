package com.apihub.ai.service;

import com.apihub.ai.repository.AiSettingsRepository.ProjectAiSettingsRecord;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Service
public class AiGatewayService {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    public String generateText(ProjectAiSettingsRecord settings,
                               String model,
                               String systemPrompt,
                               String userPrompt,
                               double temperature) {
        try {
            HttpRequest request = HttpRequest.newBuilder(resolveChatUri(settings.baseUrl()))
                    .timeout(Duration.ofMillis(Math.max(settings.timeoutMs(), 3000)))
                    .header("Authorization", "Bearer " + settings.apiKey())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(buildChatBody(model, systemPrompt, userPrompt, temperature)))
                    .build();

            HttpResponse<String> response = client(settings.timeoutMs()).send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI provider request failed: " + summarizeError(response.body(), response.statusCode()));
            }
            return extractContent(response.body());
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI provider request failed", exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI provider request interrupted", exception);
        }
    }

    public void ping(ProjectAiSettingsRecord settings, String model) {
        generateText(settings, model, "You are a connectivity probe.", "Reply with OK only.", 0.1d);
    }

    private HttpClient client(int timeoutMs) {
        return HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(Math.max(timeoutMs, 3000)))
                .build();
    }

    private URI resolveChatUri(String baseUrl) {
        String normalized = baseUrl == null ? "" : baseUrl.trim();
        if (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        if (!normalized.endsWith("/chat/completions")) {
            normalized = normalized + "/chat/completions";
        }
        return URI.create(normalized);
    }

    private String buildChatBody(String model, String systemPrompt, String userPrompt, double temperature) throws IOException {
        JsonNode root = OBJECT_MAPPER.createObjectNode()
                .put("model", model)
                .put("temperature", temperature)
                .set("messages", OBJECT_MAPPER.createArrayNode()
                        .add(OBJECT_MAPPER.createObjectNode().put("role", "system").put("content", systemPrompt))
                        .add(OBJECT_MAPPER.createObjectNode().put("role", "user").put("content", userPrompt)));
        return OBJECT_MAPPER.writeValueAsString(root);
    }

    private String extractContent(String body) throws IOException {
        JsonNode root = OBJECT_MAPPER.readTree(body);
        JsonNode contentNode = root.path("choices").path(0).path("message").path("content");
        if (contentNode.isTextual()) {
            return contentNode.asText();
        }
        if (contentNode.isArray()) {
            StringBuilder builder = new StringBuilder();
            for (JsonNode node : contentNode) {
                if (node.hasNonNull("text")) {
                    if (!builder.isEmpty()) {
                        builder.append('\n');
                    }
                    builder.append(node.get("text").asText());
                }
            }
            if (!builder.isEmpty()) {
                return builder.toString();
            }
        }
        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI provider returned empty content");
    }

    private String summarizeError(String body, int statusCode) {
        String compact = body == null ? "" : body.replaceAll("\\s+", " ").trim();
        if (compact.length() > 220) {
            compact = compact.substring(0, 220) + "...";
        }
        return compact.isBlank() ? "HTTP " + statusCode : compact;
    }
}
