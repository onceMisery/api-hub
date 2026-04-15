package com.apihub.project.service;

import com.apihub.doc.model.DocDtos.CreateEndpointRequest;
import com.apihub.doc.model.DocDtos.CreateVersionRequest;
import com.apihub.doc.model.DocDtos.ParameterUpsertItem;
import com.apihub.doc.model.DocDtos.ResponseUpsertItem;
import com.apihub.doc.model.DocDtos.UpdateEndpointRequest;
import com.apihub.doc.model.EndpointDetail;
import com.apihub.doc.repository.EndpointRepository;
import com.apihub.ai.service.AiRagService;
import com.apihub.project.model.ProjectDtos.CreateEnvironmentRequest;
import com.apihub.project.model.ProjectDtos.CreateGroupRequest;
import com.apihub.project.model.ProjectDtos.CreateModuleRequest;
import com.apihub.project.model.ProjectDtos.CreateProjectRequest;
import com.apihub.project.model.ProjectDtos.GroupDetail;
import com.apihub.project.model.ProjectDtos.ModuleDetail;
import com.apihub.project.model.ProjectDtos.ProjectDetail;
import com.apihub.project.model.ProjectDtos.SpaceSummary;
import com.apihub.project.model.ProjectImportDtos.ImportProjectRequest;
import com.apihub.project.model.ProjectImportDtos.ImportPreview;
import com.apihub.project.model.ProjectImportDtos.ImportResult;
import com.apihub.project.model.ProjectImportDtos.ImportSpecRequest;
import com.apihub.project.repository.ProjectRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.yaml.snakeyaml.Yaml;

