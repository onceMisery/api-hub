import React from "react";
import { render, screen } from "@testing-library/react";

const { mockUseParams } = vi.hoisted(() => ({
  mockUseParams: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useParams: () => mockUseParams()
}));

vi.mock("../../../../../features/projects/components/project-share-desk", () => ({
  ProjectShareDesk: ({ projectId }: { projectId: number }) => <div>Share desk {projectId}</div>
}));

import ProjectSharePage from "./page";

describe("ProjectSharePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows an invalid project id state when the route param is not numeric", () => {
    mockUseParams.mockReturnValue({ projectId: "oops" });

    render(<ProjectSharePage />);

    expect(screen.getByText("Invalid project id.")).toBeInTheDocument();
  });

  it("mounts the share desk for a valid project id", () => {
    mockUseParams.mockReturnValue({ projectId: "12" });

    render(<ProjectSharePage />);

    expect(screen.getByText("Share desk 12")).toBeInTheDocument();
  });
});
