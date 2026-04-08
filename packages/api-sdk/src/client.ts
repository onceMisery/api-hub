export type ApiResponse<T> = { code: number; message: string; data: T; traceId?: string };

export const ACCESS_TOKEN_STORAGE_KEY = "apihub.accessToken";
export const REFRESH_TOKEN_STORAGE_KEY = "apihub.refreshToken";

export class ApiRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
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

    try {
      const payload = (await response.json()) as Partial<ApiResponse<T>>;
      message = payload.message ?? fallbackMessage;
    } catch {
      message = fallbackMessage;
    }

    throw new ApiRequestError(response.status, message);
  }

  return response.json();
}
