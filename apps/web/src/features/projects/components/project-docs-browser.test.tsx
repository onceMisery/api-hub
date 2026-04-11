import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const {
  ApiRequestError,
  mockReplace,
  fetchProject,
  fetchProjectTree,
  fetchEndpoint,
  fetchEndpointParameters,
  fetchEndpointResponses,
  fetchEndpointVersions,
  fetchEndpointMockReleases
} = vi.hoisted(() => ({
  ApiRequestError: class ApiRequestError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.name = "ApiRequestError";
      this.status = status;
    }
  },
  mockReplace: vi.fn(),
  fetchProject: vi.fn(),
  fetchProjectTree: vi.fn(),
  fetchEndpoint: vi.fn(),
  fetchEndpointParameters: vi.fn(),
  fetchEndpointResponses: vi.fn(),
  fetchEndpointVersions: vi.fn(),
  fetchEndpointMockReleases: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace
  })
}));

vi.mock("../../auth/components/session-bar", () => ({
  SessionBar: () => <div>Session Bar</div>
}));

vi.mock("@api-hub/api-sdk", () => ({
  fetchProject,
  fetchProjectTree,
  fetchEndpoint,
  fetchEndpointParameters,
  fetchEndpointResponses,
  fetchEndpointVersions,
  fetchEndpointMockReleases,
  ApiRequestError,
  isApiRequestError: (error: unknown) => error instanceof ApiRequestError
}));

import { ProjectDocsBrowser } from "./project-docs-browser";

describe("ProjectDocsBrowser", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    fetchProject.mockResolvedValue({
      data: {
        id: 1,
        name: "Default Project",
        projectKey: "default",
        description: "Read-only contract browsing surface",
        debugAllowedHosts: [],
        currentUserRole: "viewer",
        canWrite: false,
        canManageMembers: false
      }
    });

    fetchProjectTree.mockResolvedValue({
      data: {
        modules: [
          {
            id: 11,
            name: "Core",
            groups: [
              {
                id: 21,
                name: "Users",
                endpoints: [
                  { id: 31, name: "Get User", method: "GET", path: "/users/{id}" },
                  { id: 32, name: "Create User", method: "POST", path: "/users" }
                ]
              }
            ]
          }
        ]
      }
    });

    fetchEndpoint.mockImplementation(async (endpointId: number) => ({
      data: {
        id: endpointId,
        groupId: 21,
        name: endpointId === 32 ? "Create User" : "Get User",
        method: endpointId === 32 ? "POST" : "GET",
        path: endpointId === 32 ? "/users" : "/users/{id}",
        description: endpointId === 32 ? "Create a new user record." : "Load one user by id.",
        mockEnabled: endpointId === 32,
        status: endpointId === 32 ? "draft" : "released",
        releasedVersionId: endpointId === 32 ? null : 2,
        releasedVersionLabel: endpointId === 32 ? null : "v2",
        releasedAt: endpointId === 32 ? null : "2026-04-11T09:30:00Z"
      }
    }));

    fetchEndpointParameters.mockImplementation(async (endpointId: number) => ({
      data:
        endpointId === 32
          ? [
              {
                id: 2,
                sectionType: "body",
                name: "email",
                dataType: "string",
                required: true,
                description: "Email address",
                exampleValue: "user@example.com",
                sortOrder: 0
              }
            ]
          : [
              {
                id: 1,
                sectionType: "path",
                name: "id",
                dataType: "long",
                required: true,
                description: "User identifier",
                exampleValue: "1001",
                sortOrder: 0
              }
            ]
    }));

    fetchEndpointResponses.mockImplementation(async (endpointId: number) => ({
      data:
        endpointId === 32
          ? [
              {
                id: 22,
                httpStatusCode: 201,
                mediaType: "application/json",
                name: "userId",
                dataType: "string",
                required: true,
                description: "Created user id",
                exampleValue: "u_1001",
                sortOrder: 0
              }
            ]
          : [
              {
                id: 11,
                httpStatusCode: 200,
                mediaType: "application/json",
                name: "displayName",
                dataType: "string",
                required: true,
                description: "Resolved name",
                exampleValue: "Ada",
                sortOrder: 0
              }
            ]
    }));

    fetchEndpointVersions.mockImplementation(async (endpointId: number) => ({
      data:
        endpointId === 32
          ? [
              {
                id: 3,
                endpointId: 32,
                version: "v1",
                changeSummary: "Initial creation snapshot",
                snapshotJson: "{}",
                released: false
              }
            ]
          : [
              {
                id: 2,
                endpointId: 31,
                version: "v2",
                changeSummary: "Live contract",
                snapshotJson: "{}",
                released: true,
                releasedAt: "2026-04-11T09:30:00Z"
              },
              {
                id: 1,
                endpointId: 31,
                version: "v1",
                changeSummary: "Initial release",
                snapshotJson: "{}",
                released: false
              }
            ]
    }));

    fetchEndpointMockReleases.mockImplementation(async (endpointId: number) => ({
      data:
        endpointId === 32
          ? []
          : [
              {
                id: 6,
                endpointId: 31,
                releaseNo: 3,
                responseSnapshotJson: "[]",
                rulesSnapshotJson: "[]",
                createdAt: "2026-04-11T08:30:00Z"
              }
            ]
    }));
  });

  it("loads the project hero and the first endpoint documentation by default", async () => {
    render(<ProjectDocsBrowser projectId={1} />);

    expect(await screen.findByText("Default Project")).toBeInTheDocument();
    expect(screen.getByText("Read-only contract browsing surface")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Get User" })).toBeInTheDocument();
    expect(screen.getByText("/users/{id}")).toBeInTheDocument();
    expect(screen.getByText("Load one user by id.")).toBeInTheDocument();

    await waitFor(() => expect(fetchEndpoint).toHaveBeenCalledWith(31));
  });

  it("filters the tree and focuses the first visible endpoint", async () => {
    render(<ProjectDocsBrowser projectId={1} />);

    expect(await screen.findByRole("heading", { name: "Get User" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search docs"), { target: { value: "create" } });

    await waitFor(() => expect(fetchEndpoint).toHaveBeenCalledWith(32));
    expect(await screen.findByRole("heading", { name: "Create User" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Get User" })).not.toBeInTheDocument();
  });

  it("renders grouped contract details, version posture, and latest mock release", async () => {
    render(<ProjectDocsBrowser projectId={1} />);

    expect(await screen.findByText("Path parameters")).toBeInTheDocument();
    expect(screen.getByText("User identifier")).toBeInTheDocument();
    expect(screen.getByText("HTTP 200")).toBeInTheDocument();
    expect(screen.getByText("Live version")).toBeInTheDocument();
    expect(screen.getByText("v2")).toBeInTheDocument();
    expect(screen.getByText("Release #3")).toBeInTheDocument();

    const versionCard = screen.getByRole("region", { name: "Version posture" });
    expect(within(versionCard).getByText("Live contract")).toBeInTheDocument();
  });

  it("redirects to login when the project request is unauthorized", async () => {
    fetchProject.mockRejectedValueOnce(new ApiRequestError(401, "Unauthorized"));

    render(<ProjectDocsBrowser projectId={1} />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/login"));
  });
});
