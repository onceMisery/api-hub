import React from "react";
import { render, screen } from "@testing-library/react";

const { mockUseParams } = vi.hoisted(() => ({
  mockUseParams: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useParams: () => mockUseParams()
}));

vi.mock("../../../../../features/projects/components/project-mock-center", () => ({
  ProjectMockCenter: ({ projectId }: { projectId: number }) => <div>Mock center {projectId}</div>
}));

import ProjectMockCenterPage from "./page";

describe("ProjectMockCenterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows an invalid project id state when the route param is not numeric", () => {
    mockUseParams.mockReturnValue({ projectId: "oops" });

    render(<ProjectMockCenterPage />);

    expect(screen.getByText("Invalid project id.")).toBeInTheDocument();
  });

  it("mounts the mock center for a valid project id", () => {
    mockUseParams.mockReturnValue({ projectId: "12" });

    render(<ProjectMockCenterPage />);

    expect(screen.getByText("Mock center 12")).toBeInTheDocument();
  });
});
