import { apiFetch } from "../client";

export type MockAccessMode = "private" | "token" | "public";

export type ProjectMockAccessSettings = {
  mode: MockAccessMode;
  token: string | null;
};

export type ProjectMockCenterItem = {
  endpointId: number;
  endpointName: string;
  method: string;
  path: string;
  moduleName: string | null;
  groupName: string | null;
  mockEnabled: boolean;
  latestReleaseNo: number | null;
  latestReleaseAt: string | null;
  draftChanged: boolean;
  totalRuleCount: number;
  enabledRuleCount: number;
  responseFieldCount: number;
};

export type ProjectMockCenter = {
  settings: ProjectMockAccessSettings;
  items: ProjectMockCenterItem[];
};

export type UpdateProjectMockAccessPayload = {
  mode: MockAccessMode;
  token?: string | null;
  regenerateToken?: boolean;
};

export type ProjectMockPublishResult = {
  endpointId: number;
  latestReleaseNo: number;
};

export function fetchProjectMockCenter(projectId: number) {
  return apiFetch<ProjectMockCenter>(`/api/v1/projects/${projectId}/mock-center`);
}

export function updateProjectMockAccess(projectId: number, payload: UpdateProjectMockAccessPayload) {
  return apiFetch<ProjectMockAccessSettings>(`/api/v1/projects/${projectId}/mock-access`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function publishProjectMockCenterEndpoint(projectId: number, endpointId: number) {
  return apiFetch<ProjectMockPublishResult>(`/api/v1/projects/${projectId}/mock-center/endpoints/${endpointId}/publish`, {
    method: "POST"
  });
}
