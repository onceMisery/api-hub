import React from "react";
import { render, screen } from "@testing-library/react";

import { ProjectCard } from "./project-card";

describe("ProjectCard", () => {
  it("shows access posture and debug policy count", () => {
    render(
      <ProjectCard
        project={
          {
            id: 1,
            name: "Default Project",
            projectKey: "default",
            description: "Seed workspace",
            debugAllowedHosts: [{ pattern: "*.corp.example.com", allowPrivate: false }],
            currentUserRole: "editor",
            canWrite: true,
            canManageMembers: false
          } as never
        }
      />
    );

    expect(screen.getByText("Editor access")).toBeInTheDocument();
    expect(screen.getByText("Writable")).toBeInTheDocument();
    expect(screen.getByText("1 debug rule")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse docs" })).toHaveAttribute("href", "/console/projects/1/browse");
  });
});
