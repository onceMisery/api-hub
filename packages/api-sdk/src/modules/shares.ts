import { apiFetch } from "../client";
import type {
  EndpointDetail,
  MockReleaseDetail,
  ModuleTreeItem,
  ParameterDetail,
  ResponseDetail,
  VersionDetail
} from "./projects";

export type ShareLinkDetail = {
  id: number;
  projectId: number;
  shareCode: string;
  name: string;
  description: string | null;
  enabled: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateProjectShareLinkPayload = {
  name: string;
  description: string;
  expiresAt: string | null;
};

export type UpdateProjectShareLinkPayload = {
  name?: string;
  description?: string | null;
  enabled?: boolean;
  expiresAt?: string | null;
  clearExpiry?: boolean;
};

export type PublicShareProjectSummary = {
  id: number;
  name: string;
  projectKey: string;
  description: string | null;
};

export type PublicShareShell = {
  share: ShareLinkDetail;
  project: PublicShareProjectSummary;
  tree: {
    modules: ModuleTreeItem[];
  };
};

export type PublicShareEndpointBundle = {
  endpoint: EndpointDetail;
  parameters: ParameterDetail[];
  responses: ResponseDetail[];
  versions: VersionDetail[];
  mockReleases: MockReleaseDetail[];
};

export function fetchProjectShareLinks(projectId: number) {
  return apiFetch<ShareLinkDetail[]>(`/api/v1/projects/${projectId}/share-links`);
}

export function createProjectShareLink(projectId: number, payload: CreateProjectShareLinkPayload) {
  return apiFetch<ShareLinkDetail>(`/api/v1/projects/${projectId}/share-links`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateProjectShareLink(projectId: number, shareLinkId: number, payload: UpdateProjectShareLinkPayload) {
  return apiFetch<ShareLinkDetail>(`/api/v1/projects/${projectId}/share-links/${shareLinkId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function fetchPublicShare(shareCode: string) {
  return apiFetch<PublicShareShell>(`/api/public/shares/${shareCode}`, undefined, {
    skipAuthorization: true,
    skipAuthRefresh: true
  });
}

export function fetchPublicShareEndpoint(shareCode: string, endpointId: number) {
  return apiFetch<PublicShareEndpointBundle>(`/api/public/shares/${shareCode}/endpoints/${endpointId}`, undefined, {
    skipAuthorization: true,
    skipAuthRefresh: true
  });
}
