package com.apihub.debug.service;

import com.apihub.debug.model.DebugDtos.DebugHeader;
import com.apihub.debug.model.DebugDtos.DebugHistoryItem;
import com.apihub.debug.model.DebugDtos.ExecuteDebugRequest;
import com.apihub.debug.model.DebugDtos.ExecuteDebugResponse;
import com.apihub.doc.model.EndpointDetail;
import com.apihub.doc.repository.EndpointRepository;
import com.apihub.project.model.ProjectDtos.EnvironmentEntry;
import com.apihub.project.model.ProjectDtos.EnvironmentDetail;
import com.apihub.project.repository.ProjectRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
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

    public DebugService(ProjectRepository projectRepository,
                        EndpointRepository endpointRepository,
                        DebugHttpExecutor debugHttpExecutor,
                        DebugHistoryRepository debugHistoryRepository) {
        this.projectRepository = projectRepository;
        this.endpointRepository = endpointRepository;
        this.debugHttpExecutor = debugHttpExecutor;
        this.debugHistoryRepository = debugHistoryRepository;
    }

    public ExecuteDebugResponse execute(ExecuteDebugRequest request) {
        EnvironmentDetail environment = projectRepository.findEnvironment(request.environmentId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Environment not found"));
        EndpointRepository.EndpointReference endpointReference = endpointRepository.findEndpointReference(request.endpointId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Endpoint not found"));
        if (!environment.projectId().equals(endpointReference.projectId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Endpoint and environment do not belong to the same project");
        }

        EndpointDetail endpoint = endpointRepository.findEndpoint(request.endpointId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Endpoint not found"));
        Map<String, String> variables = environment.variables().stream()
                .filter(entry -> entry.name() != null && !entry.name().isBlank())
                .collect(LinkedHashMap::new, (map, entry) -> map.put(entry.name(), entry.value() == null ? "" : entry.value()), LinkedHashMap::putAll);

        URI targetUri = buildTargetUri(
                substituteVariables(environment.baseUrl(), variables),
                substituteVariables(endpoint.path(), variables),
                substituteVariables(request.queryString(), variables));
        List<DebugHeader> headers = mergeHeaders(environment.defaultHeaders(), request.headers(), variables);
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

    public List<DebugHistoryItem> listHistory(Long projectId, Long endpointId, int limit) {
        projectRepository.findProject(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        return debugHistoryRepository.listHistory(projectId, endpointId, Math.max(1, Math.min(limit, 50)));
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

        return UriComponentsBuilder.fromUriString(baseUrl)
                .path(normalizedPath)
                .replaceQuery(normalizedQuery.isBlank() ? null : normalizedQuery)
                .build(true)
                .toUri();
    }

    private List<DebugHeader> mergeHeaders(List<EnvironmentEntry> defaultHeaders,
                                           List<DebugHeader> requestHeaders,
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
