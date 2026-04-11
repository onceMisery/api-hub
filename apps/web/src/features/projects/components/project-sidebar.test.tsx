import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ProjectSidebar } from "./project-sidebar";

describe("ProjectSidebar", () => {
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
        canWrite={false}
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
});
