package com.apihub.project.model;

import com.apihub.doc.model.EndpointDetail;

import java.util.List;

public final class ProjectDtos {

    private ProjectDtos() {
    }

    public record CreateProjectRequest(String name, String projectKey, String description) {
    }

    public record UpdateProjectRequest(String name, String description) {
    }

    public record ProjectDetail(Long id, String name, String projectKey, String description) {
    }

    public record ProjectTreeResponse(List<ModuleTreeItem> modules) {
    }

    public record ModuleTreeItem(Long id, String name, List<GroupTreeItem> groups) {
    }

    public record GroupTreeItem(Long id, String name, List<EndpointTreeItem> endpoints) {
    }

    public record EndpointTreeItem(Long id, String name, String method, String path) {
    }

    public record CreateModuleRequest(String name) {
    }

    public record UpdateModuleRequest(String name) {
    }

    public record ModuleDetail(Long id, Long projectId, String name) {
    }

    public record CreateGroupRequest(String name) {
    }

    public record UpdateGroupRequest(String name) {
    }

    public record GroupDetail(Long id, Long moduleId, String name) {
    }

    public record EnvironmentEntry(String name, String value) {
    }

    public record CreateEnvironmentRequest(
            String name,
            String baseUrl,
            Boolean isDefault,
            List<EnvironmentEntry> variables,
            List<EnvironmentEntry> defaultHeaders,
            List<EnvironmentEntry> defaultQuery,
            String authMode,
            String authKey,
            String authValue
    ) {
    }

    public record UpdateEnvironmentRequest(
            String name,
            String baseUrl,
            Boolean isDefault,
            List<EnvironmentEntry> variables,
            List<EnvironmentEntry> defaultHeaders,
            List<EnvironmentEntry> defaultQuery,
            String authMode,
            String authKey,
            String authValue
    ) {
    }

    public record EnvironmentDetail(
            Long id,
            Long projectId,
            String name,
            String baseUrl,
            boolean isDefault,
            List<EnvironmentEntry> variables,
            List<EnvironmentEntry> defaultHeaders,
            List<EnvironmentEntry> defaultQuery,
            String authMode,
            String authKey,
            String authValue
    ) {
    }

    public record EndpointListResponse(List<EndpointDetail> endpoints) {
    }
}
