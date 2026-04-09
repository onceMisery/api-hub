import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const {
  mockReplace,
  fetchProjectTree,
  fetchEndpoint,
  fetchEndpointVersions,
  createModule,
  createGroup,
  createEndpoint,
  updateEndpoint
} = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  fetchProjectTree: vi.fn(),
  fetchEndpoint: vi.fn(),
  fetchEndpointVersions: vi.fn(),
  createModule: vi.fn(),
  createGroup: vi.fn(),
  createEndpoint: vi.fn(),
  updateEndpoint: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace
  })
}));

vi.mock("@api-hub/api-sdk", () => ({
  fetchProjectTree,
  fetchEndpoint,
  fetchEndpointVersions,
  createModule,
  createGroup,
  createEndpoint,
  updateEndpoint,
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
                  endpoints: [
                    { id: 31, name: "Get User", method: "GET", path: "/users/{id}" }
                  ]
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
        description: "Endpoint detail"
      }
    }));

    fetchEndpointVersions.mockResolvedValue({ data: [] });
    createModule.mockResolvedValue({ data: { id: 11, projectId: 1, name: "Core" } });
    createGroup.mockResolvedValue({ data: { id: 21, moduleId: 11, name: "Users" } });
    createEndpoint.mockResolvedValue({
      data: {
        id: 99,
        groupId: 21,
        name: "Create User",
        method: "POST",
        path: "/users",
        description: "Create user endpoint"
      }
    });
    updateEndpoint.mockResolvedValue({
      data: {
        id: 31,
        groupId: 21,
        name: "Get User",
        method: "GET",
        path: "/users/{id}",
        description: "Updated"
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
        name: "Create User",
        path: "/users"
      })
    );

    await waitFor(() => expect(fetchProjectTree).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Create User")).toBeInTheDocument();
    await waitFor(() => expect(fetchEndpoint).toHaveBeenLastCalledWith(99));
  });
});
