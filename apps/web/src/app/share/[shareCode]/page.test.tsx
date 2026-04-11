import React from "react";
import { render, screen } from "@testing-library/react";

const { mockUseParams } = vi.hoisted(() => ({
  mockUseParams: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useParams: () => mockUseParams()
}));

vi.mock("../../../features/projects/components/public-share-browser", () => ({
  PublicShareBrowser: ({ shareCode }: { shareCode: string }) => <div>Public share {shareCode}</div>
}));

import SharePage from "./page";

describe("SharePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows an invalid share code state when the route param is empty", () => {
    mockUseParams.mockReturnValue({ shareCode: "" });

    render(<SharePage />);

    expect(screen.getByText("Invalid share code.")).toBeInTheDocument();
  });

  it("mounts the public share browser for a valid share code", () => {
    mockUseParams.mockReturnValue({ shareCode: "share_abc123" });

    render(<SharePage />);

    expect(screen.getByText("Public share share_abc123")).toBeInTheDocument();
  });
});