import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@Service
@Transactional
public class ProjectImportService {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final List<String> HTTP_METHODS = List.of("get", "post", "put", "patch", "delete", "head", "options");
    private static final DateTimeFormatter IMPORT_VERSION_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss");
    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NORMAL).build();

    private final ProjectRepository projectRepository;
    private final EndpointRepository endpointRepository;
    private final AiRagService aiRagService;

    public ProjectImportService(ProjectRepository projectRepository, EndpointRepository endpointRepository, AiRagService aiRagService) {
        this.projectRepository = projectRepository;
        this.endpointRepository = endpointRepository;
        this.aiRagService = aiRagService;
    }

    public ImportResult importOpenApiToProject(Long userId, Long projectId, ImportSpecRequest request) {
        validateSpecImportRequest(request);
        return importSpec(userId, requireWritableProject(userId, projectId), "openapi", request.sourceName(), request.sourceUrl(), request.content(),
                Boolean.TRUE.equals(request.createVersionSnapshot()), Boolean.TRUE.equals(request.bootstrapEnvironments()), Boolean.TRUE.equals(request.enableMockByDefault()));
    }

    public ImportResult importSmartDocToProject(Long userId, Long projectId, ImportSpecRequest request) {
        validateSpecImportRequest(request);
        return importSpec(userId, requireWritableProject(userId, projectId), "smartdoc", request.sourceName(), request.sourceUrl(), request.content(),
                Boolean.TRUE.equals(request.createVersionSnapshot()), Boolean.TRUE.equals(request.bootstrapEnvironments()), Boolean.TRUE.equals(request.enableMockByDefault()));
    }

    public ImportResult importPostmanToProject(Long userId, Long projectId, ImportSpecRequest request) {
        validateSpecImportRequest(request);
        return importSpec(userId, requireWritableProject(userId, projectId), "postman", request.sourceName(), request.sourceUrl(), request.content(),
                Boolean.TRUE.equals(request.createVersionSnapshot()), Boolean.TRUE.equals(request.bootstrapEnvironments()), Boolean.TRUE.equals(request.enableMockByDefault()));
    }

    public ImportResult importHarToProject(Long userId, Long projectId, ImportSpecRequest request) {
        validateSpecImportRequest(request);
        return importSpec(userId, requireWritableProject(userId, projectId), "har", request.sourceName(), request.sourceUrl(), request.content(),
                Boolean.TRUE.equals(request.createVersionSnapshot()), Boolean.TRUE.equals(request.bootstrapEnvironments()), Boolean.TRUE.equals(request.enableMockByDefault()));
    }

    public ImportResult importOpenApiAsProject(Long userId, Long spaceId, ImportProjectRequest request) {
        validateProjectImportRequest(request);
        requireWritableSpace(userId, spaceId);
        ProjectDetail project = projectRepository.createProject(userId, spaceId, new CreateProjectRequest(
                request.projectName().trim(), request.projectKey().trim(), normalizeNullableText(request.description()), List.of()));
        return importSpec(userId, project, "openapi", request.sourceName(), request.sourceUrl(), request.content(),
                Boolean.TRUE.equals(request.createVersionSnapshot()), Boolean.TRUE.equals(request.bootstrapEnvironments()), Boolean.TRUE.equals(request.enableMockByDefault()));
    }

    public ImportResult importSmartDocAsProject(Long userId, Long spaceId, ImportProjectRequest request) {
        validateProjectImportRequest(request);
        requireWritableSpace(userId, spaceId);
        ProjectDetail project = projectRepository.createProject(userId, spaceId, new CreateProjectRequest(
                request.projectName().trim(), request.projectKey().trim(), normalizeNullableText(request.description()), List.of()));
        return importSpec(userId, project, "smartdoc", request.sourceName(), request.sourceUrl(), request.content(),
                Boolean.TRUE.equals(request.createVersionSnapshot()), Boolean.TRUE.equals(request.bootstrapEnvironments()), Boolean.TRUE.equals(request.enableMockByDefault()));
    }

    public ImportResult importPostmanAsProject(Long userId, Long spaceId, ImportProjectRequest request) {
        validateProjectImportRequest(request);
        requireWritableSpace(userId, spaceId);
        ProjectDetail project = projectRepository.createProject(userId, spaceId, new CreateProjectRequest(
                request.projectName().trim(), request.projectKey().trim(), normalizeNullableText(request.description()), List.of()));
        return importSpec(userId, project, "postman", request.sourceName(), request.sourceUrl(), request.content(),
                Boolean.TRUE.equals(request.createVersionSnapshot()), Boolean.TRUE.equals(request.bootstrapEnvironments()), Boolean.TRUE.equals(request.enableMockByDefault()));
    }

    public ImportResult importHarAsProject(Long userId, Long spaceId, ImportProjectRequest request) {
        validateProjectImportRequest(request);
        requireWritableSpace(userId, spaceId);
        ProjectDetail project = projectRepository.createProject(userId, spaceId, new CreateProjectRequest(
                request.projectName().trim(), request.projectKey().trim(), normalizeNullableText(request.description()), List.of()));
        return importSpec(userId, project, "har", request.sourceName(), request.sourceUrl(), request.content(),
                Boolean.TRUE.equals(request.createVersionSnapshot()), Boolean.TRUE.equals(request.bootstrapEnvironments()), Boolean.TRUE.equals(request.enableMockByDefault()));
    }

    public ImportPreview previewOpenApiToProject(Long userId, Long projectId, ImportSpecRequest request) {
        validateSpecImportRequest(request);
        return previewSpec(requireWritableProject(userId, projectId), "openapi", request.sourceName(), request.sourceUrl(), request.content());
    }

    public ImportPreview previewSmartDocToProject(Long userId, Long projectId, ImportSpecRequest request) {
        validateSpecImportRequest(request);
        return previewSpec(requireWritableProject(userId, projectId), "smartdoc", request.sourceName(), request.sourceUrl(), request.content());
    }

    public ImportPreview previewPostmanToProject(Long userId, Long projectId, ImportSpecRequest request) {
        validateSpecImportRequest(request);
        return previewSpec(requireWritableProject(userId, projectId), "postman", request.sourceName(), request.sourceUrl(), request.content());
    }

    public ImportPreview previewHarToProject(Long userId, Long projectId, ImportSpecRequest request) {
        validateSpecImportRequest(request);
        return previewSpec(requireWritableProject(userId, projectId), "har", request.sourceName(), request.sourceUrl(), request.content());
    }

    public ImportPreview previewOpenApiAsProject(Long userId, Long spaceId, ImportProjectRequest request) {
        validateProjectImportRequest(request);
        requireWritableSpace(userId, spaceId);
        return previewSpec(null, "openapi", request.sourceName(), request.sourceUrl(), request.content());
    }

    public ImportPreview previewSmartDocAsProject(Long userId, Long spaceId, ImportProjectRequest request) {
        validateProjectImportRequest(request);
        requireWritableSpace(userId, spaceId);
        return previewSpec(null, "smartdoc", request.sourceName(), request.sourceUrl(), request.content());
    }

    public ImportPreview previewPostmanAsProject(Long userId, Long spaceId, ImportProjectRequest request) {
        validateProjectImportRequest(request);
        requireWritableSpace(userId, spaceId);
        return previewSpec(null, "postman", request.sourceName(), request.sourceUrl(), request.content());
    }

    public ImportPreview previewHarAsProject(Long userId, Long spaceId, ImportProjectRequest request) {
        validateProjectImportRequest(request);
        requireWritableSpace(userId, spaceId);
        return previewSpec(null, "har", request.sourceName(), request.sourceUrl(), request.content());
    }

    public ImportResult importOpenApiByPush(String token, ImportSpecRequest request) {
        return importSpecByPushToken(token, "openapi", request);
    }

    public ImportResult importSmartDocByPush(String token, ImportSpecRequest request) {
        return importSpecByPushToken(token, "smartdoc", request);
    }

    private ImportResult importSpecByPushToken(String token, String sourceType, ImportSpecRequest request) {
        validatePushImportRequest(token, request);
        ProjectRepository.ProjectPushTarget target = projectRepository.findProjectPushTarget(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project push channel not found"));
        if (!target.enabled()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Project push channel is disabled");
        }
        ProjectDetail project = projectRepository.findProject(target.projectId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        return importSpec(
                target.ownerId(),
                project,
                sourceType,
                request.sourceName(),
                request.sourceUrl(),
                request.content(),
                Boolean.TRUE.equals(request.createVersionSnapshot()),
                Boolean.TRUE.equals(request.bootstrapEnvironments()),
                Boolean.TRUE.equals(request.enableMockByDefault()));
    }

    private ImportResult importSpec(Long userId,
                                    ProjectDetail project,
                                    String sourceType,
                                    String sourceName,
                                    String sourceUrl,
                                    String rawContent,
                                    boolean createVersionSnapshot,
                                    boolean bootstrapEnvironments,
                                    boolean enableMockByDefault) {
        ParsedSpec parsedSpec = parseSpec(sourceType, sourceName, sourceUrl, rawContent, project.name(), enableMockByDefault);
        ImportCounters counters = new ImportCounters();
        Map<String, ModuleDetail> modulesByName = new LinkedHashMap<>();
        Map<String, GroupDetail> groupsByKey = new LinkedHashMap<>();
        String importVersion = "import-" + LocalDateTime.now().format(IMPORT_VERSION_FORMAT);
        String changeSummary = "Imported from " + sourceType.toUpperCase(Locale.ROOT) + ": " + parsedSpec.displayName();

        for (ImportedOperation operation : parsedSpec.operations()) {
            ModuleDetail module = modulesByName.computeIfAbsent(key(project.id(), operation.moduleName()), key ->
                    projectRepository.findModuleByProjectAndName(project.id(), operation.moduleName())
                            .orElseGet(() -> {
                                counters.createdModules++;
                                return projectRepository.createModule(userId, project.id(), new CreateModuleRequest(operation.moduleName()));
                            }));

            GroupDetail group = groupsByKey.computeIfAbsent(key(module.id(), operation.groupName()), key ->
                    projectRepository.findGroupByModuleAndName(module.id(), operation.groupName())
                            .orElseGet(() -> {
                                counters.createdGroups++;
                                return projectRepository.createGroup(userId, module.id(), new CreateGroupRequest(operation.groupName()));
                            }));

            EndpointDetail existingEndpoint = endpointRepository.findEndpointByProjectAndRouteKey(project.id(), operation.routeKey()).orElse(null);
            EndpointDetail endpoint;
            if (existingEndpoint == null) {
                endpoint = endpointRepository.createEndpoint(userId, new ProjectRepository.GroupReference(group.id(), module.id(), project.id()), new CreateEndpointRequest(
                        operation.name(), operation.method(), operation.path(), operation.description(), operation.mockEnabled()));
                counters.createdEndpoints++;
            } else {
                EndpointRepository.EndpointReference reference = endpointRepository.findEndpointReference(existingEndpoint.id()).orElseThrow();
                if (!Objects.equals(reference.moduleId(), module.id()) || !Objects.equals(reference.groupId(), group.id())) {
                    endpointRepository.updateEndpointLocation(userId, existingEndpoint.id(), module.id(), group.id());
                }
                endpoint = endpointRepository.updateEndpoint(userId, existingEndpoint.id(), new UpdateEndpointRequest(
                        operation.name(), operation.method(), operation.path(), operation.description(), operation.mockEnabled()));
                counters.updatedEndpoints++;
            }

            endpointRepository.replaceParameters(endpoint.id(), operation.parameters());
            endpointRepository.replaceResponses(endpoint.id(), operation.responses());
            aiRagService.reindexEndpoint(endpoint.id());

            if (createVersionSnapshot) {
                endpointRepository.createVersion(userId, endpoint.id(), new CreateVersionRequest(
                        importVersion, changeSummary, buildSnapshotJson(sourceType, parsedSpec.displayName(), operation)));
                counters.createdVersions++;
            }
        }

        if (bootstrapEnvironments) {
            boolean hasDefault = !projectRepository.listEnvironments(project.id()).isEmpty();
            for (ImportedServer server : parsedSpec.servers()) {
                if (projectRepository.findEnvironmentByProjectAndName(project.id(), server.name()).isPresent()) {
                    parsedSpec.warnings().add("Environment already exists and was skipped: " + server.name());
                    continue;
                }
                projectRepository.createEnvironment(userId, project.id(), new CreateEnvironmentRequest(
                        server.name(), server.baseUrl(), !hasDefault, List.of(), List.of(), List.of(), "none", "", "", "inherit", List.of()));
                hasDefault = true;
                counters.createdEnvironments++;
            }
        }

        return new ImportResult(project.id(), project.name(), sourceType, counters.createdModules, counters.createdGroups,
                counters.createdEndpoints, counters.updatedEndpoints, counters.createdVersions, counters.createdEnvironments, List.copyOf(parsedSpec.warnings()));
    }

    private ImportPreview previewSpec(ProjectDetail existingProject,
                                      String sourceType,
                                      String sourceName,
                                      String sourceUrl,
                                      String rawContent) {
        ParsedSpec parsedSpec = parseSpec(sourceType, sourceName, sourceUrl, rawContent, existingProject != null ? existingProject.name() : "Imported Project", true);
        PreviewCounters counters = new PreviewCounters();
        LinkedHashMap<String, String> modules = new LinkedHashMap<>();
        LinkedHashMap<String, String> groups = new LinkedHashMap<>();
        List<String> routes = new ArrayList<>();

        for (ImportedOperation operation : parsedSpec.operations()) {
            modules.putIfAbsent(operation.moduleName().toLowerCase(Locale.ROOT), operation.moduleName());
            groups.putIfAbsent((operation.moduleName() + ":" + operation.groupName()).toLowerCase(Locale.ROOT), operation.groupName());
            routes.add(operation.routeKey());

            if (existingProject != null) {
                ModuleDetail existingModule = projectRepository.findModuleByProjectAndName(existingProject.id(), operation.moduleName()).orElse(null);
                if (existingModule == null) {
                    counters.createdModules++;
                }
                if (existingModule == null || projectRepository.findGroupByModuleAndName(existingModule.id(), operation.groupName()).isEmpty()) {
                    counters.createdGroups++;
                }
                if (endpointRepository.findEndpointByProjectAndRouteKey(existingProject.id(), operation.routeKey()).isPresent()) {
                    counters.updatedEndpoints++;
                } else {
                    counters.createdEndpoints++;
                }
            } else {
                counters.createdEndpoints++;
            }
        }

        if (existingProject == null) {
            counters.createdModules = modules.size();
            counters.createdGroups = groups.size();
        }

        return new ImportPreview(
                sourceType,
                parsedSpec.displayName(),
                parsedSpec.operations().size(),
                counters.createdModules,
                counters.createdGroups,
                counters.createdEndpoints,
                counters.updatedEndpoints,
                parsedSpec.servers().size(),
                List.copyOf(modules.values()),
                List.copyOf(groups.values()),
                List.copyOf(routes),
                List.copyOf(parsedSpec.warnings()));
    }

    private ParsedSpec parseSpec(String sourceType, String sourceName, String sourceUrl, String rawContent, String fallbackProjectName, boolean enableMockByDefault) {
        JsonNode root = readStructuredContent(resolveImportContent(sourceUrl, rawContent));
        ParsedSpec parsed = switch (sourceType) {
            case "openapi" -> parseOpenApi(root, sourceName, fallbackProjectName, enableMockByDefault);
            case "smartdoc" -> parseSmartDoc(root, sourceName, fallbackProjectName, enableMockByDefault);
            case "postman" -> parsePostman(root, sourceName, fallbackProjectName, enableMockByDefault);
            case "har" -> parseHar(root, sourceName, fallbackProjectName, enableMockByDefault);
            default -> looksLikeOpenApi(root)
                    ? parseOpenApi(root, sourceName, fallbackProjectName, enableMockByDefault)
                    : null;
        };
        if (parsed == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported import content");
        }
        if (parsed.operations().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No endpoints were found in the imported specification");
        }
        return deduplicateOperations(parsed);
    }

    private ParsedSpec parseOpenApi(JsonNode root, String sourceName, String fallbackProjectName, boolean enableMockByDefault) {
        List<ImportedOperation> operations = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        JsonNode pathsNode = root.path("paths");
        if (!pathsNode.isObject()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OpenAPI document is missing paths");
        }

        Iterator<Map.Entry<String, JsonNode>> pathIterator = pathsNode.fields();
        while (pathIterator.hasNext()) {
            Map.Entry<String, JsonNode> pathEntry = pathIterator.next();
            String path = normalizePath(pathEntry.getKey());
            JsonNode pathNode = pathEntry.getValue();
            Map<String, JsonNode> pathParams = indexParameters(pathNode.path("parameters"));

            for (String methodName : HTTP_METHODS) {
                JsonNode operationNode = pathNode.path(methodName);
                if (operationNode.isMissingNode() || operationNode.isNull()) {
                    continue;
                }

                Map<String, JsonNode> parameters = new LinkedHashMap<>(pathParams);
                parameters.putAll(indexParameters(operationNode.path("parameters")));
                List<ParameterUpsertItem> parameterItems = new ArrayList<>(toParameterItems(root, parameters.values()));
                parameterItems.addAll(extractRequestBodyParameters(root, operationNode));

                operations.add(new ImportedOperation(
                        normalizeTitle(firstNonBlank(operationNode.path("x-apihub-module").asText(null), pathNode.path("x-apihub-module").asText(null), deriveModuleNameFromPath(path), "Imported APIs")),
                        normalizeTitle(firstTagName(operationNode.path("tags"), "Default Group")),
                        firstNonBlank(operationNode.path("summary").asText(null), operationNode.path("operationId").asText(null), humanizePath(methodName, path)),
                        methodName.toUpperCase(Locale.ROOT),
                        path,
                        firstNonBlank(operationNode.path("description").asText(null), operationNode.path("summary").asText(null), ""),
                        enableMockByDefault,
                        List.copyOf(deduplicateParameters(parameterItems)),
                        List.copyOf(extractResponses(root, operationNode.path("responses"), warnings, path, methodName.toUpperCase(Locale.ROOT)))));
            }
        }

        return new ParsedSpec(
                firstNonBlank(sourceName, root.path("info").path("title").asText(null), fallbackProjectName, "Imported Project"),
                List.copyOf(operations),
                parseServers(root),
                warnings);
    }

    private ParsedSpec parseSmartDoc(JsonNode root, String sourceName, String fallbackProjectName, boolean enableMockByDefault) {
        List<String> warnings = new ArrayList<>();
        JsonNode groupsNode = root.isArray() ? root : findFirstArray(root, "apiDocList", "data", "apis", "children");
        if (groupsNode == null || !groupsNode.isArray()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported SmartDoc structure");
        }

        List<ImportedOperation> operations = new ArrayList<>();
        for (JsonNode groupNode : groupsNode) {
            String groupName = normalizeTitle(firstNonBlank(groupNode.path("name").asText(null), groupNode.path("desc").asText(null), groupNode.path("title").asText(null), "Default Group"));
            String moduleName = normalizeTitle(firstNonBlank(groupNode.path("module").asText(null), groupNode.path("packageName").asText(null), "Imported APIs"));
            JsonNode apiList = findFirstArray(groupNode, "list", "children", "apis", "methods");
            if (apiList == null || !apiList.isArray()) {
                warnings.add("SmartDoc group skipped because no API list was found: " + groupName);
                continue;
            }

            for (JsonNode apiNode : apiList) {
                String path = normalizePath(firstNonBlank(apiNode.path("url").asText(null), apiNode.path("path").asText(null), ""));
                if (path.isBlank()) {
                    warnings.add("SmartDoc API skipped because url/path is missing under group: " + groupName);
                    continue;
                }
                String method = normalizeMethod(firstNonBlank(apiNode.path("method").asText(null), apiNode.path("type").asText(null), apiNode.path("httpMethod").asText(null), "GET"));

                List<ParameterUpsertItem> parameters = new ArrayList<>();
                parameters.addAll(extractSmartDocParams(apiNode.path("pathParams"), "path", path));
                parameters.addAll(extractSmartDocParams(apiNode.path("queryParams"), "query", path));
                parameters.addAll(extractSmartDocParams(apiNode.path("headerParams"), "header", path));
                parameters.addAll(extractSmartDocParams(apiNode.path("requestParams"), null, path));

                List<ResponseUpsertItem> responses = extractSmartDocResponses(apiNode);
                if (responses.isEmpty()) {
                    responses = List.of(new ResponseUpsertItem(200, "application/json", "body", "object", false, "Imported from SmartDoc", firstNonBlank(apiNode.path("responseUsage").asText(null), "")));
                }

                operations.add(new ImportedOperation(
                        moduleName,
                        groupName,
                        firstNonBlank(apiNode.path("name").asText(null), apiNode.path("desc").asText(null), apiNode.path("summary").asText(null), humanizePath(method, path)),
                        method,
                        path,
                        firstNonBlank(apiNode.path("detail").asText(null), apiNode.path("description").asText(null), apiNode.path("desc").asText(null), ""),
                        enableMockByDefault,
                        List.copyOf(deduplicateParameters(parameters)),
                        List.copyOf(responses)));
            }
        }

        return new ParsedSpec(firstNonBlank(sourceName, root.path("name").asText(null), fallbackProjectName, "Imported Project"), List.copyOf(operations), List.of(), warnings);
    }

    private ParsedSpec parsePostman(JsonNode root, String sourceName, String fallbackProjectName, boolean enableMockByDefault) {
        JsonNode infoNode = root.path("info");
        JsonNode itemsNode = root.path("item");
        if (!itemsNode.isArray()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported Postman collection structure");
        }

        List<ImportedOperation> operations = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        collectPostmanItems(itemsNode, new ArrayList<>(), operations, warnings, enableMockByDefault);
        return new ParsedSpec(
                firstNonBlank(sourceName, infoNode.path("name").asText(null), fallbackProjectName, "Imported Project"),
                List.copyOf(operations),
                List.of(),
                warnings);
    }

    private void collectPostmanItems(JsonNode itemsNode,
                                     List<String> folderTrail,
                                     List<ImportedOperation> operations,
                                     List<String> warnings,
                                     boolean enableMockByDefault) {
        for (JsonNode itemNode : itemsNode) {
            if (itemNode.path("item").isArray()) {
                List<String> nextTrail = new ArrayList<>(folderTrail);
                nextTrail.add(normalizeTitle(firstNonBlank(itemNode.path("name").asText(null), "Folder")));
                collectPostmanItems(itemNode.path("item"), nextTrail, operations, warnings, enableMockByDefault);
                continue;
            }
            JsonNode requestNode = itemNode.path("request");
            if (!requestNode.isObject()) {
                warnings.add("Postman item skipped because request block is missing: " + firstNonBlank(itemNode.path("name").asText(null), "Unnamed item"));
                continue;
            }
            String method = normalizeMethod(firstNonBlank(requestNode.path("method").asText(null), "GET"));
            String path = normalizePath(extractPostmanPath(requestNode.path("url")));
            if (path.isBlank()) {
                warnings.add("Postman item skipped because request URL/path is missing: " + firstNonBlank(itemNode.path("name").asText(null), "Unnamed item"));
                continue;
            }
            String moduleName = folderTrail.isEmpty() ? deriveModuleNameFromPath(path) : folderTrail.get(0);
            String groupName = folderTrail.size() > 1 ? folderTrail.get(1) : (folderTrail.size() == 1 ? folderTrail.get(0) : "Default Group");
            List<ParameterUpsertItem> parameters = extractPostmanRequestParameters(requestNode.path("url"), requestNode.path("header"), requestNode.path("body"), path);
            List<ResponseUpsertItem> responses = extractPostmanResponses(itemNode.path("response"));
            if (responses.isEmpty()) {
                responses = List.of(new ResponseUpsertItem(200, "application/json", "body", "object", false, "Imported from Postman", ""));
            }
            operations.add(new ImportedOperation(
                    normalizeTitle(moduleName),
                    normalizeTitle(groupName),
                    firstNonBlank(itemNode.path("name").asText(null), humanizePath(method, path)),
                    method,
                    path,
                    firstNonBlank(requestNode.path("description").asText(null), itemNode.path("name").asText(null), ""),
                    enableMockByDefault,
                    List.copyOf(deduplicateParameters(parameters)),
                    List.copyOf(responses)));
        }
    }

    private ParsedSpec parseHar(JsonNode root, String sourceName, String fallbackProjectName, boolean enableMockByDefault) {
        JsonNode entriesNode = root.path("log").path("entries");
        if (!entriesNode.isArray()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported HAR structure");
        }
        List<ImportedOperation> operations = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        for (JsonNode entryNode : entriesNode) {
            JsonNode requestNode = entryNode.path("request");
            String method = normalizeMethod(firstNonBlank(requestNode.path("method").asText(null), "GET"));
            String path = normalizePath(extractPathFromUrl(firstNonBlank(requestNode.path("url").asText(null), "")));
            if (path.isBlank()) {
                warnings.add("HAR entry skipped because request URL is missing");
                continue;
            }
            List<ParameterUpsertItem> parameters = extractHarParameters(requestNode, path);
            List<ResponseUpsertItem> responses = extractHarResponse(entryNode.path("response"));
            operations.add(new ImportedOperation(
                    normalizeTitle(deriveModuleNameFromPath(path)),
                    normalizeTitle(deriveGroupNameFromPath(path)),
                    humanizePath(method, path),
                    method,
                    path,
                    "Imported from HAR capture",
                    enableMockByDefault,
                    List.copyOf(deduplicateParameters(parameters)),
                    List.copyOf(responses)));
        }
        return new ParsedSpec(
                firstNonBlank(sourceName, root.path("log").path("creator").path("name").asText(null), fallbackProjectName, "Imported Project"),
                List.copyOf(operations),
                List.of(),
                warnings);
    }

    private ParsedSpec deduplicateOperations(ParsedSpec parsed) {
        Map<String, ImportedOperation> unique = new LinkedHashMap<>();
        List<String> warnings = new ArrayList<>(parsed.warnings());
        for (ImportedOperation operation : parsed.operations()) {
            if (unique.containsKey(operation.routeKey())) {
                warnings.add("Duplicate route in imported spec, kept the latest definition: " + operation.routeKey());
            }
            unique.put(operation.routeKey(), operation);
        }
        return new ParsedSpec(parsed.displayName(), List.copyOf(unique.values()), parsed.servers(), warnings);
    }

    private String resolveImportContent(String sourceUrl, String rawContent) {
        String normalizedContent = normalizeNullableText(rawContent);
        if (!normalizedContent.isBlank()) {
            return normalizedContent;
        }
        String normalizedUrl = normalizeNullableText(sourceUrl);
        if (normalizedUrl.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Import content or source URL is required");
        }
        return fetchRemoteContent(normalizedUrl);
    }

    private JsonNode readStructuredContent(String rawContent) {
        if (rawContent == null || rawContent.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Import content is required");
        }
        try {
            return OBJECT_MAPPER.readTree(rawContent);
        } catch (JsonProcessingException ignored) {
            try {
                Object value = new Yaml().load(rawContent);
                if (value == null) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Import content is empty");
                }
                return OBJECT_MAPPER.valueToTree(value);
            } catch (RuntimeException exception) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Failed to parse imported content");
            }
        }
    }

    private String fetchRemoteContent(String sourceUrl) {
        try {
            URI uri = new URI(sourceUrl);
            String scheme = normalizeNullableText(uri.getScheme()).toLowerCase(Locale.ROOT);
            if (!List.of("http", "https").contains(scheme)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only http/https source URLs are supported");
            }
            HttpRequest request = HttpRequest.newBuilder(uri)
                    .header("Accept", "application/json, application/yaml, text/yaml, text/plain, */*")
                    .GET()
                    .build();
            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Failed to fetch source URL, status=" + response.statusCode());
            }
            return response.body();
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Failed to fetch source URL");
        }
    }

    private boolean looksLikeOpenApi(JsonNode root) {
        return root.hasNonNull("openapi") || root.hasNonNull("swagger");
    }

    private Map<String, JsonNode> indexParameters(JsonNode arrayNode) {
        Map<String, JsonNode> indexed = new LinkedHashMap<>();
        if (!arrayNode.isArray()) {
            return indexed;
        }
        for (JsonNode node : arrayNode) {
            indexed.put(node.path("in").asText("") + ":" + node.path("name").asText(""), node);
        }
        return indexed;
    }

    private List<ParameterUpsertItem> toParameterItems(JsonNode root, Iterable<JsonNode> sourceNodes) {
        List<ParameterUpsertItem> items = new ArrayList<>();
        for (JsonNode sourceNode : sourceNodes) {
            JsonNode node = resolveRef(root, sourceNode);
            String sectionType = mapSectionType(node.path("in").asText(null));
            if (sectionType == null || "body".equals(sectionType)) {
                continue;
            }
            items.add(new ParameterUpsertItem(
                    sectionType,
                    firstNonBlank(node.path("name").asText(null), "value"),
                    deriveDataType(root, node),
                    node.path("required").asBoolean("path".equals(sectionType)),
                    firstNonBlank(node.path("description").asText(null), ""),
                    extractExample(node)));
        }
        return items;
    }

    private List<ParameterUpsertItem> extractRequestBodyParameters(JsonNode root, JsonNode operationNode) {
        if (operationNode.path("requestBody").isObject()) {
            JsonNode requestBody = resolveRef(root, operationNode.path("requestBody"));
            JsonNode contentNode = firstContentNode(requestBody.path("content"));
            if (contentNode != null) {
                return flattenSchemaAsParameters(root, contentNode.path("schema"), "body", "body", requestBody.path("description").asText(""));
            }
        }

        List<ParameterUpsertItem> items = new ArrayList<>();
        for (JsonNode parameterNode : operationNode.path("parameters")) {
            JsonNode node = resolveRef(root, parameterNode);
            if ("body".equalsIgnoreCase(node.path("in").asText())) {
                items.addAll(flattenSchemaAsParameters(root, node.path("schema"), "body", "body", node.path("description").asText("")));
            }
            if ("formData".equalsIgnoreCase(node.path("in").asText())) {
                items.add(new ParameterUpsertItem("body", firstNonBlank(node.path("name").asText(null), "body"), deriveDataType(root, node),
                        node.path("required").asBoolean(false), firstNonBlank(node.path("description").asText(null), ""), extractExample(node)));
            }
        }
        return items;
    }

    private List<ResponseUpsertItem> extractResponses(JsonNode root, JsonNode responsesNode, List<String> warnings, String path, String method) {
        if (!responsesNode.isObject()) {
            return List.of();
        }
        List<ResponseUpsertItem> items = new ArrayList<>();
        Iterator<Map.Entry<String, JsonNode>> fields = responsesNode.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> entry = fields.next();
            JsonNode responseNode = resolveRef(root, entry.getValue());
            int statusCode = "default".equalsIgnoreCase(entry.getKey()) ? 200 : parseStatusCode(entry.getKey());
            JsonNode contentNode = firstContentNode(responseNode.path("content"));
            if (contentNode != null) {
                items.addAll(flattenSchemaAsResponses(root, contentNode.path("schema"), statusCode, mediaTypeName(responseNode.path("content")), responseNode.path("description").asText("")));
            } else if (!responseNode.path("schema").isMissingNode() && !responseNode.path("schema").isNull()) {
                items.addAll(flattenSchemaAsResponses(root, responseNode.path("schema"), statusCode, "application/json", responseNode.path("description").asText("")));
            } else {
                items.add(new ResponseUpsertItem(statusCode, "application/json", "body", "object", false, firstNonBlank(responseNode.path("description").asText(null), "Imported response"), extractExample(responseNode)));
            }
        }
        if (items.isEmpty()) {
            warnings.add("Response schema missing for " + method + " " + path + ", imported a minimal placeholder response");
            return List.of(new ResponseUpsertItem(200, "application/json", "body", "object", false, "Imported placeholder response", ""));
        }
        return items;
    }

    private List<ParameterUpsertItem> flattenSchemaAsParameters(JsonNode root, JsonNode schemaNode, String sectionType, String fallbackName, String fallbackDescription) {
        JsonNode schema = resolveSchema(root, schemaNode);
        if (schema == null || schema.isMissingNode() || schema.isNull()) {
            return List.of();
        }
        if (isObjectSchema(schema) && schema.path("properties").isObject()) {
            List<String> required = readRequiredFields(schema);
            List<ParameterUpsertItem> items = new ArrayList<>();
            Iterator<Map.Entry<String, JsonNode>> fields = schema.path("properties").fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> property = fields.next();
                JsonNode valueNode = resolveSchema(root, property.getValue());
                items.add(new ParameterUpsertItem(sectionType, property.getKey(), deriveDataType(root, valueNode), required.contains(property.getKey()),
                        firstNonBlank(valueNode.path("description").asText(null), fallbackDescription), extractExample(valueNode)));
            }
            return items;
        }
        return List.of(new ParameterUpsertItem(sectionType, fallbackName, deriveDataType(root, schema), false,
                firstNonBlank(schema.path("description").asText(null), fallbackDescription), extractExample(schema)));
    }

    private List<ResponseUpsertItem> flattenSchemaAsResponses(JsonNode root, JsonNode schemaNode, int statusCode, String mediaType, String fallbackDescription) {
        JsonNode schema = resolveSchema(root, schemaNode);
        if (schema == null || schema.isMissingNode() || schema.isNull()) {
            return List.of();
        }
        if (isObjectSchema(schema) && schema.path("properties").isObject()) {
            List<String> required = readRequiredFields(schema);
            List<ResponseUpsertItem> items = new ArrayList<>();
            Iterator<Map.Entry<String, JsonNode>> fields = schema.path("properties").fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> property = fields.next();
                JsonNode valueNode = resolveSchema(root, property.getValue());
                items.add(new ResponseUpsertItem(statusCode, mediaType, property.getKey(), deriveDataType(root, valueNode), required.contains(property.getKey()),
                        firstNonBlank(valueNode.path("description").asText(null), fallbackDescription), extractExample(valueNode)));
            }
            return items;
        }
        return List.of(new ResponseUpsertItem(statusCode, mediaType, "body", deriveDataType(root, schema), false,
                firstNonBlank(schema.path("description").asText(null), fallbackDescription), extractExample(schema)));
    }

    private List<ParameterUpsertItem> extractSmartDocParams(JsonNode node, String forcedSectionType, String path) {
        if (!node.isArray()) {
            return List.of();
        }
        List<ParameterUpsertItem> items = new ArrayList<>();
        for (JsonNode paramNode : node) {
            String name = firstNonBlank(paramNode.path("field").asText(null), paramNode.path("name").asText(null), paramNode.path("param").asText(null), "value");
            items.add(new ParameterUpsertItem(
                    forcedSectionType != null ? forcedSectionType : inferSmartDocSection(paramNode, name, path),
                    name,
                    normalizeDataType(firstNonBlank(paramNode.path("type").asText(null), paramNode.path("javaType").asText(null), "string")),
                    paramNode.path("required").asBoolean(false),
                    firstNonBlank(paramNode.path("desc").asText(null), paramNode.path("description").asText(null), ""),
                    firstNonBlank(paramNode.path("value").asText(null), paramNode.path("example").asText(null), "")));
        }
        return items;
    }

    private List<ResponseUpsertItem> extractSmartDocResponses(JsonNode apiNode) {
        JsonNode arrayNode = findFirstArray(apiNode, "responseParams", "responseFields", "resultFields");
        if (arrayNode == null || !arrayNode.isArray()) {
            return List.of();
        }
        List<ResponseUpsertItem> items = new ArrayList<>();
        for (JsonNode responseNode : arrayNode) {
            items.add(new ResponseUpsertItem(200, "application/json",
                    firstNonBlank(responseNode.path("field").asText(null), responseNode.path("name").asText(null), "body"),
                    normalizeDataType(firstNonBlank(responseNode.path("type").asText(null), responseNode.path("javaType").asText(null), "string")),
                    responseNode.path("required").asBoolean(false),
                    firstNonBlank(responseNode.path("desc").asText(null), responseNode.path("description").asText(null), ""),
                    firstNonBlank(responseNode.path("value").asText(null), responseNode.path("example").asText(null), "")));
        }
        return items;
    }

    private String extractPostmanPath(JsonNode urlNode) {
        if (urlNode.isTextual()) {
            return extractPathFromUrl(urlNode.asText(""));
        }
        if (urlNode.path("path").isArray()) {
            List<String> segments = new ArrayList<>();
            for (JsonNode segment : urlNode.path("path")) {
                if (!segment.asText("").isBlank()) {
                    segments.add(segment.asText());
                }
            }
            return "/" + String.join("/", segments);
        }
        if (urlNode.hasNonNull("raw")) {
            return extractPathFromUrl(urlNode.path("raw").asText(""));
        }
        return "";
    }

    private String extractPathFromUrl(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            return "";
        }
        try {
            URI uri = new URI(rawUrl.replace("{{baseUrl}}", "https://placeholder.local"));
            return firstNonBlank(uri.getPath(), "");
        } catch (URISyntaxException ignored) {
            int queryIndex = rawUrl.indexOf('?');
            String withoutQuery = queryIndex >= 0 ? rawUrl.substring(0, queryIndex) : rawUrl;
            String normalized = withoutQuery.replaceAll("^[a-zA-Z]+://[^/]+", "");
            return normalized.startsWith("/") ? normalized : "/" + normalized;
        }
    }

    private List<ParameterUpsertItem> extractPostmanRequestParameters(JsonNode urlNode, JsonNode headersNode, JsonNode bodyNode, String path) {
        List<ParameterUpsertItem> items = new ArrayList<>();
        for (String pathSegment : path.split("/")) {
            if (pathSegment.startsWith(":")) {
                items.add(new ParameterUpsertItem("path", pathSegment.substring(1), "string", true, "Imported from Postman path parameter", ""));
            } else if (pathSegment.startsWith("{") && pathSegment.endsWith("}")) {
                items.add(new ParameterUpsertItem("path", pathSegment.substring(1, pathSegment.length() - 1), "string", true, "Imported from Postman path parameter", ""));
            }
        }
        JsonNode queryNode = urlNode.path("query");
        if (queryNode.isArray()) {
            for (JsonNode queryItem : queryNode) {
                items.add(new ParameterUpsertItem(
                        "query",
                        firstNonBlank(queryItem.path("key").asText(null), "query"),
                        "string",
                        !queryItem.path("disabled").asBoolean(false),
                        firstNonBlank(queryItem.path("description").asText(null), "Imported from Postman query"),
                        firstNonBlank(queryItem.path("value").asText(null), "")));
            }
        }
        if (headersNode.isArray()) {
            for (JsonNode headerNode : headersNode) {
                items.add(new ParameterUpsertItem(
                        "header",
                        firstNonBlank(headerNode.path("key").asText(null), "header"),
                        "string",
                        !headerNode.path("disabled").asBoolean(false),
                        firstNonBlank(headerNode.path("description").asText(null), "Imported from Postman header"),
                        firstNonBlank(headerNode.path("value").asText(null), "")));
            }
        }
        if (bodyNode.isObject() && !bodyNode.isMissingNode()) {
            String mode = normalizeNullableText(bodyNode.path("mode").asText(null));
            String example = "";
            if ("raw".equalsIgnoreCase(mode)) {
                example = firstNonBlank(bodyNode.path("raw").asText(null), "");
            } else if ("urlencoded".equalsIgnoreCase(mode) && bodyNode.path("urlencoded").isArray()) {
                List<String> encodedKeys = new ArrayList<>();
                for (JsonNode item : bodyNode.path("urlencoded")) {
                    encodedKeys.add(firstNonBlank(item.path("key").asText(null), "field"));
                }
                example = String.join("&", encodedKeys);
            } else if ("formdata".equalsIgnoreCase(mode) && bodyNode.path("formdata").isArray()) {
                List<String> parts = new ArrayList<>();
                for (JsonNode item : bodyNode.path("formdata")) {
                    parts.add(firstNonBlank(item.path("key").asText(null), "field"));
                }
                example = String.join(",", parts);
            }
            items.add(new ParameterUpsertItem("body", "body", "object", false, "Imported from Postman request body", example));
        }
        return items;
    }

    private List<ResponseUpsertItem> extractPostmanResponses(JsonNode responsesNode) {
        if (!responsesNode.isArray()) {
            return List.of();
        }
        List<ResponseUpsertItem> items = new ArrayList<>();
        for (JsonNode responseNode : responsesNode) {
            String body = firstNonBlank(responseNode.path("body").asText(null), "");
            String mediaType = firstNonBlank(responseNode.path("header").isArray() ? readHeaderValue(responseNode.path("header"), "Content-Type") : null, "application/json");
            items.add(new ResponseUpsertItem(
                    responseNode.path("code").asInt(200),
                    mediaType,
                    "body",
                    inferBodyDataType(body),
                    false,
                    firstNonBlank(responseNode.path("name").asText(null), "Imported from Postman example"),
                    body));
        }
        return items;
    }

    private List<ParameterUpsertItem> extractHarParameters(JsonNode requestNode, String path) {
        List<ParameterUpsertItem> items = new ArrayList<>();
        JsonNode queryString = requestNode.path("queryString");
        if (queryString.isArray()) {
            for (JsonNode item : queryString) {
                items.add(new ParameterUpsertItem("query",
                        firstNonBlank(item.path("name").asText(null), "query"),
                        "string",
                        false,
                        "Imported from HAR query",
                        firstNonBlank(item.path("value").asText(null), "")));
            }
        }
        JsonNode headers = requestNode.path("headers");
        if (headers.isArray()) {
            for (JsonNode item : headers) {
                items.add(new ParameterUpsertItem("header",
                        firstNonBlank(item.path("name").asText(null), "header"),
                        "string",
                        false,
                        "Imported from HAR header",
                        firstNonBlank(item.path("value").asText(null), "")));
            }
        }
        if (requestNode.path("postData").isObject()) {
            String bodyText = firstNonBlank(requestNode.path("postData").path("text").asText(null), "");
            items.add(new ParameterUpsertItem("body", "body", inferBodyDataType(bodyText), false, "Imported from HAR request body", bodyText));
        }
        for (String pathSegment : path.split("/")) {
            if (pathSegment.startsWith("{") && pathSegment.endsWith("}")) {
                items.add(new ParameterUpsertItem("path", pathSegment.substring(1, pathSegment.length() - 1), "string", true, "Imported path parameter", ""));
            }
        }
        return items;
    }

    private List<ResponseUpsertItem> extractHarResponse(JsonNode responseNode) {
        String body = firstNonBlank(responseNode.path("content").path("text").asText(null), "");
        return List.of(new ResponseUpsertItem(
                responseNode.path("status").asInt(200),
                firstNonBlank(responseNode.path("content").path("mimeType").asText(null), "application/json"),
                "body",
                inferBodyDataType(body),
                false,
                "Imported from HAR response",
                body));
    }

    private String readHeaderValue(JsonNode headersNode, String targetName) {
        for (JsonNode headerNode : headersNode) {
            String headerName = firstNonBlank(headerNode.path("key").asText(null), headerNode.path("name").asText(null), "");
            if (targetName.equalsIgnoreCase(headerName)) {
                return firstNonBlank(headerNode.path("value").asText(null), "");
            }
        }
        return null;
    }

    private String inferBodyDataType(String body) {
        String normalized = normalizeNullableText(body);
        if (normalized.isBlank()) {
            return "object";
        }
        if ((normalized.startsWith("{") && normalized.endsWith("}")) || (normalized.startsWith("[") && normalized.endsWith("]"))) {
            return normalized.startsWith("[") ? "array" : "object";
        }
        return "string";
    }

    private JsonNode resolveSchema(JsonNode root, JsonNode schemaNode) {
        JsonNode resolved = resolveRef(root, schemaNode);
        if (resolved == null || resolved.isMissingNode() || resolved.isNull()) {
            return resolved;
        }
        if (resolved.path("allOf").isArray() && resolved.path("allOf").size() > 0) {
            ObjectNode merged = OBJECT_MAPPER.createObjectNode();
            ObjectNode properties = OBJECT_MAPPER.createObjectNode();
            List<String> required = new ArrayList<>();
            for (JsonNode child : resolved.path("allOf")) {
                JsonNode childSchema = resolveSchema(root, child);
                if (childSchema != null && childSchema.path("properties").isObject()) {
                    childSchema.path("properties").fields().forEachRemaining(field -> properties.set(field.getKey(), field.getValue()));
                }
                required.addAll(readRequiredFields(childSchema));
                if (childSchema != null && childSchema.hasNonNull("type")) {
                    merged.put("type", childSchema.path("type").asText());
                }
            }
            if (!properties.isEmpty()) {
                merged.set("properties", properties);
            }
            if (!required.isEmpty()) {
                merged.set("required", OBJECT_MAPPER.valueToTree(required));
            }
            if (!merged.isEmpty()) {
                return merged;
            }
        }
        if (resolved.path("oneOf").isArray() && resolved.path("oneOf").size() > 0) {
            return resolveSchema(root, resolved.path("oneOf").get(0));
        }
        if (resolved.path("anyOf").isArray() && resolved.path("anyOf").size() > 0) {
            return resolveSchema(root, resolved.path("anyOf").get(0));
        }
        return resolved;
    }

    private JsonNode resolveRef(JsonNode root, JsonNode node) {
        JsonNode current = node;
        int depth = 0;
        while (current != null && current.hasNonNull("$ref") && depth < 12) {
            String ref = current.path("$ref").asText();
            if (!ref.startsWith("#/")) {
                return current;
            }
            current = resolvePointer(root, ref.substring(1));
            depth++;
        }
        return current;
    }

    private JsonNode resolvePointer(JsonNode root, String pointer) {
        JsonNode current = root;
        for (String segment : pointer.split("/")) {
            if (segment.isBlank()) {
                continue;
            }
            current = current.path(segment.replace("~1", "/").replace("~0", "~"));
        }
        return current;
    }

    private JsonNode firstContentNode(JsonNode contentNode) {
        if (!contentNode.isObject()) {
            return null;
        }
        JsonNode applicationJson = contentNode.path("application/json");
        if (!applicationJson.isMissingNode() && !applicationJson.isNull()) {
            return applicationJson;
        }
        Iterator<JsonNode> iterator = contentNode.elements();
        return iterator.hasNext() ? iterator.next() : null;
    }

    private String mediaTypeName(JsonNode contentNode) {
        if (!contentNode.isObject()) {
            return "application/json";
        }
        if (contentNode.has("application/json")) {
            return "application/json";
        }
        Iterator<String> iterator = contentNode.fieldNames();
        return iterator.hasNext() ? iterator.next() : "application/json";
    }

    private List<ImportedServer> parseServers(JsonNode root) {
        if (root.path("servers").isArray()) {
            List<ImportedServer> servers = new ArrayList<>();
            for (JsonNode serverNode : root.path("servers")) {
                String baseUrl = normalizeNullableText(serverNode.path("url").asText(null));
                if (!baseUrl.isBlank()) {
                    servers.add(new ImportedServer(
                            normalizeTitle(firstNonBlank(serverNode.path("description").asText(null), deriveEnvironmentName(baseUrl), "Imported Server")),
                            baseUrl));
                }
            }
            return List.copyOf(servers);
        }
        String host = normalizeNullableText(root.path("host").asText(null));
        if (!host.isBlank()) {
            String scheme = root.path("schemes").isArray() && root.path("schemes").size() > 0 ? root.path("schemes").get(0).asText("https") : "https";
            String basePath = normalizeNullableText(root.path("basePath").asText(null));
            return List.of(new ImportedServer(normalizeTitle(deriveEnvironmentName(scheme + "://" + host)), scheme + "://" + host + basePath));
        }
        return List.of();
    }

    private JsonNode findFirstArray(JsonNode root, String... fieldNames) {
        if (root == null || root.isMissingNode() || root.isNull()) {
            return null;
        }
        ArrayDeque<JsonNode> queue = new ArrayDeque<>();
        queue.add(root);
        int scanned = 0;
        while (!queue.isEmpty() && scanned < 128) {
            JsonNode current = queue.removeFirst();
            scanned++;
            for (String fieldName : fieldNames) {
                JsonNode node = current.path(fieldName);
                if (node.isArray()) {
                    return node;
                }
            }
            if (current.isObject()) {
                current.elements().forEachRemaining(queue::addLast);
            }
        }
        return null;
    }

    private List<ParameterUpsertItem> deduplicateParameters(List<ParameterUpsertItem> items) {
        Map<String, ParameterUpsertItem> unique = new LinkedHashMap<>();
        for (ParameterUpsertItem item : items) {
            unique.put(item.sectionType() + ":" + item.name(), item);
        }
        return List.copyOf(unique.values());
    }

    private List<String> readRequiredFields(JsonNode schema) {
        if (schema == null || !schema.path("required").isArray()) {
            return List.of();
        }
        List<String> required = new ArrayList<>();
        for (JsonNode field : schema.path("required")) {
            if (field.isTextual()) {
                required.add(field.asText());
            }
        }
        return required;
    }

    private boolean isObjectSchema(JsonNode schema) {
        return "object".equalsIgnoreCase(schema.path("type").asText()) || schema.path("properties").isObject();
    }

    private String deriveDataType(JsonNode root, JsonNode sourceNode) {
        JsonNode node = resolveSchema(root, sourceNode);
        if (node == null || node.isMissingNode() || node.isNull()) {
            return "string";
        }
        if (node.hasNonNull("type")) {
            String type = node.path("type").asText();
            return "array".equalsIgnoreCase(type) ? normalizeDataType(deriveDataType(root, node.path("items")) + "[]") : normalizeDataType(type);
        }
        if (node.path("properties").isObject()) {
            return "object";
        }
        return "string";
    }

    private String extractExample(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return "";
        }
        if (node.has("example")) {
            JsonNode example = node.get("example");
            return example.isContainerNode() ? example.toString() : example.asText("");
        }
        if (node.path("examples").isObject()) {
            Iterator<JsonNode> iterator = node.path("examples").elements();
            if (iterator.hasNext()) {
                JsonNode example = iterator.next();
                JsonNode value = example.has("value") ? example.get("value") : example;
                return value.isContainerNode() ? value.toString() : value.asText("");
            }
        }
        if (node.has("default")) {
            JsonNode value = node.get("default");
            return value.isContainerNode() ? value.toString() : value.asText("");
        }
        return "";
    }

    private String mapSectionType(String raw) {
        String normalized = normalizeNullableText(raw).toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "path", "query", "header", "cookie", "body" -> normalized;
            default -> null;
        };
    }

    private int parseStatusCode(String raw) {
        try {
            return Integer.parseInt(raw);
        } catch (NumberFormatException exception) {
            return 200;
        }
    }

    private String firstTagName(JsonNode tagsNode, String fallback) {
        return tagsNode.isArray() && tagsNode.size() > 0 ? firstNonBlank(tagsNode.get(0).asText(null), fallback) : fallback;
    }

    private String deriveModuleNameFromPath(String path) {
        for (String segment : path.split("/")) {
            if (!segment.isBlank() && !segment.startsWith("{")) {
                return normalizeTitle(segment.replace('-', ' '));
            }
        }
        return "Imported APIs";
    }

    private String deriveGroupNameFromPath(String path) {
        List<String> segments = new ArrayList<>();
        for (String segment : path.split("/")) {
            if (!segment.isBlank() && !segment.startsWith("{")) {
                segments.add(segment);
            }
        }
        if (segments.size() >= 2) {
            return normalizeTitle(segments.get(1).replace('-', ' '));
        }
        if (segments.size() == 1) {
            return normalizeTitle(segments.get(0).replace('-', ' '));
        }
        return "Default Group";
    }

    private String humanizePath(String method, String path) {
        return method.toUpperCase(Locale.ROOT) + " " + path;
    }

    private String inferSmartDocSection(JsonNode parameterNode, String name, String path) {
        String explicit = mapSectionType(parameterNode.path("in").asText(null));
        if (explicit != null) {
            return explicit;
        }
        if (path.contains("{" + name + "}")) {
            return "path";
        }
        String type = normalizeNullableText(parameterNode.path("type").asText(null)).toLowerCase(Locale.ROOT);
        return ("object".equals(type) || "array".equals(type)) ? "body" : "query";
    }

    private String normalizeMethod(String method) {
        String normalized = normalizeNullableText(method).toUpperCase(Locale.ROOT);
        return normalized.isBlank() ? "GET" : normalized;
    }

    private String normalizePath(String path) {
        String normalized = normalizeNullableText(path);
        if (normalized.isBlank()) {
            return "";
        }
        return normalized.startsWith("/") ? normalized : "/" + normalized;
    }

    private String normalizeTitle(String value) {
        String normalized = normalizeNullableText(value);
        return normalized.isBlank() ? "Imported APIs" : normalized;
    }

    private String normalizeNullableText(String value) {
        return value == null ? "" : value.trim();
    }

    private String normalizeDataType(String value) {
        String normalized = normalizeNullableText(value);
        String compact = normalized.toLowerCase(Locale.ROOT);
        if (compact.isBlank()) {
            return "string";
        }
        return switch (compact) {
            case "int", "integer", "long", "short", "biginteger" -> "integer";
            case "double", "float", "decimal", "bigdecimal", "number" -> "number";
            case "bool", "boolean" -> "boolean";
            case "map", "object", "jsonobject" -> "object";
            case "list", "array", "collection" -> "array";
            default -> normalized.length() > 64 ? normalized.substring(0, 64) : normalized;
        };
    }

    private String deriveEnvironmentName(String baseUrl) {
        try {
            URI uri = new URI(baseUrl);
            if (uri.getHost() != null) {
                return normalizeTitle(uri.getHost().split("\\.")[0]);
            }
        } catch (URISyntaxException ignored) {
        }
        return "Imported Server";
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return "";
    }

    private String buildSnapshotJson(String sourceType, String sourceName, ImportedOperation operation) {
        try {
            return OBJECT_MAPPER.writeValueAsString(Map.of(
                    "sourceType", sourceType,
                    "sourceName", sourceName,
                    "endpoint", Map.of("name", operation.name(), "method", operation.method(), "path", operation.path(), "description", operation.description(), "mockEnabled", operation.mockEnabled()),
                    "parameters", operation.parameters(),
                    "responses", operation.responses()));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to build imported version snapshot", exception);
        }
    }

    private ProjectDetail requireWritableProject(Long userId, Long projectId) {
        ProjectDetail project = projectRepository.findProject(userId, projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        if (!project.canWrite()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Project write access denied");
        }
        return project;
    }

    private SpaceSummary requireWritableSpace(Long userId, Long spaceId) {
        return projectRepository.listSpaces(userId).stream()
                .filter(space -> space.id().equals(spaceId))
                .findFirst()
                .map(space -> {
                    if (!space.canCreateProject()) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Space project creation denied");
                    }
                    return space;
                })
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Space not found"));
    }

    private void validateSpecImportRequest(ImportSpecRequest request) {
        if (request == null || (normalizeNullableText(request.content()).isBlank() && normalizeNullableText(request.sourceUrl()).isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Import content or source URL is required");
        }
    }

    private void validateProjectImportRequest(ImportProjectRequest request) {
        if (request == null || request.projectName() == null || request.projectName().isBlank() || request.projectKey() == null || request.projectKey().isBlank()
                || (normalizeNullableText(request.content()).isBlank() && normalizeNullableText(request.sourceUrl()).isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Project name, project key and import content or source URL are required");
        }
    }

    private void validatePushImportRequest(String token, ImportSpecRequest request) {
        if (token == null || token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Push token is required");
        }
        validateSpecImportRequest(request);
    }

    private String key(Long id, String name) {
        return id + ":" + name.toLowerCase(Locale.ROOT);
    }

    private record ParsedSpec(String displayName, List<ImportedOperation> operations, List<ImportedServer> servers, List<String> warnings) {
    }

    private record ImportedOperation(
            String moduleName,
            String groupName,
            String name,
            String method,
            String path,
            String description,
            boolean mockEnabled,
            List<ParameterUpsertItem> parameters,
            List<ResponseUpsertItem> responses
    ) {
        private String routeKey() {
            return method + ":" + path;
        }
    }

    private record ImportedServer(String name, String baseUrl) {
    }

    private static final class ImportCounters {
        private int createdModules;
        private int createdGroups;
        private int createdEndpoints;
        private int updatedEndpoints;
        private int createdVersions;
        private int createdEnvironments;
    }

    private static final class PreviewCounters {
        private int createdModules;
        private int createdGroups;
        private int createdEndpoints;
        private int updatedEndpoints;
    }
}
