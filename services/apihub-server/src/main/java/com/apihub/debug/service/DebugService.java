package com.apihub.debug.service;

import com.apihub.debug.config.DebugSecurityProperties;
import com.apihub.debug.model.DebugDtos.DebugHeader;
import com.apihub.debug.model.DebugDtos.DebugHistoryItem;
import com.apihub.debug.model.DebugDtos.ExecuteDebugRequest;
import com.apihub.debug.model.DebugDtos.ExecuteDebugResponse;
import com.apihub.doc.model.EndpointDetail;
import com.apihub.doc.repository.EndpointRepository;
import com.apihub.project.model.ProjectDtos.DebugTargetRuleEntry;
import com.apihub.project.model.ProjectDtos.EnvironmentEntry;
import com.apihub.project.model.ProjectDtos.EnvironmentDetail;
import com.apihub.project.model.ProjectDtos.ProjectDetail;
import com.apihub.project.repository.ProjectRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class DebugService {

    private static final Pattern VARIABLE_PATTERN = Pattern.compile("\\{\\{\\s*([a-zA-Z0-9_.-]+)\\s*}}");

    private final ProjectRepository projectRepository;
    private final EndpointRepository endpointRepository;
    private final DebugHttpExecutor debugHttpExecutor;
    private final DebugHistoryRepository debugHistoryRepository;
    private final DebugTargetPolicyResolver debugTargetPolicyResolver;
    private final DebugTargetMatcher debugTargetMatcher;
    private final DebugSecurityProperties debugSecurityProperties;

    public DebugService(ProjectRepository projectRepository,
                        EndpointRepository endpointRepository,
                        DebugHttpExecutor debugHttpExecutor,
                        DebugHistoryRepository debugHistoryRepository,
                        DebugTargetPolicyResolver debugTargetPolicyResolver,
                        DebugTargetMatcher debugTargetMatcher,
                        DebugSecurityProperties debugSecurityProperties) {
        this.projectRepository = projectRepository;
        this.endpointRepository = endpointRepository;
        this.debugHttpExecutor = debugHttpExecutor;
        this.debugHistoryRepository = debugHistoryRepository;
        this.debugTargetPolicyResolver = debugTargetPolicyResolver;
        this.debugTargetMatcher = debugTargetMatcher;
        this.debugSecurityProperties = debugSecurityProperties;
    }

    public ExecuteDebugResponse execute(ExecuteDebugRequest request) {
        EnvironmentDetail environment = projectRepository.findEnvironment(request.environmentId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Environment not found"));
        EndpointRepository.EndpointReference endpointReference = endpointRepository.findEndpointReference(request.endpointId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Endpoint not found"));
        if (!environment.projectId().equals(endpointReference.projectId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Endpoint and environment do not belong to the same project");
        }
        ProjectDetail project = projectRepository.findProject(environment.projectId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));

        EndpointDetail endpoint = endpointRepository.findEndpoint(request.endpointId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Endpoint not found"));
        Map<String, String> variables = environment.variables().stream()
                .filter(entry -> entry.name() != null && !entry.name().isBlank())
                .collect(LinkedHashMap::new, (map, entry) -> map.put(entry.name(), entry.value() == null ? "" : entry.value()), LinkedHashMap::putAll);

        URI targetUri = buildTargetUri(
                substituteVariables(environment.baseUrl(), variables),
                substituteVariables(endpoint.path(), variables),
                mergeQueryString(environment.defaultQuery(), request.queryString(), variables));
        enforceTargetPolicy(project, environment, targetUri);
        List<DebugHeader> headers = mergeHeaders(environment.defaultHeaders(), request.headers(), environment, variables);
        String requestBody = substituteVariables(request.body(), variables);

        DebugHttpResult result = debugHttpExecutor.execute(new DebugHttpRequest(
                endpoint.method(),
                targetUri,
                headers,
                requestBody));

        debugHistoryRepository.saveHistory(
                environment.projectId(),
                environment.id(),
                endpoint.id(),
                endpoint.method(),
                targetUri.toString(),
                headers,
                requestBody,
                result.statusCode(),
                result.headers(),
                result.responseBody(),
                result.durationMs());

        return new ExecuteDebugResponse(
                endpoint.method(),
                targetUri.toString(),
                result.statusCode(),
                result.headers(),
                result.responseBody(),
                result.durationMs());
    }

    public List<DebugHistoryItem> listHistory(Long projectId,
                                              Long endpointId,
                                              Long environmentId,
                                              Integer statusCode,
                                              Instant createdFrom,
                                              Instant createdTo,
                                              int limit) {
        projectRepository.findProject(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        return debugHistoryRepository.listHistory(
                projectId,
                endpointId,
                environmentId,
                statusCode,
                createdFrom,
                createdTo,
                Math.max(1, Math.min(limit, 50)));
    }

    public int clearHistory(Long projectId,
                            Long endpointId,
                            Long environmentId,
                            Integer statusCode,
                            Instant createdFrom,
                            Instant createdTo) {
        projectRepository.findProject(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        return debugHistoryRepository.deleteHistory(projectId, endpointId, environmentId, statusCode, createdFrom, createdTo);
    }

    private URI buildTargetUri(String baseUrl, String endpointPath, String queryString) {
        URI baseUri;
        try {
            baseUri = URI.create(baseUrl);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Environment base URL is invalid", exception);
        }

        String scheme = baseUri.getScheme();
        if (scheme == null || (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Environment base URL must use http or https");
        }

        String normalizedPath = endpointPath == null ? "" : endpointPath.trim();
        String normalizedQuery = queryString == null ? "" : queryString.trim();
        if (normalizedQuery.startsWith("?")) {
            normalizedQuery = normalizedQuery.substring(1);
        }

        URI targetUri = UriComponentsBuilder.fromUriString(baseUrl)
                .path(normalizedPath)
                .replaceQuery(normalizedQuery.isBlank() ? null : normalizedQuery)
                .build(true)
                .toUri();
        if (targetUri.getHost() == null || targetUri.getHost().isBlank()) {
            throw DebugSecurityException.badRequest("DEBUG_TARGET_URL_INVALID", "Target URL host is invalid");
        }
        return targetUri;
    }

    private void enforceTargetPolicy(ProjectDetail project, EnvironmentDetail environment, URI targetUri) {
        List<DebugTargetRuleEntry> globalRules = debugSecurityProperties.getGlobalAllowlist().stream()
                .map(rule -> new DebugTargetRuleEntry(rule.getPattern(), rule.isAllowPrivate()))
                .toList();
        List<DebugTargetRuleEntry> effectiveRules = debugTargetPolicyResolver.resolveEffectiveRules(
                globalRules,
                project.debugAllowedHosts(),
                environment.debugHostMode(),
                environment.debugAllowedHosts());
        DebugTargetMatcher.MatchResult matchResult = debugTargetMatcher.match(targetUri.getHost(), effectiveRules);
        if (!matchResult.matched()) {
            throw DebugSecurityException.forbidden(
                    "DEBUG_TARGET_NOT_ALLOWED",
                    "目标主机 " + targetUri.getHost() + " 未在调试白名单中",
                    targetUri.getHost(),
                    List.of());
        }
        if (matchResult.privateTarget() && !matchResult.allowPrivate()) {
            throw DebugSecurityException.forbidden(
                    "DEBUG_PRIVATE_TARGET_NOT_ALLOWED",
                    "目标主机 " + targetUri.getHost() + " 命中私网限制，需显式允许私网访问",
                    targetUri.getHost(),
                    matchResult.matchedPatterns());
        }
    }

    private List<DebugHeader> mergeHeaders(List<EnvironmentEntry> defaultHeaders,
                                           List<DebugHeader> requestHeaders,
                                           EnvironmentDetail environment,
                                           Map<String, String> variables) {
        LinkedHashMap<String, DebugHeader> mergedHeaders = new LinkedHashMap<>();

        List<EnvironmentEntry> safeDefaultHeaders = defaultHeaders == null ? List.of() : defaultHeaders;
        for (EnvironmentEntry header : safeDefaultHeaders) {
            if (header.name() == null || header.name().isBlank()) {
                continue;
            }
            mergedHeaders.put(header.name().toLowerCase(), new DebugHeader(
                    header.name().trim(),
                    substituteVariables(header.value(), variables)));
        }

        injectAuthHeader(mergedHeaders, environment, variables);

        List<DebugHeader> safeRequestHeaders = requestHeaders == null ? List.of() : requestHeaders;
        for (DebugHeader header : safeRequestHeaders) {
            if (header.name() == null || header.name().isBlank()) {
                continue;
            }
            mergedHeaders.put(header.name().toLowerCase(), new DebugHeader(
                    header.name().trim(),
                    substituteVariables(header.value(), variables)));
        }

        return List.copyOf(mergedHeaders.values());
    }

    private String mergeQueryString(List<EnvironmentEntry> defaultQuery, String requestQueryString, Map<String, String> variables) {
        LinkedHashMap<String, String> mergedQuery = new LinkedHashMap<>();
        List<EnvironmentEntry> safeDefaultQuery = defaultQuery == null ? List.of() : defaultQuery;
        for (EnvironmentEntry entry : safeDefaultQuery) {
            if (entry.name() == null || entry.name().isBlank()) {
                continue;
            }
            mergedQuery.put(entry.name().trim(), substituteVariables(entry.value(), variables));
        }

        for (EnvironmentEntry entry : parseQueryString(requestQueryString)) {
            mergedQuery.put(entry.name(), substituteVariables(entry.value(), variables));
        }

        UriComponentsBuilder builder = UriComponentsBuilder.newInstance();
        mergedQuery.forEach(builder::queryParam);
        String query = builder.build().getQuery();
        return query == null ? "" : query;
    }

    private List<EnvironmentEntry> parseQueryString(String queryString) {
        if (queryString == null || queryString.isBlank()) {
            return List.of();
        }

        String normalizedQuery = queryString.trim();
        if (normalizedQuery.startsWith("?")) {
            normalizedQuery = normalizedQuery.substring(1);
        }

        List<EnvironmentEntry> entries = new ArrayList<>();
        for (String pair : normalizedQuery.split("&")) {
            String trimmed = pair.trim();
            if (trimmed.isBlank()) {
                continue;
            }
            int separatorIndex = trimmed.indexOf('=');
            if (separatorIndex == -1) {
                entries.add(new EnvironmentEntry(trimmed, ""));
                continue;
            }
            entries.add(new EnvironmentEntry(trimmed.substring(0, separatorIndex), trimmed.substring(separatorIndex + 1)));
        }
        return entries;
    }

    private void injectAuthHeader(Map<String, DebugHeader> mergedHeaders, EnvironmentDetail environment, Map<String, String> variables) {
        String authMode = environment.authMode() == null ? "none" : environment.authMode().trim().toLowerCase();
        if ("none".equals(authMode) || authMode.isBlank()) {
            return;
        }

        String authKey = environment.authKey() == null || environment.authKey().isBlank() ? "Authorization" : environment.authKey().trim();
        String authValue = substituteVariables(environment.authValue(), variables);
        if (authValue.isBlank()) {
            return;
        }

        if ("bearer".equals(authMode)) {
            mergedHeaders.put(authKey.toLowerCase(), new DebugHeader(authKey, "Bearer " + authValue));
            return;
        }

        if ("api_key_header".equals(authMode)) {
            mergedHeaders.put(authKey.toLowerCase(), new DebugHeader(authKey, authValue));
        }
    }

    private String substituteVariables(String template, Map<String, String> variables) {
        if (template == null || template.isBlank() || variables.isEmpty()) {
            return template == null ? "" : template;
        }

        Matcher matcher = VARIABLE_PATTERN.matcher(template);
        StringBuilder builder = new StringBuilder();
        while (matcher.find()) {
            String key = matcher.group(1);
            String replacement = variables.getOrDefault(key, matcher.group(0));
            matcher.appendReplacement(builder, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(builder);
        return builder.toString();
    }
}
