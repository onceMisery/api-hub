import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const {
  mockReplace,
  fetchProject,
  updateProject,
  fetchProjectTree,
  fetchEndpoint,
  fetchEndpointMockRules,
  fetchEndpointMockReleases,
  fetchEndpointParameters,
  fetchEndpointResponses,
  fetchEndpointVersions,
  fetchDebugHistory,
  clearDebugHistory,
  fetchEnvironments,
  executeDebug,
  createModule,
  createEnvironment,
  fetchProjectMembers,
  updateModule,
  updateEnvironment,
  saveProjectMember,
  deleteModule,
  createGroup,
  updateGroup,
  deleteGroup,
  createEndpoint,
  updateEndpoint,
  deleteProjectMember,
  deleteEndpoint,
  deleteEnvironment,
  replaceEndpointParameters,
  replaceEndpointMockRules,
  replaceEndpointResponses,
  createVersion,
  publishEndpointMockRelease,
  simulateEndpointMock
} = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  fetchProject: vi.fn(),
  updateProject: vi.fn(),
  fetchProjectTree: vi.fn(),
  fetchEndpoint: vi.fn(),
  fetchEndpointMockRules: vi.fn(),
  fetchEndpointMockReleases: vi.fn(),
  fetchEndpointParameters: vi.fn(),
  fetchEndpointResponses: vi.fn(),
  fetchEndpointVersions: vi.fn(),
  fetchDebugHistory: vi.fn(),
  clearDebugHistory: vi.fn(),
  fetchEnvironments: vi.fn(),
  executeDebug: vi.fn(),
  createModule: vi.fn(),
  createEnvironment: vi.fn(),
  fetchProjectMembers: vi.fn(),
  updateModule: vi.fn(),
  updateEnvironment: vi.fn(),
  saveProjectMember: vi.fn(),
  deleteModule: vi.fn(),
  createGroup: vi.fn(),
  updateGroup: vi.fn(),
  deleteGroup: vi.fn(),
  createEndpoint: vi.fn(),
  updateEndpoint: vi.fn(),
  deleteProjectMember: vi.fn(),
  deleteEndpoint: vi.fn(),
  deleteEnvironment: vi.fn(),
  replaceEndpointParameters: vi.fn(),
  replaceEndpointMockRules: vi.fn(),
  replaceEndpointResponses: vi.fn(),
  createVersion: vi.fn(),
  publishEndpointMockRelease: vi.fn(),
  simulateEndpointMock: vi.fn()
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
  updateProject,
  fetchProjectTree,
  fetchEndpoint,
  fetchEndpointMockRules,
  fetchEndpointMockReleases,
  fetchEndpointParameters,
  fetchEndpointResponses,
  fetchEndpointVersions,
  fetchDebugHistory,
  clearDebugHistory,
  fetchEnvironments,
  executeDebug,
  createModule,
  createEnvironment,
  fetchProjectMembers,
  updateModule,
  updateEnvironment,
  saveProjectMember,
  deleteModule,
  createGroup,
  updateGroup,
  deleteGroup,
  createEndpoint,
  updateEndpoint,
  deleteProjectMember,
  deleteEndpoint,
  deleteEnvironment,
  replaceEndpointParameters,
  replaceEndpointMockRules,
  replaceEndpointResponses,
  createVersion,
  publishEndpointMockRelease,
  simulateEndpointMock,
  ApiRequestError: class ApiRequestError extends Error {
    status: number;
    errorCode?: string;
    data?: unknown;

    constructor(status: number, message: string, errorCode?: string, data?: unknown) {
      super(message);
      this.name = "ApiRequestError";
      this.status = status;
      this.errorCode = errorCode;
      this.data = data;
    }
  },
  isApiRequestError: () => false
}));

import { ProjectShell } from "./project-shell";

