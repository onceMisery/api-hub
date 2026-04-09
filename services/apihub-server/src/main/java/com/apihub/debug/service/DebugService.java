package com.apihub.debug.service;

import com.apihub.debug.model.DebugDtos.DebugHeader;
import com.apihub.debug.model.DebugDtos.ExecuteDebugRequest;
import com.apihub.debug.model.DebugDtos.ExecuteDebugResponse;
import com.apihub.doc.model.EndpointDetail;
import com.apihub.doc.repository.EndpointRepository;
import com.apihub.project.model.ProjectDtos.EnvironmentDetail;
import com.apihub.project.repository.ProjectRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.List;

@Service
public class DebugService {

    private final ProjectRepository projectRepository;
    private final EndpointRepository endpointRepository;
    private final DebugHttpExecutor debugHttpExecutor;

    public DebugService(ProjectRepository projectRepository,
                        EndpointRepository endpointRepository,
                        DebugHttpExecutor debugHttpExecutor) {
        this.projectRepository = projectRepository;
        this.endpointRepository = endpointRepository;
        this.debugHttpExecutor = debugHttpExecutor;
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
        URI targetUri = buildTargetUri(environment.baseUrl(), endpoint.path(), request.queryString());
        List<DebugHeader> headers = request.headers() == null ? List.of() : request.headers().stream()
                .filter(header -> header.name() != null && !header.name().isBlank())
                .map(header -> new DebugHeader(header.name().trim(), header.value() == null ? "" : header.value()))
                .toList();

        DebugHttpResult result = debugHttpExecutor.execute(new DebugHttpRequest(
                endpoint.method(),
                targetUri,
                headers,
                request.body()));

        return new ExecuteDebugResponse(
                endpoint.method(),
                targetUri.toString(),
                result.statusCode(),
                result.headers(),
                result.responseBody(),
                result.durationMs());
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
}
