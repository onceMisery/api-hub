package com.apihub.project.service;

import com.apihub.auth.repository.AuthUserRepository;
import com.apihub.project.model.ProjectDtos.ProjectDetail;
import com.apihub.project.model.ProjectDtos.WebhookDeliveryDetail;
import com.apihub.project.repository.ProjectRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ProjectWebhookNotifier {

    public static final String EVENT_VERSION_RELEASED = "version.released";
    public static final String EVENT_MOCK_RELEASED = "mock.released";
    public static final String EVENT_TEST_SUITE_FAILED = "test_suite.failed";
    public static final String EVENT_WEBHOOK_TEST = "webhook.test";

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final int MAX_LOGGED_BODY_LENGTH = 4000;

    private final ProjectRepository projectRepository;
    private final AuthUserRepository authUserRepository;
    private final HttpClient httpClient;

    public ProjectWebhookNotifier(ProjectRepository projectRepository,
                                  AuthUserRepository authUserRepository) {
        this.projectRepository = projectRepository;
        this.authUserRepository = authUserRepository;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3))
                .build();
    }

    public void dispatchProjectEvent(Long projectId,
                                     String eventType,
                                     Long actorUserId,
                                     String resourceType,
                                     Long resourceId,
                                     String resourceName,
                                     Map<String, Object> data) {
        for (ProjectRepository.ProjectWebhookSecretRecord webhook : projectRepository.listEnabledWebhookTargets(projectId)) {
            if (!webhook.eventTypes().contains(eventType)) {
                continue;
            }
            deliver(webhook, buildPayload(projectId, eventType, actorUserId, resourceType, resourceId, resourceName, data));
        }
    }

    public WebhookDeliveryDetail dispatchWebhookTest(Long projectId, Long webhookId, Long actorUserId) {
        ProjectRepository.ProjectWebhookSecretRecord webhook = projectRepository.findProjectWebhookSecret(webhookId)
                .orElseThrow(() -> new IllegalArgumentException("Webhook not found"));
        Map<String, Object> data = Map.of(
                "message", "Manual webhook connectivity test",
                "webhookId", webhook.id(),
                "webhookName", webhook.name(),
                "targetUrl", webhook.targetUrl());
        deliver(webhook, buildPayload(projectId, EVENT_WEBHOOK_TEST, actorUserId, "project_webhook", webhook.id(), webhook.name(), data));
        return projectRepository.listWebhookDeliveries(projectId, 1).stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("Webhook delivery not recorded"));
    }

    private Map<String, Object> buildPayload(Long projectId,
                                             String eventType,
                                             Long actorUserId,
                                             String resourceType,
                                             Long resourceId,
                                             String resourceName,
                                             Map<String, Object> data) {
        ProjectDetail project = projectRepository.findProject(projectId).orElse(null);
        AuthUserRepository.UserCredential actor = actorUserId == null ? null : authUserRepository.findActiveById(actorUserId).orElse(null);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("eventId", UUID.randomUUID().toString());
        payload.put("eventType", eventType);
        payload.put("triggeredAt", Instant.now().toString());
        payload.put("project", Map.of(
                "id", projectId,
                "name", project == null ? ("project#" + projectId) : project.name(),
                "projectKey", project == null ? "" : project.projectKey()));
        payload.put("actor", actor == null ? Map.of("id", actorUserId == null ? 0L : actorUserId) : Map.of(
                "id", actor.id(),
                "username", actor.username(),
                "displayName", actor.displayName()));
        payload.put("resource", Map.of(
                "type", resourceType,
                "id", resourceId == null ? 0L : resourceId,
                "name", resourceName == null ? "" : resourceName));
        payload.put("data", data == null ? Map.of() : data);
        return payload;
    }

    private void deliver(ProjectRepository.ProjectWebhookSecretRecord webhook, Map<String, Object> payload) {
        String payloadJson = toJson(payload);
        String signature = signBody(payloadJson, webhook.secretToken());
        long startedAt = System.nanoTime();
        String status = "failed";
        Integer responseStatus = null;
        String responseBody = null;
        String errorMessage = null;

        try {
            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(webhook.targetUrl()))
                    .timeout(Duration.ofSeconds(5))
                    .header("Content-Type", "application/json")
                    .header("User-Agent", "ApiHub-Webhook/1.0")
                    .header("X-ApiHub-Event", String.valueOf(payload.get("eventType")))
                    .POST(HttpRequest.BodyPublishers.ofString(payloadJson, StandardCharsets.UTF_8));
            if (!signature.isBlank()) {
                requestBuilder.header("X-ApiHub-Signature", signature);
            }

            HttpResponse<String> response = httpClient.send(requestBuilder.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            responseStatus = response.statusCode();
            responseBody = truncate(response.body());
            status = response.statusCode() >= 200 && response.statusCode() < 300 ? "success" : "failed";
            if (!"success".equals(status)) {
                errorMessage = "Remote endpoint returned non-2xx status";
            }
        } catch (Exception exception) {
            errorMessage = truncate(exception.getMessage());
        }

        projectRepository.createWebhookDelivery(
                webhook.projectId(),
                webhook.id(),
                String.valueOf(payload.get("eventType")),
                webhook.targetUrl(),
                status,
                responseStatus,
                (System.nanoTime() - startedAt) / 1_000_000,
                payloadJson,
                responseBody,
                errorMessage);
    }

    private String toJson(Map<String, Object> payload) {
        try {
            return OBJECT_MAPPER.writeValueAsString(payload);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize webhook payload", exception);
        }
    }

    private String signBody(String payloadJson, String secretToken) {
        if (secretToken == null || secretToken.isBlank()) {
            return "";
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secretToken.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return "sha256=" + HexFormat.of().formatHex(mac.doFinal(payloadJson.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to sign webhook payload", exception);
        }
    }

    private String truncate(String value) {
        if (value == null || value.length() <= MAX_LOGGED_BODY_LENGTH) {
            return value;
        }
        return value.substring(0, MAX_LOGGED_BODY_LENGTH);
    }
}
