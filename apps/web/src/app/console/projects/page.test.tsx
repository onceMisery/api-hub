import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { createProject, fetchProjects, mockPush, mockReplace } = vi.hoisted(() => ({
  createProject: vi.fn(),
  fetchProjects: vi.fn(),
  mockPush: vi.fn(),
  mockReplace: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace
  })
}));

vi.mock("../../../features/auth/components/session-bar", () => ({
  SessionBar: () => <div>Session Bar</div>
}));

vi.mock("@api-hub/api-sdk", () => ({
  createProject,
  fetchProjects,
  isApiRequestError: () => false
}));

import ProjectsPage from "./page";

describe("ProjectsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    fetchProjects.mockResolvedValue({
      data: [
        {
          id: 1,
          name: "Default Project",
          projectKey: "default",
          description: "Seed workspace",
          debugAllowedHosts: [],
          currentUserRole: "project_admin",
          canWrite: true,
          canManageMembers: true
        },
        {
          id: 2,
          name: "Docs Review",
          projectKey: "review",
          description: "Review-only workspace",
          debugAllowedHosts: [],
          currentUserRole: "viewer",
          canWrite: false,
          canManageMembers: false
        }
      ]
    });
  });

  it("filters the project catalog by search text and access mode", async () => {
    render(<ProjectsPage />);

    expect(await screen.findByText("Default Project")).toBeInTheDocument();
    expect(fetchProjects).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText("Search projects"), { target: { value: "review" } });
    expect(screen.queryByText("Default Project")).not.toBeInTheDocument();
    expect(screen.getByText("Docs Review")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Editable" }));
    expect(screen.queryByText("Docs Review")).not.toBeInTheDocument();
    expect(fetchProjects).toHaveBeenCalledTimes(1);
  });

  it("creates a project from the drawer and routes into the workspace", async () => {
    createProject.mockResolvedValue({
      data: {
        id: 9,
        name: "Billing Hub",
        projectKey: "billing-hub",
        description: "Billing APIs",
        debugAllowedHosts: [],
        currentUserRole: "project_admin",
        canWrite: true,
        canManageMembers: true
      }
    });

    render(<ProjectsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Create project" }));
    fireEvent.change(screen.getByLabelText("Project name"), { target: { value: "Billing Hub" } });
    expect(screen.getByDisplayValue("billing-hub")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Project description"), { target: { value: "Billing APIs" } });
    fireEvent.click(screen.getByRole("button", { name: "Create workspace" }));

    await waitFor(() =>
      expect(createProject).toHaveBeenCalledWith({
        name: "Billing Hub",
        projectKey: "billing-hub",
        description: "Billing APIs",
        debugAllowedHosts: []
      })
    );
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/console/projects/9"));
  });
});
