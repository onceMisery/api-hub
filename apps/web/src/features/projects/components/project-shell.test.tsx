import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const {
  mockReplace,
  fetchProjectTree,
  fetchEndpoint,
  fetchEndpointMockRules,
  fetchEndpointParameters,
  fetchEndpointResponses,
  fetchEndpointVersions,
  fetchDebugHistory,
  fetchEnvironments,
  executeDebug,
  createModule,
  createEnvironment,
  updateModule,
  updateEnvironment,
  deleteModule,
  createGroup,
  updateGroup,
  deleteGroup,
  createEndpoint,
  updateEndpoint,
  deleteEndpoint,
  deleteEnvironment,
  replaceEndpointParameters,
  replaceEndpointMockRules,
  replaceEndpointResponses,
  createVersion
} = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  fetchProjectTree: vi.fn(),
  fetchEndpoint: vi.fn(),
  fetchEndpointMockRules: vi.fn(),
  fetchEndpointParameters: vi.fn(),
  fetchEndpointResponses: vi.fn(),
  fetchEndpointVersions: vi.fn(),
  fetchDebugHistory: vi.fn(),
  fetchEnvironments: vi.fn(),
  executeDebug: vi.fn(),
  createModule: vi.fn(),
  createEnvironment: vi.fn(),
  updateModule: vi.fn(),
  updateEnvironment: vi.fn(),
  deleteModule: vi.fn(),
  createGroup: vi.fn(),
  updateGroup: vi.fn(),
  deleteGroup: vi.fn(),
  createEndpoint: vi.fn(),
  updateEndpoint: vi.fn(),
  deleteEndpoint: vi.fn(),
  deleteEnvironment: vi.fn(),
  replaceEndpointParameters: vi.fn(),
  replaceEndpointMockRules: vi.fn(),
  replaceEndpointResponses: vi.fn(),
  createVersion: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace
  })
}));

vi.mock("@api-hub/api-sdk", () => ({
  fetchProjectTree,
  fetchEndpoint,
  fetchEndpointMockRules,
  fetchEndpointParameters,
  fetchEndpointResponses,
  fetchEndpointVersions,
  fetchDebugHistory,
  fetchEnvironments,
  executeDebug,
  createModule,
  createEnvironment,
  updateModule,
  updateEnvironment,
  deleteModule,
  createGroup,
  updateGroup,
  deleteGroup,
  createEndpoint,
  updateEndpoint,
  deleteEndpoint,
  deleteEnvironment,
  replaceEndpointParameters,
  replaceEndpointMockRules,
  replaceEndpointResponses,
  createVersion,
  isApiRequestError: () => false
}));

import { ProjectShell } from "./project-shell";

describe("ProjectShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();

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
    fetchEndpointVersions.mockResolvedValue({ data: [] });
    fetchDebugHistory.mockResolvedValue({ data: [] });
    fetchEnvironments.mockResolvedValue({
      data: [{ id: 41, projectId: 1, name: "Local", baseUrl: "https://local.dev", isDefault: true, variables: [], defaultHeaders: [], defaultQuery: [], authMode: "none", authKey: "", authValue: "" }]
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
    createEnvironment.mockResolvedValue({ data: { id: 42, projectId: 1, name: "Staging", baseUrl: "https://staging.dev", isDefault: false, variables: [], defaultHeaders: [], defaultQuery: [], authMode: "none", authKey: "", authValue: "" } });
    updateModule.mockResolvedValue({ data: { id: 11, projectId: 1, name: "Core" } });
    updateEnvironment.mockResolvedValue({ data: { id: 41, projectId: 1, name: "Local", baseUrl: "https://local.dev", isDefault: true, variables: [], defaultHeaders: [], defaultQuery: [], authMode: "none", authKey: "", authValue: "" } });
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
    deleteEnvironment.mockResolvedValue({ data: null });
    replaceEndpointParameters.mockResolvedValue({ data: null });
    replaceEndpointMockRules.mockResolvedValue({ data: null });
    replaceEndpointResponses.mockResolvedValue({ data: null });
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
    expect(await screen.findByText("Create User")).toBeInTheDocument();
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
    expect(await screen.findByText("Get User Detail")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete endpoint 31" }));

    await waitFor(() => expect(deleteEndpoint).toHaveBeenCalledWith(31));
    await waitFor(() => expect(fetchProjectTree).toHaveBeenCalledTimes(3));
    expect(screen.getByText("Pick an endpoint")).toBeInTheDocument();
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

    expect(await screen.findByText("Get User")).toBeInTheDocument();
    expect(screen.getByText("Billing Overview")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search tree"), { target: { value: "billing" } });

    expect(await screen.findByText("Billing Overview")).toBeInTheDocument();
    expect(screen.queryByText("Get User")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search tree"), { target: { value: "missing" } });

    expect(await screen.findByText("No matching nodes.")).toBeInTheDocument();
  });

  it("loads and manages project environments", async () => {
    render(<ProjectShell projectId={1} />);

    expect(await screen.findByText("Local")).toBeInTheDocument();

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
        isDefault: true,
        name: "Production",
        variables: []
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete environment 41" }));
    await waitFor(() => expect(deleteEnvironment).toHaveBeenCalledWith(41));
  });

  it("replays debug history and switches to the history environment", async () => {
    fetchEnvironments.mockResolvedValue({
      data: [
        { id: 41, projectId: 1, name: "Local", baseUrl: "https://local.dev", isDefault: true, variables: [], defaultHeaders: [], defaultQuery: [], authMode: "none", authKey: "", authValue: "" },
        { id: 42, projectId: 1, name: "Staging", baseUrl: "https://staging.dev", isDefault: false, variables: [], defaultHeaders: [], defaultQuery: [], authMode: "none", authKey: "", authValue: "" }
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

    expect(await screen.findByText("https://staging.dev/users/{id}?cached=true")).toBeInTheDocument();

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
        { id: 41, projectId: 1, name: "Local", baseUrl: "https://local.dev", isDefault: true, variables: [], defaultHeaders: [], defaultQuery: [], authMode: "none", authKey: "", authValue: "" },
        { id: 42, projectId: 1, name: "Staging", baseUrl: "https://staging.dev", isDefault: false, variables: [], defaultHeaders: [], defaultQuery: [], authMode: "none", authKey: "", authValue: "" }
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

    expect(await screen.findByText("https://staging.dev/users/{id}?cached=true")).toBeInTheDocument();

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
});
