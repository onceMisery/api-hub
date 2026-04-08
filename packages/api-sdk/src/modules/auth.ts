import { apiFetch } from "../client";

export function login(payload: { username: string; password: string }) {
  return apiFetch<{ accessToken: string; refreshToken: string }>("/api/v1/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}
