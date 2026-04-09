import { apiFetch } from "../client";

export type ProjectSummary = {
  id: number;
  name: string;
  projectKey: string;
  description: string | null;
};

export type EndpointTreeItem = {
  id: number;
  name: string;
  method: string;
  path: string;
};

export type GroupTreeItem = {
  id: number;
  name: string;
  endpoints: EndpointTreeItem[];
};

export type ModuleTreeItem = {
  id: number;
  name: string;
  groups: GroupTreeItem[];
};

export type ProjectTree = {
  modules: ModuleTreeItem[];
};

export type EndpointDetail = {
  id: number;
  groupId: number;
  name: string;
  method: string;
  path: string;
  description: string | null;
};

export type VersionDetail = {
  id: number;
  endpointId: number;
  version: string;
  changeSummary: string | null;
  snapshotJson: string | null;
};

export type ModuleDetail = {
  id: number;
  projectId: number;
  name: string;
};

export type GroupDetail = {
  id: number;
  moduleId: number;
  name: string;
};

export type CreateModulePayload = {
  name: string;
};

export type CreateGroupPayload = {
  name: string;
};

export type CreateEndpointPayload = {
  name: string;
  method: string;
  path: string;
  description: string;
};

export type UpdateEndpointPayload = {
  name: string;
  method: string;
  path: string;
  description: string;
};

export function fetchProjects() {
  return apiFetch<ProjectSummary[]>("/api/v1/projects");
}

export function fetchProjectTree(projectId: number) {
  return apiFetch<ProjectTree>(`/api/v1/projects/${projectId}/tree`);
}

export function createModule(projectId: number, payload: CreateModulePayload) {
  return apiFetch<ModuleDetail>(`/api/v1/projects/${projectId}/modules`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function createGroup(moduleId: number, payload: CreateGroupPayload) {
  return apiFetch<GroupDetail>(`/api/v1/modules/${moduleId}/groups`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function createEndpoint(groupId: number, payload: CreateEndpointPayload) {
  return apiFetch<EndpointDetail>(`/api/v1/groups/${groupId}/endpoints`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchEndpoint(endpointId: number) {
  return apiFetch<EndpointDetail>(`/api/v1/endpoints/${endpointId}`);
}

export function updateEndpoint(endpointId: number, payload: UpdateEndpointPayload) {
  return apiFetch<EndpointDetail>(`/api/v1/endpoints/${endpointId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function fetchEndpointVersions(endpointId: number) {
  return apiFetch<VersionDetail[]>(`/api/v1/endpoints/${endpointId}/versions`);
}
