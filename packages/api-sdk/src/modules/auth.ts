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

export function logout() {
  return apiFetch<null>("/api/v1/auth/logout", {
    method: "POST"
  });
}
