import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const {
  fetchPublicShare,
  fetchPublicShareEndpoint
} = vi.hoisted(() => ({
  fetchPublicShare: vi.fn(),
  fetchPublicShareEndpoint: vi.fn()
}));

vi.mock("@api-hub/api-sdk", () => ({
  fetchPublicShare,
  fetchPublicShareEndpoint
}));

import { PublicShareBrowser } from "./public-share-browser";

describe("PublicShareBrowser", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    fetchPublicShare.mockResolvedValue({
      data: {
        share: {
          id: 3,
          projectId: 7,
          shareCode: "share_abc123",
          name: "External reviewers",
          description: "Read-only contract access",
          enabled: true,
          expiresAt: "2026-04-30T12:00:00Z",
          createdAt: "2026-04-11T08:00:00Z",
          updatedAt: "2026-04-11T08:00:00Z"
        },
        project: {
          id: 7,
          name: "Payments API",
          projectKey: "payments",
          description: "Public docs surface"
        },
        tree: {
          modules: [
            {
              id: 11,
              name: "Billing",
              groups: [
                {
                  id: 21,
                  name: "Invoices",
                  endpoints: [
                    { id: 31, name: "Get invoice", method: "GET", path: "/invoices/{id}" },
                    { id: 32, name: "Create invoice", method: "POST", path: "/invoices" }
                  ]
                }
              ]
            }
          ]
        }
      }
    });

    fetchPublicShareEndpoint.mockImplementation(async (_shareCode: string, endpointId: number) => ({
      data: {
        endpoint: {
          id: endpointId,
          groupId: 21,
          name: endpointId === 32 ? "Create invoice" : "Get invoice",
          method: endpointId === 32 ? "POST" : "GET",
          path: endpointId === 32 ? "/invoices" : "/invoices/{id}",
          description: endpointId === 32 ? "Create a new invoice" : "Fetch one invoice",
          mockEnabled: true,
          status: endpointId === 32 ? "draft" : "released",
          releasedVersionId: endpointId === 32 ? null : 2,
          releasedVersionLabel: endpointId === 32 ? null : "v2",
          releasedAt: endpointId === 32 ? null : "2026-04-11T10:00:00Z"
        },
        parameters: [],
        responses: [],
        versions: endpointId === 32 ? [] : [{ id: 2, endpointId: 31, version: "v2", changeSummary: "Live", snapshotJson: "{}", released: true }],
        mockReleases: endpointId === 32 ? [] : [{ id: 8, endpointId: 31, releaseNo: 4, responseSnapshotJson: "[]", rulesSnapshotJson: "[]", createdAt: "2026-04-11T09:00:00Z" }]
      }
    }));
  });

  it("loads the public share shell and first endpoint by default", async () => {
    render(<PublicShareBrowser shareCode="share_abc123" />);

    expect(screen.getByText("Loading public documentation...")).toBeInTheDocument();
    expect(await screen.findByText("Payments API")).toBeInTheDocument();
    expect(screen.getByText("External reviewers")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Get invoice" })).toBeInTheDocument();
    expect(screen.getByText("Fetch one invoice")).toBeInTheDocument();

    await waitFor(() => expect(fetchPublicShareEndpoint).toHaveBeenCalledWith("share_abc123", 31));
  });

  it("filters the tree and focuses the first visible endpoint", async () => {
    render(<PublicShareBrowser shareCode="share_abc123" />);

    expect(await screen.findByRole("heading", { name: "Get invoice" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search docs"), { target: { value: "create" } });

    await waitFor(() => expect(fetchPublicShareEndpoint).toHaveBeenCalledWith("share_abc123", 32));
    expect(await screen.findByRole("heading", { name: "Create invoice" })).toBeInTheDocument();
  });

  it("shows an error state when the public share shell cannot load", async () => {
    fetchPublicShare.mockRejectedValueOnce(new Error("Share not found"));

    render(<PublicShareBrowser shareCode="missing" />);

    expect(await screen.findByText("Share not found")).toBeInTheDocument();
  });

  it("keeps the shell visible and shows a local detail error when endpoint loading fails", async () => {
    fetchPublicShareEndpoint.mockRejectedValueOnce(new Error("Endpoint detail failed"));

    render(<PublicShareBrowser shareCode="share_abc123" />);

    expect(await screen.findByText("Payments API")).toBeInTheDocument();
    expect(await screen.findByText("Endpoint detail failed")).toBeInTheDocument();
    expect(screen.getByText("Search and browse endpoints")).toBeInTheDocument();
  });

  it("shows an explicit empty state when filtering removes every endpoint", async () => {
    render(<PublicShareBrowser shareCode="share_abc123" />);

    expect(await screen.findByRole("heading", { name: "Get invoice" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search docs"), { target: { value: "missing" } });

    expect(await screen.findByText("No endpoints match the current documentation search.")).toBeInTheDocument();
    expect(screen.getByText("No endpoint selected")).toBeInTheDocument();
  });
});
