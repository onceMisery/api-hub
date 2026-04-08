export type ApiResponse<T> = { code: number; message: string; data: T; traceId?: string };

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(input, init);
  return response.json();
}
