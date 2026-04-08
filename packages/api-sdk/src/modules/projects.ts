import { apiFetch } from "../client";

export function fetchProjects(spaceId: number) {
  return apiFetch<{ records: Array<{ id: number; name: string }> }>(`/api/v1/spaces/${spaceId}/projects`);
}
