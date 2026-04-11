import {
  fetchProjectMockCenter,
  publishProjectMockCenterEndpoint,
  updateProjectMockAccess
} from "@api-hub/api-sdk";

describe("mock center sdk", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("calls the mock center and access routes with the expected payloads", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 0,
            message: "ok",
            data: {
              settings: {
                mode: "token",
                token: "preview_token"
              },
              items: []
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
              mode: "public",
              token: "preview_token"
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
              endpointId: 44,
              latestReleaseNo: 5
            }
          }),
          { status: 200 }
        )
      );

    vi.stubGlobal("fetch", fetchMock);

    await fetchProjectMockCenter(9);
    await updateProjectMockAccess(9, {
      mode: "public"
    });
    await publishProjectMockCenterEndpoint(9, 44);

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/projects/9/mock-center");
    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty("body");

    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/v1/projects/9/mock-access");
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: "PATCH",
      body: JSON.stringify({
        mode: "public"
      })
    });

    expect(fetchMock.mock.calls[2]?.[0]).toBe("/api/v1/projects/9/mock-center/endpoints/44/publish");
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      method: "POST"
    });
  });
});
