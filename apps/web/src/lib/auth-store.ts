import { ACCESS_TOKEN_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY } from "@api-hub/api-sdk";

export function saveTokens(accessToken: string, refreshToken: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
}

export function clearTokens() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function getAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function loadTokens() {
  if (typeof window === "undefined") {
    return {
      accessToken: null,
      refreshToken: null
    };
  }

  return {
    accessToken: window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY),
    refreshToken: window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
  };
}
