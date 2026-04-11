export type ApiResponse<T> = { code: number; message: string; data: T; traceId?: string };

export const ACCESS_TOKEN_STORAGE_KEY = "apihub.accessToken";
export const REFRESH_TOKEN_STORAGE_KEY = "apihub.refreshToken";

export class ApiRequestError extends Error {
  readonly status: number;
  readonly errorCode?: string;
  readonly data?: unknown;

  constructor(status: number, message: string, errorCode?: string, data?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.errorCode = errorCode;
    this.data = data;
  }
}

export function isApiRequestError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError;
}

type ApiFetchOptions = {
  skipAuthRefresh?: boolean;
  skipAuthorization?: boolean;
};

function buildHeaders(init?: RequestInit, options?: ApiFetchOptions): Headers {
  const headers = new Headers(init?.headers);

  if (!headers.has("Content-Type") && !(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (typeof window !== "undefined" && !options?.skipAuthorization) {
    const accessToken = readStoredToken(ACCESS_TOKEN_STORAGE_KEY);
    if (accessToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  return headers;
}

export async function apiFetch<T>(input: string, init?: RequestInit, options?: ApiFetchOptions): Promise<ApiResponse<T>> {
  return apiFetchInternal(input, init, options);
}

async function apiFetchInternal<T>(input: string, init?: RequestInit, options?: ApiFetchOptions): Promise<ApiResponse<T>> {
  const response = await fetch(input, {
    ...init,
    headers: buildHeaders(init, options)
  });

  if (!response.ok) {
    if (response.status === 401 && !options?.skipAuthRefresh && typeof window !== "undefined") {
      const refreshToken = readStoredToken(REFRESH_TOKEN_STORAGE_KEY);
      if (refreshToken) {
        try {
          const refreshResponse = await apiFetchInternal<{ accessToken: string; refreshToken: string }>(
            "/api/v1/auth/refresh",
            {
              method: "POST",
              body: JSON.stringify({ refreshToken })
            },
            {
              skipAuthRefresh: true,
              skipAuthorization: true
            }
          );

          writeStoredTokens(refreshResponse.data.accessToken, refreshResponse.data.refreshToken);
          return apiFetchInternal<T>(input, init, {
            ...options,
            skipAuthRefresh: true
          });
        } catch (refreshError) {
          clearStoredTokens();
          throw refreshError;
        }
      }

      clearStoredTokens();
    }

    const fallbackMessage = `Request failed with status ${response.status}`;
    let message = fallbackMessage;
    let errorCode: string | undefined;
    let data: unknown;

    try {
      const payload = (await response.json()) as Partial<ApiResponse<T>> & {
        data?: { errorCode?: unknown } | null;
      };
      message = payload.message ?? fallbackMessage;
      data = payload.data;
      errorCode = typeof payload.data?.errorCode === "string" ? payload.data.errorCode : undefined;
    } catch {
      message = fallbackMessage;
    }

    throw new ApiRequestError(response.status, message, errorCode, data);
  }

  return response.json();
}

function readStoredToken(storageKey: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(storageKey);
}

function writeStoredTokens(accessToken: string, refreshToken: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
}

function clearStoredTokens() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
}
