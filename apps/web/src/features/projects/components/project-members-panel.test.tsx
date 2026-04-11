import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ProjectMembersPanel } from "./project-members-panel";

describe("ProjectMembersPanel", () => {
  it("allows project admins to add, update, and delete members", async () => {
    const onSaveMember = vi.fn().mockResolvedValue(undefined);
    const onDeleteMember = vi.fn().mockResolvedValue(undefined);

    render(
      <ProjectMembersPanel
        canManageMembers
        members={[
          {
            userId: 1,
            username: "admin",
            displayName: "Administrator",
            email: "admin@local.dev",
            roleCode: "project_admin",
            owner: true
          },
          {
            userId: 2,
            username: "viewer",
            displayName: "Viewer User",
            email: "viewer@local.dev",
            roleCode: "viewer",
            owner: false
          }
        ]}
        onDeleteMember={onDeleteMember}
        onSaveMember={onSaveMember}
      />
    );

    fireEvent.change(screen.getByLabelText("Project member username"), { target: { value: "tester" } });
    fireEvent.change(screen.getByLabelText("Project member role"), { target: { value: "tester" } });
    fireEvent.click(screen.getByRole("button", { name: "Add project member" }));

    await waitFor(() => expect(onSaveMember).toHaveBeenCalledWith({ username: "tester", roleCode: "tester" }));

    fireEvent.change(screen.getByLabelText("Member 2 role"), { target: { value: "editor" } });
    fireEvent.click(screen.getByRole("button", { name: "Save member 2" }));

    await waitFor(() => expect(onSaveMember).toHaveBeenCalledWith({ username: "viewer", roleCode: "editor" }));

    fireEvent.click(screen.getByRole("button", { name: "Delete member 2" }));
    await waitFor(() => expect(onDeleteMember).toHaveBeenCalledWith(2));
  });

  it("renders read-only state for non-admin members", () => {
    render(
      <ProjectMembersPanel
        canManageMembers={false}
        members={[
          {
            userId: 1,
            username: "admin",
            displayName: "Administrator",
            email: "admin@local.dev",
            roleCode: "project_admin",
            owner: true
          }
        ]}
        onDeleteMember={vi.fn()}
        onSaveMember={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Add project member" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save member 1" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete member 1" })).toBeDisabled();
  });
});
