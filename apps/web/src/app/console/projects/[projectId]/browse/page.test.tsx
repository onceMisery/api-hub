import React from "react";
import { render, screen } from "@testing-library/react";

const { mockUseParams } = vi.hoisted(() => ({
  mockUseParams: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useParams: () => mockUseParams()
}));

vi.mock("../../../../../features/projects/components/project-docs-browser", () => ({
  ProjectDocsBrowser: ({ projectId }: { projectId: number }) => <div>Docs browser {projectId}</div>
}));

import ProjectBrowsePage from "./page";

describe("ProjectBrowsePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows an invalid project id state when the route param is not numeric", () => {
    mockUseParams.mockReturnValue({ projectId: "oops" });

    render(<ProjectBrowsePage />);

    expect(screen.getByText("Invalid project id.")).toBeInTheDocument();
  });

  it("mounts the documentation browser for a valid project id", () => {
    mockUseParams.mockReturnValue({ projectId: "12" });

    render(<ProjectBrowsePage />);

    expect(screen.getByText("Docs browser 12")).toBeInTheDocument();
  });
});
