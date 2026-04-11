import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ProjectSidebar } from "./project-sidebar";

describe("ProjectSidebar", () => {
  const modules = [
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
  ];

  beforeEach(() => {
    window.localStorage.clear();
  });

  function renderSidebar(overrides: Partial<React.ComponentProps<typeof ProjectSidebar>> = {}) {
    const props = {
      allModules: modules,
      canWrite: true,
      modules,
      onCreateEndpoint: vi.fn().mockResolvedValue(undefined),
      onCreateGroup: vi.fn().mockResolvedValue(undefined),
      onCreateModule: vi.fn().mockResolvedValue(undefined),
      onDeleteEndpoint: vi.fn().mockResolvedValue(undefined),
      onDeleteGroup: vi.fn().mockResolvedValue(undefined),
      onDeleteModule: vi.fn().mockResolvedValue(undefined),
      onRenameEndpoint: vi.fn().mockResolvedValue(undefined),
      onRenameGroup: vi.fn().mockResolvedValue(undefined),
      onRenameModule: vi.fn().mockResolvedValue(undefined),
      onSelectEndpoint: vi.fn(),
      projectId: 1,
      selectedEndpointId: 31,
      ...overrides
    };

    return {
      ...props,
      ...render(<ProjectSidebar {...props} />)
    };
  }

  it("renames and deletes module/group nodes", async () => {
    const onCreateEndpoint = vi.fn().mockResolvedValue(undefined);
    const onCreateGroup = vi.fn().mockResolvedValue(undefined);
    const onCreateModule = vi.fn().mockResolvedValue(undefined);
    const onDeleteGroup = vi.fn().mockResolvedValue(undefined);
    const onDeleteModule = vi.fn().mockResolvedValue(undefined);
    const onRenameGroup = vi.fn().mockResolvedValue(undefined);
    const onRenameModule = vi.fn().mockResolvedValue(undefined);
    const onSelectEndpoint = vi.fn();

    render(
      <ProjectSidebar
        allModules={[
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
        ]}
        canWrite
        modules={[
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
        ]}
        onCreateEndpoint={onCreateEndpoint}
        onCreateGroup={onCreateGroup}
        onCreateModule={onCreateModule}
        onDeleteGroup={onDeleteGroup}
        onDeleteModule={onDeleteModule}
        onRenameGroup={onRenameGroup}
        onRenameModule={onRenameModule}
        onSelectEndpoint={onSelectEndpoint}
        projectId={1}
        selectedEndpointId={31}
      />
    );

    fireEvent.change(screen.getByLabelText("Module 11 name"), { target: { value: "Core Services" } });
    fireEvent.click(screen.getByRole("button", { name: "Rename module 11" }));

    await waitFor(() => expect(onRenameModule).toHaveBeenCalledWith(11, { name: "Core Services" }));

    fireEvent.change(screen.getByLabelText("Group 21 name"), { target: { value: "User Management" } });
    fireEvent.click(screen.getByRole("button", { name: "Rename group 21" }));

    await waitFor(() => expect(onRenameGroup).toHaveBeenCalledWith(21, { name: "User Management" }));

    fireEvent.click(screen.getByRole("button", { name: "Delete group 21" }));
    await waitFor(() => expect(onDeleteGroup).toHaveBeenCalledWith(21));

    fireEvent.click(screen.getByRole("button", { name: "Delete module 11" }));
    await waitFor(() => expect(onDeleteModule).toHaveBeenCalledWith(11));
  });

  it("renames and deletes endpoint nodes", async () => {
    const onCreateEndpoint = vi.fn().mockResolvedValue(undefined);
    const onCreateGroup = vi.fn().mockResolvedValue(undefined);
    const onCreateModule = vi.fn().mockResolvedValue(undefined);
    const onDeleteEndpoint = vi.fn().mockResolvedValue(undefined);
    const onDeleteGroup = vi.fn().mockResolvedValue(undefined);
    const onDeleteModule = vi.fn().mockResolvedValue(undefined);
    const onRenameEndpoint = vi.fn().mockResolvedValue(undefined);
    const onRenameGroup = vi.fn().mockResolvedValue(undefined);
    const onRenameModule = vi.fn().mockResolvedValue(undefined);
    const onSelectEndpoint = vi.fn();

    render(
      <ProjectSidebar
        allModules={[
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
        ]}
        canWrite
        modules={[
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
        ]}
        onCreateEndpoint={onCreateEndpoint}
        onCreateGroup={onCreateGroup}
        onCreateModule={onCreateModule}
        onDeleteEndpoint={onDeleteEndpoint}
        onDeleteGroup={onDeleteGroup}
        onDeleteModule={onDeleteModule}
        onRenameEndpoint={onRenameEndpoint}
        onRenameGroup={onRenameGroup}
        onRenameModule={onRenameModule}
        onSelectEndpoint={onSelectEndpoint}
        projectId={1}
        selectedEndpointId={31}
      />
    );

    fireEvent.change(screen.getByLabelText("Endpoint 31 name"), { target: { value: "Get User Detail" } });
    fireEvent.change(screen.getByLabelText("Endpoint 31 path"), { target: { value: "/users/{userId}" } });
    fireEvent.click(screen.getByRole("button", { name: "Rename endpoint 31" }));

    await waitFor(() =>
      expect(onRenameEndpoint).toHaveBeenCalledWith(31, {
        description: "",
        method: "GET",
        name: "Get User Detail",
        path: "/users/{userId}"
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete endpoint 31" }));
    await waitFor(() => expect(onDeleteEndpoint).toHaveBeenCalledWith(31));
  });

  it("disables write actions for read-only members", () => {
    render(
      <ProjectSidebar
        allModules={modules}
        canWrite={false}
        modules={modules}
        onCreateEndpoint={vi.fn().mockResolvedValue(undefined)}
        onCreateGroup={vi.fn().mockResolvedValue(undefined)}
        onCreateModule={vi.fn().mockResolvedValue(undefined)}
        onDeleteEndpoint={vi.fn().mockResolvedValue(undefined)}
        onDeleteGroup={vi.fn().mockResolvedValue(undefined)}
        onDeleteModule={vi.fn().mockResolvedValue(undefined)}
        onRenameEndpoint={vi.fn().mockResolvedValue(undefined)}
        onRenameGroup={vi.fn().mockResolvedValue(undefined)}
        onRenameModule={vi.fn().mockResolvedValue(undefined)}
        onSelectEndpoint={vi.fn()}
        projectId={1}
        selectedEndpointId={31}
      />
    );

    expect(screen.getByRole("button", { name: "Add module" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rename module 11" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add group" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rename group 21" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add endpoint" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rename endpoint 31" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete endpoint 31" })).toBeDisabled();
  });

  it("tracks recent endpoints and lets users reopen them from quick access", () => {
    const onSelectEndpoint = vi.fn();
    const { rerender } = renderSidebar({ onSelectEndpoint });

    expect(screen.getByText("Quick access")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open quick access Get User" })).toBeInTheDocument();

    rerender(
      <ProjectSidebar
        allModules={modules}
        canWrite
        modules={modules}
        onCreateEndpoint={vi.fn().mockResolvedValue(undefined)}
        onCreateGroup={vi.fn().mockResolvedValue(undefined)}
        onCreateModule={vi.fn().mockResolvedValue(undefined)}
        onDeleteEndpoint={vi.fn().mockResolvedValue(undefined)}
        onDeleteGroup={vi.fn().mockResolvedValue(undefined)}
        onDeleteModule={vi.fn().mockResolvedValue(undefined)}
        onRenameEndpoint={vi.fn().mockResolvedValue(undefined)}
        onRenameGroup={vi.fn().mockResolvedValue(undefined)}
        onRenameModule={vi.fn().mockResolvedValue(undefined)}
        onSelectEndpoint={onSelectEndpoint}
        projectId={1}
        selectedEndpointId={32}
      />
    );

    expect(screen.getByRole("button", { name: "Open quick access Create User" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open quick access Get User" }));
    expect(onSelectEndpoint).toHaveBeenCalledWith(31);
  });

  it("pins and unpins endpoints locally", () => {
    renderSidebar();

    fireEvent.click(screen.getByRole("button", { name: "Pin endpoint 31" }));
    expect(screen.getAllByText("Pinned").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Open quick access Get User" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Unpin endpoint 31" }));
    expect(screen.queryByRole("button", { name: "Open quick access Get User" })).not.toBeInTheDocument();
  });

  it("drops stale quick access ids that are no longer in the tree", () => {
    window.localStorage.setItem(
      "apihub.project-sidebar.quick-access.v1.project-1",
      JSON.stringify({
        pinnedEndpointIds: [999, 31],
        recentEndpointIds: [999, 32]
      })
    );

    renderSidebar();

    expect(screen.queryByText("999")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open quick access Get User" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open quick access Create User" })).toBeInTheDocument();
  });

  it("collapses and reopens module branches from the navigation controls", () => {
    renderSidebar({ selectedEndpointId: null });

    expect(screen.getByRole("button", { name: "Get User GET /users/{id}" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Collapse module 11" }));
    expect(screen.queryByRole("button", { name: "Get User GET /users/{id}" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expand module 11" }));
    expect(screen.getByRole("button", { name: "Get User GET /users/{id}" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));
    expect(screen.queryByRole("button", { name: "Get User GET /users/{id}" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
    expect(screen.getByRole("button", { name: "Get User GET /users/{id}" })).toBeInTheDocument();
  });

  it("switches between local tree sort modes", () => {
    const sortModules = [
      {
        id: 11,
        name: "Core",
        groups: [
          {
            id: 21,
            name: "Users",
            endpoints: [
              { id: 31, name: "Delete User", method: "DELETE", path: "/users/archive" },
              { id: 32, name: "Create User", method: "POST", path: "/users" },
              { id: 33, name: "Get User", method: "GET", path: "/users/{id}" }
            ]
          }
        ]
      }
    ];
    renderSidebar({ allModules: sortModules, modules: sortModules, selectedEndpointId: 33 });

    fireEvent.click(screen.getByRole("button", { name: "A-Z" }));

    const createButton = screen.getByRole("button", { name: "Create User POST /users" });
    const deleteButton = screen.getByRole("button", { name: "Delete User DELETE /users/archive" });
    const getButton = screen.getByRole("button", { name: "Get User GET /users/{id}" });

    expect(createButton.compareDocumentPosition(deleteButton) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(deleteButton.compareDocumentPosition(getButton) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "Method" }));

    const getButtonByMethod = screen.getByRole("button", { name: "Get User GET /users/{id}" });
    const createButtonByMethod = screen.getByRole("button", { name: "Create User POST /users" });
    const deleteButtonByMethod = screen.getByRole("button", { name: "Delete User DELETE /users/archive" });

    expect(getButtonByMethod.compareDocumentPosition(createButtonByMethod) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(createButtonByMethod.compareDocumentPosition(deleteButtonByMethod) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });

  it("keeps matched branches open while search is active even if they are stored as collapsed", () => {
    const allModules = [
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
        name: "Billing",
        groups: [
          {
            id: 22,
            name: "Invoices",
            endpoints: [{ id: 41, name: "Billing Overview", method: "GET", path: "/billing/overview" }]
          }
        ]
      }
    ];

    window.localStorage.setItem(
      "apihub.project-sidebar.tree-preferences.v1.project-1",
      JSON.stringify({
        sortMode: "project",
        collapsedModuleIds: [12],
        collapsedGroupIds: [22]
      })
    );

    renderSidebar({
      allModules,
      modules: [allModules[1]],
      searchQuery: "billing",
      selectedEndpointId: null
    });

    expect(screen.getByText("Search keeps matched branches open.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Billing Overview GET /billing/overview" })).toBeInTheDocument();
  });
});
