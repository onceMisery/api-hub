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

export function fetchProjects() {
  return apiFetch<ProjectSummary[]>("/api/v1/projects");
}

export function fetchProjectTree(projectId: number) {
  return apiFetch<ProjectTree>(`/api/v1/projects/${projectId}/tree`);
}

export function fetchEndpoint(endpointId: number) {
  return apiFetch<EndpointDetail>(`/api/v1/endpoints/${endpointId}`);
}

export function fetchEndpointVersions(endpointId: number) {
  return apiFetch<VersionDetail[]>(`/api/v1/endpoints/${endpointId}/versions`);
}
