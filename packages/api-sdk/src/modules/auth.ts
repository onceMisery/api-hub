import { apiFetch } from "../client";

export type AuthSessionResponse = {
  accessToken: string;
  refreshToken: string;
};

export type AuthMe = {
  id: number;
  username: string;
  displayName: string;
  email: string | null;
};

export type UserSearchResult = {
  id: number;
  username: string;
  displayName: string;
  email: string | null;
};

export function login(payload: { username: string; password: string }) {
  return apiFetch<AuthSessionResponse>("/api/v1/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

export function refreshSession(payload: { refreshToken: string }) {
  return apiFetch<AuthSessionResponse>("/api/v1/auth/refresh", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

export function fetchMe() {
  return apiFetch<AuthMe>("/api/v1/auth/me");
}

export function searchUsers(query = "", limit = 20) {
  const params = new URLSearchParams();
  const normalizedQuery = query.trim();
  if (normalizedQuery) {
    params.set("q", normalizedQuery);
  }
  params.set("limit", String(limit));

  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<UserSearchResult[]>(`/api/v1/users/search${suffix}`);
}

export function logout() {
  return apiFetch<null>("/api/v1/auth/logout", {
    method: "POST"
  });
}
