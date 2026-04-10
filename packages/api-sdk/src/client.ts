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

function buildHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers);

  if (!headers.has("Content-Type") && !(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (typeof window !== "undefined") {
    const accessToken = window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    if (accessToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  return headers;
}

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(input, {
    ...init,
    headers: buildHeaders(init)
  });

  if (!response.ok) {
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
