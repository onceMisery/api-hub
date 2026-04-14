import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchProjects } from "@api-hub/api-sdk";

describe("auth session refresh", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("refreshes tokens once and retries the original request", async () => {
    window.localStorage.setItem("apihub.accessToken", "expired-access");
    window.localStorage.setItem("apihub.refreshToken", "valid-refresh");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 401, message: "Unauthorized", data: null }), { status: 401 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 0,
            message: "ok",
            data: { accessToken: "new-access", refreshToken: "new-refresh" }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 0,
            message: "ok",
            data: [{ id: 1, name: "Default Project", projectKey: "default", description: "Seed", debugAllowedHosts: [] }]
          }),
          { status: 200 }
        )
      );

    vi.stubGlobal("fetch", fetchMock);

    const response = await fetchProjects();

    expect(response.data[0].projectKey).toBe("default");
    expect(window.localStorage.getItem("apihub.accessToken")).toBe("new-access");
    expect(window.localStorage.getItem("apihub.refreshToken")).toBe("new-refresh");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/v1/auth/refresh");
    expect(fetchMock.mock.calls[2]?.[0]).toBe("/api/v1/projects");
  });

  it("clears local tokens when refresh also fails", async () => {
    window.localStorage.setItem("apihub.accessToken", "expired-access");
    window.localStorage.setItem("apihub.refreshToken", "expired-refresh");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 401, message: "Unauthorized", data: null }), { status: 401 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 401, message: "Refresh token invalid", data: null }), { status: 401 })
      );

    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchProjects()).rejects.toMatchObject({ status: 401 });
    expect(window.localStorage.getItem("apihub.accessToken")).toBeNull();
    expect(window.localStorage.getItem("apihub.refreshToken")).toBeNull();
  });
});