describe("ProjectShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();

    fetchProject.mockResolvedValue({
      data: {
        id: 1,
        name: "Default Project",
        projectKey: "default",
        description: "Seed project",
        debugAllowedHosts: [{ pattern: "*.corp.example.com", allowPrivate: false }],
        currentUserRole: "project_admin",
        canWrite: true,
        canManageMembers: true
      }
    });

    fetchProjectTree
      .mockResolvedValueOnce({
        data: {
          modules: [
            {
              id: 11,
              name: "Core",
              groups: [
                {
                  id: 21,
                  name: "Users",
                  endpoints: [{ id: 31, name: "Get User", method: "GET", path: "/users/{id}" }]
                }
              ]
            }
          ]
        }
      })
      .mockResolvedValueOnce({
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
                    { id: 99, name: "Create User", method: "POST", path: "/users" }
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
        name: endpointId === 99 ? "Create User" : "Get User",
        method: endpointId === 99 ? "POST" : "GET",
        path: endpointId === 99 ? "/users" : "/users/{id}",
        description: "Endpoint detail",
        mockEnabled: false
      }
    }));

    fetchEndpointParameters.mockResolvedValue({ data: [] });
    fetchEndpointResponses.mockResolvedValue({ data: [] });
    fetchEndpointMockRules.mockResolvedValue({ data: [] });
    fetchEndpointMockReleases.mockResolvedValue({ data: [] });
    fetchEndpointVersions.mockResolvedValue({ data: [] });
    fetchDebugHistory.mockResolvedValue({ data: [] });
    clearDebugHistory.mockResolvedValue({ data: { deletedCount: 1 } });
    fetchEnvironments.mockResolvedValue({
      data: [{ id: 41, projectId: 1, name: "Local", baseUrl: "https://local.dev", isDefault: true, variables: [], defaultHeaders: [], defaultQuery: [], authMode: "none", authKey: "", authValue: "", debugHostMode: "inherit", debugAllowedHosts: [] }]
    });
    executeDebug.mockResolvedValue({
      data: {
        durationMs: 48,
        finalUrl: "https://local.dev/users/{id}?verbose=true",
        method: "GET",
        responseBody: "{\"ok\":true}",
        responseHeaders: [{ name: "content-type", value: "application/json" }],
        statusCode: 200
      }
    });
    createModule.mockResolvedValue({ data: { id: 11, projectId: 1, name: "Core" } });
    createEnvironment.mockResolvedValue({
      data: {
        id: 42,
        projectId: 1,
        name: "Staging",
        baseUrl: "https://staging.dev",
        isDefault: false,
        variables: [],
        defaultHeaders: [],
        defaultQuery: [],
        authMode: "none",
        authKey: "",
        authValue: "",
        debugHostMode: "inherit",
        debugAllowedHosts: []
      }
    });
    updateProject.mockResolvedValue({
      data: {
        id: 1,
        name: "Default Project",
        projectKey: "default",
        description: "Seed project",
        debugAllowedHosts: [{ pattern: "10.10.1.8", allowPrivate: true }],
        currentUserRole: "project_admin",
        canWrite: true,
        canManageMembers: true
      }
    });
    updateModule.mockResolvedValue({ data: { id: 11, projectId: 1, name: "Core" } });
    updateEnvironment.mockResolvedValue({ data: { id: 41, projectId: 1, name: "Local", baseUrl: "https://local.dev", isDefault: true, variables: [], defaultHeaders: [], defaultQuery: [], authMode: "none", authKey: "", authValue: "", debugHostMode: "inherit", debugAllowedHosts: [] } });
    fetchProjectMembers.mockResolvedValue({
      data: [
        { userId: 1, username: "admin", displayName: "Administrator", email: "admin@local.dev", roleCode: "project_admin", owner: true },
        { userId: 3, username: "editor", displayName: "Editor User", email: "editor@local.dev", roleCode: "editor", owner: false }
      ]
    });
    saveProjectMember.mockResolvedValue({
      data: { userId: 2, username: "viewer", displayName: "Viewer User", email: "viewer@local.dev", roleCode: "viewer", owner: false }
    });
    deleteModule.mockResolvedValue({ data: null });
    createGroup.mockResolvedValue({ data: { id: 21, moduleId: 11, name: "Users" } });
    updateGroup.mockResolvedValue({ data: { id: 21, moduleId: 11, name: "Users" } });
    deleteGroup.mockResolvedValue({ data: null });
    createEndpoint.mockResolvedValue({
      data: {
        id: 99,
        groupId: 21,
        name: "Create User",
        method: "POST",
        path: "/users",
        description: "Create user endpoint",
        mockEnabled: false
      }
    });
    updateEndpoint.mockResolvedValue({
      data: {
        id: 31,
        groupId: 21,
        name: "Get User",
        method: "GET",
        path: "/users/{id}",
        description: "Updated",
        mockEnabled: false
      }
    });
    deleteEndpoint.mockResolvedValue({ data: null });
    deleteProjectMember.mockResolvedValue({ data: null });
    deleteEnvironment.mockResolvedValue({ data: null });
    replaceEndpointParameters.mockResolvedValue({ data: null });
    replaceEndpointMockRules.mockResolvedValue({ data: null });
    replaceEndpointResponses.mockResolvedValue({ data: null });
    publishEndpointMockRelease.mockResolvedValue({
      data: {
        id: 8,
        endpointId: 31,
        releaseNo: 3,
        responseSnapshotJson: "[]",
        rulesSnapshotJson: "[]",
        createdAt: "2026-04-09T12:12:00Z"
      }
    });
    simulateEndpointMock.mockResolvedValue({
      data: {
        source: "default-response",
        matchedRuleName: null,
        matchedRulePriority: null,
        explanations: ["No rule matched; fallback to draft default response"],
        ruleTraces: [],
        statusCode: 200,
        mediaType: "application/json",
        body: "{\"ok\":true}"
      }
    });
    createVersion.mockResolvedValue({
      data: {
        id: 2,
        endpointId: 31,
        version: "v2",
        changeSummary: "Added editable schema",
        snapshotJson: "{}"
      }
    });
  });

  it("refreshes the tree and focuses the created endpoint", async () => {
    render(<ProjectShell projectId={1} />);

    expect(await screen.findByText("Get User")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("New endpoint name"), { target: { value: "Create User" } });
    fireEvent.change(screen.getByLabelText("New endpoint method"), { target: { value: "POST" } });
    fireEvent.change(screen.getByLabelText("New endpoint path"), { target: { value: "/users" } });
    fireEvent.click(screen.getByRole("button", { name: "Add endpoint" }));

    await waitFor(() =>
      expect(createEndpoint).toHaveBeenCalledWith(21, {
        description: "",
        method: "POST",
        mockEnabled: false,
        name: "Create User",
        path: "/users"
      })
    );

    await waitFor(() => expect(fetchProjectTree).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("button", { name: "Create User POST /users" })).toBeInTheDocument();
    await waitFor(() => expect(fetchEndpoint).toHaveBeenLastCalledWith(99));
  });

  it("renames and deletes an endpoint from the tree", async () => {
    fetchProjectTree
      .mockReset()
      .mockResolvedValueOnce({
        data: {
          modules: [
            {
              id: 11,
              name: "Core",
              groups: [
                {
                  id: 21,
                  name: "Users",
                  endpoints: [{ id: 31, name: "Get User", method: "GET", path: "/users/{id}" }]
                }
              ]
            }
          ]
        }
      })
      .mockResolvedValueOnce({
        data: {
          modules: [
            {
              id: 11,
              name: "Core",
              groups: [
                {
                  id: 21,
                  name: "Users",
                  endpoints: [{ id: 31, name: "Get User Detail", method: "GET", path: "/users/{userId}" }]
                }
              ]
            }
          ]
        }
      })
      .mockResolvedValueOnce({
        data: {
          modules: [
            {
              id: 11,
              name: "Core",
              groups: [
                {
                  id: 21,
                  name: "Users",
                  endpoints: []
                }
              ]
            }
          ]
        }
      });

    updateEndpoint.mockResolvedValueOnce({
      data: {
        id: 31,
        groupId: 21,
        name: "Get User Detail",
        method: "GET",
        path: "/users/{userId}",
        description: "Endpoint detail",
        mockEnabled: false
      }
    });

    render(<ProjectShell projectId={1} />);

    expect(await screen.findByText("Get User")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Endpoint 31 name"), { target: { value: "Get User Detail" } });
    fireEvent.change(screen.getByLabelText("Endpoint 31 path"), { target: { value: "/users/{userId}" } });
    fireEvent.click(screen.getByRole("button", { name: "Rename endpoint 31" }));

    await waitFor(() =>
      expect(updateEndpoint).toHaveBeenCalledWith(31, {
        description: "Endpoint detail",
        method: "GET",
        mockEnabled: false,
        name: "Get User Detail",
        path: "/users/{userId}"
      })
    );

    await waitFor(() => expect(fetchProjectTree).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("button", { name: "Get User Detail GET /users/{userId}" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete endpoint 31" }));

    await waitFor(() => expect(deleteEndpoint).toHaveBeenCalledWith(31));
    await waitFor(() => expect(fetchProjectTree).toHaveBeenCalledTimes(3));
    expect(screen.getByText("Pick an endpoint")).toBeInTheDocument();
  });

  it("restores a historical version into the current endpoint workspace", async () => {
    fetchEndpoint.mockReset();
    fetchEndpoint
      .mockResolvedValueOnce({
        data: {
          id: 31,
          groupId: 21,
          name: "Get User",
          method: "GET",
          path: "/users/{id}",
          description: "Endpoint detail",
          mockEnabled: false
        }
      })
      .mockResolvedValueOnce({
        data: {
          id: 31,
          groupId: 21,
          name: "Get User Legacy",
          method: "POST",
          path: "/legacy/users",
          description: "Legacy",
          mockEnabled: false
        }
      });
    fetchEndpointParameters
      .mockReset()
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({
        data: [
          {
            id: 77,
            sectionType: "query",
            name: "expand",
            dataType: "string",
            required: false,
            description: "",
            exampleValue: "team",
            sortOrder: 0
          }
        ]
      });
    fetchEndpointResponses
      .mockReset()
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({
        data: [
          {
            id: 88,
            httpStatusCode: 202,
            mediaType: "application/json",
            name: "jobId",
            dataType: "string",
            required: true,
            description: "",
            exampleValue: "job_1",
            sortOrder: 0
          }
        ]
      });
    fetchEndpointVersions.mockResolvedValueOnce({
      data: [
        {
          id: 2,
          endpointId: 31,
          version: "v2",
          changeSummary: "Latest",
          snapshotJson: "{}"
        },
        {
          id: 1,
          endpointId: 31,
          version: "v1",
          changeSummary: "Rollback target",
          snapshotJson: JSON.stringify({
            endpoint: {
              name: "Get User Legacy",
              method: "POST",
              path: "/legacy/users",
              description: "Legacy"
            },
            parameters: [
              {
                sectionType: "query",
                name: "expand",
                dataType: "string",
                required: false,
                description: "",
                exampleValue: "team"
              }
            ],
            responses: [
              {
                httpStatusCode: 202,
                mediaType: "application/json",
                name: "jobId",
                dataType: "string",
                required: true,
                description: "",
                exampleValue: "job_1"
              }
            ]
          })
        }
      ]
    });

    render(<ProjectShell projectId={1} />);

    fireEvent.click((await screen.findAllByRole("button", { name: "Restore snapshot v1" }))[0]);

    await waitFor(() =>
      expect(updateEndpoint).toHaveBeenCalledWith(31, {
        description: "Legacy",
        method: "POST",
        mockEnabled: false,
        name: "Get User Legacy",
        path: "/legacy/users"
      })
    );
    await waitFor(() =>
      expect(replaceEndpointParameters).toHaveBeenCalledWith(31, [
        {
          sectionType: "query",
          name: "expand",
          dataType: "string",
          required: false,
          description: "",
          exampleValue: "team"
        }
      ])
    );
    await waitFor(() =>
      expect(replaceEndpointResponses).toHaveBeenCalledWith(31, [
        {
          httpStatusCode: 202,
          mediaType: "application/json",
          name: "jobId",
          dataType: "string",
          required: true,
          description: "",
          exampleValue: "job_1"
        }
      ])
    );
    expect(await screen.findByDisplayValue("Get User Legacy")).toBeInTheDocument();
  });

  it("filters modules, groups, and endpoints from the tree search", async () => {
    fetchProjectTree.mockReset().mockResolvedValueOnce({
      data: {
        modules: [
          {
            id: 11,
            name: "Core",
            groups: [
              {
                id: 21,
                name: "Users",
                endpoints: [{ id: 31, name: "Get User", method: "GET", path: "/users/{id}" }]
              }
            ]
          },
          {
            id: 12,
            name: "Analytics",
            groups: [
              {
                id: 22,
                name: "Dashboards",
                endpoints: [{ id: 32, name: "Billing Overview", method: "GET", path: "/billing/overview" }]
              }
            ]
          }
        ]
      }
    });

    fetchEndpoint.mockImplementation(async (endpointId: number) => ({
      data: {
        id: endpointId,
        groupId: endpointId === 32 ? 22 : 21,
        name: endpointId === 32 ? "Billing Overview" : "Get User",
        method: "GET",
        path: endpointId === 32 ? "/billing/overview" : "/users/{id}",
        description: "Endpoint detail",
        mockEnabled: false
      }
    }));

    render(<ProjectShell projectId={1} />);

    expect(await screen.findByRole("button", { name: "Get User GET /users/{id}" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Billing Overview GET /billing/overview" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search tree"), { target: { value: "billing" } });

    expect(await screen.findByRole("button", { name: "Billing Overview GET /billing/overview" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Get User GET /users/{id}" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search tree"), { target: { value: "missing" } });

    expect(await screen.findByText("No matching nodes.")).toBeInTheDocument();
  });

  it("loads and manages project environments", async () => {
    render(<ProjectShell projectId={1} />);

    expect((await screen.findAllByText("Local")).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("New environment name"), { target: { value: "Staging" } });
    fireEvent.change(screen.getByLabelText("New environment base URL"), { target: { value: "https://staging.dev" } });
    fireEvent.click(screen.getByRole("button", { name: "Add environment" }));

    await waitFor(() =>
      expect(createEnvironment).toHaveBeenCalledWith(1, {
        baseUrl: "https://staging.dev",
        defaultHeaders: [],
        defaultQuery: [],
        authKey: "",
        authMode: "none",
        authValue: "",
        debugAllowedHosts: [],
        debugHostMode: "inherit",
        isDefault: false,
        name: "Staging",
        variables: []
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "Use environment 41" }));
    expect(screen.getByText("Active")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Environment 41 name"), { target: { value: "Production" } });
    fireEvent.click(screen.getByRole("button", { name: "Save environment 41" }));

    await waitFor(() =>
      expect(updateEnvironment).toHaveBeenCalledWith(41, {
        baseUrl: "https://local.dev",
        defaultHeaders: [],
        defaultQuery: [],
        authKey: "",
        authMode: "none",
        authValue: "",
        debugAllowedHosts: [],
        debugHostMode: "inherit",
        isDefault: true,
        name: "Production",
        variables: []
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete environment 41" }));
    await waitFor(() => expect(deleteEnvironment).toHaveBeenCalledWith(41));
  });

  it("shows a global success notification after creating an environment", async () => {
    render(<ProjectShell projectId={1} />);
    expect((await screen.findAllByText("Local")).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("New environment name"), { target: { value: "Staging" } });
    fireEvent.change(screen.getByLabelText("New environment base URL"), { target: { value: "https://staging.dev" } });
    fireEvent.click(screen.getByRole("button", { name: "Add environment" }));

    const toast = await screen.findByRole("status");
    expect(within(toast).getByText("Environment created")).toBeInTheDocument();
    expect(within(toast).getByText("Staging is now available in the workbench.")).toBeInTheDocument();
  });

  it("imports environment bundles as non-default copies and shows a summary notification", async () => {
    render(<ProjectShell projectId={1} />);
    expect((await screen.findAllByText("Local")).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Open environment import" }));
    fireEvent.change(screen.getByLabelText("Environment bundle import"), {
      target: {
        value: JSON.stringify({
          version: 1,
          exportedAt: "2026-04-11T12:00:00.000Z",
          environments: [
            {
              name: "Staging",
              baseUrl: "https://staging.dev",
              variables: [],
              defaultHeaders: [],
              defaultQuery: [],
              authMode: "api_key_query",
              authKey: "api_key",
              authValue: "demo",
              debugHostMode: "inherit",
              debugAllowedHosts: []
            }
          ]
        })
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Import environment bundle" }));

    await waitFor(() =>
      expect(createEnvironment).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          name: "Staging",
          isDefault: false,
          authMode: "api_key_query",
          authKey: "api_key"
        })
      )
    );

    const toast = await screen.findByRole("status");
    expect(within(toast).getByText("Environment bundle imported")).toBeInTheDocument();
  });

  it("clones an environment into a non-default copy", async () => {
    render(<ProjectShell projectId={1} />);
    expect((await screen.findAllByText("Local")).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Clone environment 41" }));

    await waitFor(() =>
      expect(createEnvironment).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          name: "Local Copy",
          baseUrl: "https://local.dev",
          isDefault: false,
          authMode: "none"
        })
      )
    );
  });

  it("loads project detail and saves project debug policy", async () => {
    render(<ProjectShell projectId={1} />);

    expect(await screen.findByDisplayValue("*.corp.example.com")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Project debug rule 1 pattern"), { target: { value: "10.10.1.8" } });
    fireEvent.click(screen.getByLabelText("Project debug rule 1 allow private"));
    fireEvent.click(screen.getByRole("button", { name: "Save project debug policy" }));

    await waitFor(() =>
      expect(updateProject).toHaveBeenCalledWith(1, {
        name: "Default Project",
        description: "Seed project",
        debugAllowedHosts: [{ pattern: "10.10.1.8", allowPrivate: true }]
      })
    );
  });

  it("shows a global error notification when project debug policy save fails", async () => {
    updateProject.mockRejectedValueOnce(new Error("Policy save failed"));

    render(<ProjectShell projectId={1} />);
    expect(await screen.findByDisplayValue("*.corp.example.com")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Project debug rule 1 pattern"), { target: { value: "10.10.1.8" } });
    fireEvent.click(screen.getByRole("button", { name: "Save project debug policy" }));

    const toast = await screen.findByRole("alert");
    expect(within(toast).getByText("Policy update failed")).toBeInTheDocument();
    expect(within(toast).getByText("Policy save failed")).toBeInTheDocument();
  });

  it("opens the access drawer from the summary card and hides inline member controls by default", async () => {
    render(<ProjectShell projectId={1} />);

    expect(await screen.findByText("Access & Roles")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add project member" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Manage access" }));

    expect(await screen.findByRole("dialog", { name: "Project access" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add project member" })).toBeInTheDocument();
  });

  it("shows a read-only workbench for viewer members", async () => {
    fetchProject.mockResolvedValueOnce({
      data: {
        id: 1,
        name: "Default Project",
        projectKey: "default",
        description: "Seed project",
        debugAllowedHosts: [],
        currentUserRole: "viewer",
        canWrite: false,
        canManageMembers: false
      }
    });

    render(<ProjectShell projectId={1} />);

    expect((await screen.findAllByText("Viewer access")).length).toBeGreaterThan(0);
    expect(screen.getByText("Read-only")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add module" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save project debug policy" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Clear debug history" })).toBeDisabled();

    expect(screen.queryByRole("button", { name: "Add project member" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Manage access" }));

    expect(await screen.findByText("You can review project access, but only project admins can change membership.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add project member" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save member 1" })).toBeDisabled();
  });

  it("refetches and clears debug history with active filters", async () => {
    fetchDebugHistory
      .mockResolvedValueOnce({
        data: [
          {
            id: 101,
            projectId: 1,
            environmentId: 41,
            endpointId: 31,
            method: "GET",
            finalUrl: "https://local.dev/users/{id}",
            requestHeaders: [],
            requestBody: "",
            statusCode: 200,
            responseHeaders: [],
            responseBody: "{\"ok\":true}",
            durationMs: 22,
            createdAt: "2026-04-10T12:00:00Z"
          }
        ]
      })
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] });
    clearDebugHistory.mockResolvedValueOnce({ data: { deletedCount: 1 } });

    render(<ProjectShell projectId={1} />);

    expect((await screen.findAllByText("https://local.dev/users/{id}")).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Debug history environment filter"), { target: { value: "41" } });

    await waitFor(() =>
      expect(fetchDebugHistory).toHaveBeenLastCalledWith(1, {
        endpointId: 31,
        environmentId: 41,
        statusCode: undefined,
        createdFrom: undefined,
        createdTo: undefined,
        limit: 10
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear debug history" }));

    await waitFor(() =>
      expect(clearDebugHistory).toHaveBeenCalledWith(1, {
        endpointId: 31,
        environmentId: 41,
        statusCode: undefined,
        createdFrom: undefined,
        createdTo: undefined
      })
    );
  });

  it("replays debug history and switches to the history environment", async () => {
    fetchEnvironments.mockResolvedValue({
      data: [
        { id: 41, projectId: 1, name: "Local", baseUrl: "https://local.dev", isDefault: true, variables: [], defaultHeaders: [], defaultQuery: [], authMode: "none", authKey: "", authValue: "" },
        {
          id: 42,
          projectId: 1,
          name: "Staging",
          baseUrl: "https://staging.dev",
          isDefault: false,
          variables: [],
          defaultHeaders: [],
          defaultQuery: [],
          authMode: "none",
          authKey: "",
          authValue: "",
          debugHostMode: "inherit",
          debugAllowedHosts: []
        }
      ]
    });
    fetchDebugHistory.mockResolvedValue({
      data: [
        {
          createdAt: "2026-04-09T12:10:00Z",
          durationMs: 35,
          endpointId: 31,
          environmentId: 42,
          finalUrl: "https://staging.dev/users/{id}?cached=true",
          id: 101,
          method: "GET",
          projectId: 1,
          requestBody: "{\"user\":\"31\"}",
          requestHeaders: [{ name: "Authorization", value: "Bearer history-token" }],
          responseBody: "{\"cached\":true}",
          responseHeaders: [{ name: "content-type", value: "application/json" }],
          statusCode: 200
        }
      ]
    });

    render(<ProjectShell projectId={1} />);

    expect(await screen.findByRole("button", { name: "Replay history 101" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Replay history 101" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Use environment 42" })).toBeInTheDocument();
      expect(screen.getByLabelText("Query string")).toHaveValue("cached=true");
      expect(screen.getByLabelText("Headers")).toHaveValue("Authorization: Bearer history-token");
      expect(screen.getByLabelText("Body")).toHaveValue("{\"user\":\"31\"}");
    });
  });

  it("runs a debug history item again through the execute pipeline", async () => {
    fetchEnvironments.mockResolvedValue({
      data: [
        {
          id: 41,
          projectId: 1,
          name: "Local",
          baseUrl: "https://local.dev",
          isDefault: true,
          variables: [],
          defaultHeaders: [],
          defaultQuery: [],
          authMode: "none",
          authKey: "",
          authValue: "",
          debugHostMode: "inherit",
          debugAllowedHosts: []
        },
        {
          id: 42,
          projectId: 1,
          name: "Staging",
          baseUrl: "https://staging.dev",
          isDefault: false,
          variables: [],
          defaultHeaders: [],
          defaultQuery: [],
          authMode: "none",
          authKey: "",
          authValue: "",
          debugHostMode: "inherit",
          debugAllowedHosts: []
        }
      ]
    });
    fetchDebugHistory
      .mockResolvedValueOnce({
        data: [
          {
            createdAt: "2026-04-09T12:10:00Z",
            durationMs: 35,
            endpointId: 31,
            environmentId: 42,
            finalUrl: "https://staging.dev/users/{id}?cached=true",
            id: 101,
            method: "GET",
            projectId: 1,
            requestBody: "{\"user\":\"31\"}",
            requestHeaders: [{ name: "Authorization", value: "Bearer history-token" }],
            responseBody: "{\"cached\":true}",
            responseHeaders: [{ name: "content-type", value: "application/json" }],
            statusCode: 200
          }
        ]
      })
      .mockResolvedValueOnce({
        data: [
          {
            createdAt: "2026-04-09T12:12:00Z",
            durationMs: 20,
            endpointId: 31,
            environmentId: 42,
            finalUrl: "https://staging.dev/users/{id}?cached=true",
            id: 102,
            method: "GET",
            projectId: 1,
            requestBody: "{\"user\":\"31\"}",
            requestHeaders: [{ name: "Authorization", value: "Bearer history-token" }],
            responseBody: "{\"rerun\":true}",
            responseHeaders: [{ name: "content-type", value: "application/json" }],
            statusCode: 202
          }
        ]
      });
    executeDebug.mockResolvedValueOnce({
      data: {
        durationMs: 20,
        finalUrl: "https://staging.dev/users/{id}?cached=true",
        method: "GET",
        responseBody: "{\"rerun\":true}",
        responseHeaders: [{ name: "content-type", value: "application/json" }],
        statusCode: 202
      }
    });

    render(<ProjectShell projectId={1} />);

    expect(await screen.findByRole("button", { name: "Run history 101" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Run history 101" }));

    await waitFor(() =>
      expect(executeDebug).toHaveBeenCalledWith({
        body: "{\"user\":\"31\"}",
        endpointId: 31,
        environmentId: 42,
        headers: [{ name: "Authorization", value: "Bearer history-token" }],
        queryString: "cached=true"
      })
    );
    expect(await screen.findByText("{\"rerun\":true}")).toBeInTheDocument();
  });

  it("loads mock releases and wires publish plus simulator actions", async () => {
    fetchEndpointResponses.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          httpStatusCode: 200,
          mediaType: "application/json",
          name: "userId",
          dataType: "string",
          required: true,
          description: "User identifier",
          exampleValue: "u_1001",
          sortOrder: 0
        }
      ]
    });
    fetchEndpointMockRules.mockResolvedValueOnce({
      data: [
        {
          id: 11,
          endpointId: 31,
          ruleName: "Unauthorized",
          priority: 100,
          enabled: true,
          queryConditions: [{ name: "mode", value: "strict" }],
          headerConditions: [{ name: "x-scenario", value: "unauthorized" }],
          bodyConditions: [],
          statusCode: 401,
          mediaType: "application/json",
          body: "{\"error\":\"token expired\"}"
        }
      ]
    });
    fetchEndpointMockReleases
      .mockResolvedValueOnce({
        data: [
          {
            id: 7,
            endpointId: 31,
            releaseNo: 2,
            responseSnapshotJson: "[]",
            rulesSnapshotJson: "[]",
            createdAt: "2026-04-09T12:10:00Z"
          }
        ]
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 8,
            endpointId: 31,
            releaseNo: 3,
            responseSnapshotJson: "[]",
            rulesSnapshotJson: "[]",
            createdAt: "2026-04-09T12:12:00Z"
          }
        ]
      });
      simulateEndpointMock.mockResolvedValueOnce({
        data: {
          source: "rule",
          matchedRuleName: "Unauthorized",
          matchedRulePriority: 100,
          explanations: ["Matched query mode=strict", "Matched header x-scenario=unauthorized"],
          ruleTraces: [
            {
              ruleName: "Unauthorized",
              priority: 100,
              status: "matched",
              checks: ["Matched query mode=strict", "Matched header x-scenario=unauthorized"],
              summary: "Rule matched and produced the simulated response."
            }
          ],
          statusCode: 401,
          mediaType: "application/json",
          body: "{\"error\":\"token expired\"}"
        }
      });

    render(<ProjectShell projectId={1} />);

    expect((await screen.findAllByText("Release #2")).length).toBeGreaterThan(0);
    expect(await screen.findByText("Inspecting Release #2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Publish mock" }));

    await waitFor(() => expect(publishEndpointMockRelease).toHaveBeenCalledWith(31));
    expect((await screen.findAllByText("Release #3")).length).toBeGreaterThan(0);
    expect(await screen.findByText("Inspecting Release #3")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Simulator query samples"), { target: { value: "mode=strict" } });
    fireEvent.change(screen.getByLabelText("Simulator header samples"), { target: { value: "x-scenario=unauthorized" } });
    fireEvent.click(screen.getByRole("button", { name: "Run mock simulation" }));

    await waitFor(() =>
      expect(simulateEndpointMock).toHaveBeenCalledWith(31, {
        draftRules: [
          {
            body: "{\"error\":\"token expired\"}",
            bodyConditions: [],
            enabled: true,
            headerConditions: [{ name: "x-scenario", value: "unauthorized" }],
            mediaType: "application/json",
            priority: 100,
            queryConditions: [{ name: "mode", value: "strict" }],
            ruleName: "Unauthorized",
            statusCode: 401
          }
        ],
        draftResponses: [
          {
            dataType: "string",
            description: "User identifier",
            exampleValue: "u_1001",
            httpStatusCode: 200,
            mediaType: "application/json",
            name: "userId",
            required: true
          }
        ],
        bodySample: "",
        headerSamples: [{ name: "x-scenario", value: "unauthorized" }],
        querySamples: [{ name: "mode", value: "strict" }]
      })
    );

    const matchboard = await screen.findByRole("region", { name: "Rule Matchboard" });
    expect(within(matchboard).getByText("Unauthorized")).toBeInTheDocument();
    expect(within(matchboard).getAllByText("Matched header x-scenario=unauthorized").length).toBeGreaterThan(0);
  });
});
