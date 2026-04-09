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
});
