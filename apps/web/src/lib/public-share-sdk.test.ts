import {
  createProjectShareLink,
  fetchProjectShareLinks,
  fetchPublicShare,
  fetchPublicShareEndpoint,
  updateProjectShareLink
} from "@api-hub/api-sdk";

describe("public share sdk", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("calls the authenticated share link routes with the expected methods and payloads", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 0, message: "ok", data: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 0,
            message: "ok",
            data: {
              id: 3,
              projectId: 7,
              shareCode: "share_abc123",
              name: "External reviewers",
              description: "Read-only contract access",
              enabled: true,
              expiresAt: "2026-04-30T12:00:00Z",
              createdAt: "2026-04-11T08:00:00Z",
              updatedAt: "2026-04-11T08:00:00Z"
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 0,
            message: "ok",
            data: {
              id: 3,
              projectId: 7,
              shareCode: "share_abc123",
              name: "External reviewers",
              description: "Read-only contract access",
              enabled: false,
              expiresAt: null,
              createdAt: "2026-04-11T08:00:00Z",
              updatedAt: "2026-04-11T08:10:00Z"
            }
          }),
          { status: 200 }
        )
      );

    vi.stubGlobal("fetch", fetchMock);

    await fetchProjectShareLinks(7);
    await createProjectShareLink(7, {
      name: "External reviewers",
      description: "Read-only contract access",
      expiresAt: "2026-04-30T12:00:00Z"
    });
    await updateProjectShareLink(7, 3, {
      enabled: false,
      expiresAt: null
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/projects/7/share-links");
    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty("body");

    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/v1/projects/7/share-links");
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({
        name: "External reviewers",
        description: "Read-only contract access",
        expiresAt: "2026-04-30T12:00:00Z"
      })
    });

    expect(fetchMock.mock.calls[2]?.[0]).toBe("/api/v1/projects/7/share-links/3");
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      method: "PATCH",
      body: JSON.stringify({
        enabled: false,
        expiresAt: null
      })
    });
  });

  it("calls the anonymous public share routes", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 0,
            message: "ok",
            data: {
              share: {
                id: 3,
                projectId: 7,
                shareCode: "share_abc123",
                name: "External reviewers",
                description: "Read-only contract access",
                enabled: true,
                expiresAt: "2026-04-30T12:00:00Z",
                createdAt: "2026-04-11T08:00:00Z",
                updatedAt: "2026-04-11T08:00:00Z"
              },
              project: {
                id: 7,
                name: "Payments API",
                projectKey: "payments",
                description: "Public docs surface"
              },
              tree: {
                modules: []
              }
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 0,
            message: "ok",
            data: {
              endpoint: {
                id: 21,
                groupId: 4,
                name: "Create invoice",
                method: "POST",
                path: "/invoices",
                description: "Create invoice",
                mockEnabled: true
              },
              parameters: [],
              responses: [],
              versions: [],
              mockReleases: []
            }
          }),
          { status: 200 }
        )
      );

    vi.stubGlobal("fetch", fetchMock);

    await fetchPublicShare("share_abc123");
    await fetchPublicShareEndpoint("share_abc123", 21);

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/public/shares/share_abc123");
    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty("body");

    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/public/shares/share_abc123/endpoints/21");
    expect(fetchMock.mock.calls[1]?.[1]).not.toHaveProperty("body");
  });

  it("does not attach auth headers or trigger token refresh for public share routes", async () => {
    window.localStorage.setItem("apihub.accessToken", "access-token");
    window.localStorage.setItem("apihub.refreshToken", "refresh-token");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 0,
            message: "ok",
            data: {
              share: {
                id: 3,
                projectId: 7,
                shareCode: "share_abc123",
                name: "External reviewers",
                description: "Read-only contract access",
                enabled: true,
                expiresAt: null,
                createdAt: "2026-04-11T08:00:00Z",
                updatedAt: "2026-04-11T08:00:00Z"
              },
              project: {
                id: 7,
                name: "Payments API",
                projectKey: "payments",
                description: "Public docs surface"
              },
              tree: {
                modules: []
              }
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 1, message: "Unauthorized", data: null }), { status: 401 }));

    vi.stubGlobal("fetch", fetchMock);

    await fetchPublicShare("share_abc123");
    await expect(fetchPublicShareEndpoint("share_abc123", 21)).rejects.toThrow("Unauthorized");

    const firstHeaders = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(firstHeaders.get("Authorization")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.some((call) => call[0] === "/api/v1/auth/refresh")).toBe(false);
  });
});
