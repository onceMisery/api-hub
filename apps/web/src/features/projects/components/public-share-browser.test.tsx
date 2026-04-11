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

import { AppPreferencesProvider } from "../../../lib/ui-preferences";
import { PublicShareBrowser } from "./public-share-browser";

describe("PublicShareBrowser", () => {
  function renderWithPreferences(shareCode = "share_abc123") {
    return render(
      <AppPreferencesProvider>
        <PublicShareBrowser shareCode={shareCode} />
      </AppPreferencesProvider>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();

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
        versions:
          endpointId === 32
            ? []
            : [{ id: 2, endpointId: 31, version: "v2", changeSummary: "Live", snapshotJson: "{}", released: true }],
        mockReleases:
          endpointId === 32
            ? []
            : [{ id: 8, endpointId: 31, releaseNo: 4, responseSnapshotJson: "[]", rulesSnapshotJson: "[]", createdAt: "2026-04-11T09:00:00Z" }]
      }
    }));
  });

  it("loads the public share shell and first endpoint by default", async () => {
    renderWithPreferences();

    expect(screen.getByText("正在加载公开文档...")).toBeInTheDocument();
    expect(await screen.findByText("Payments API")).toBeInTheDocument();
    expect(screen.getByText("External reviewers")).toBeInTheDocument();
    await waitFor(() => expect(fetchPublicShareEndpoint).toHaveBeenCalledWith("share_abc123", 31));
    expect(await screen.findByRole("heading", { name: "Get invoice" }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText("Fetch one invoice")).toBeInTheDocument();
  });

  it("filters the tree and focuses the first visible endpoint", async () => {
    renderWithPreferences();

    await waitFor(() => expect(fetchPublicShareEndpoint).toHaveBeenCalledWith("share_abc123", 31));
    expect(await screen.findByRole("heading", { name: "Get invoice" }, { timeout: 5000 })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("搜索文档"), { target: { value: "create" } });

    await waitFor(() => expect(fetchPublicShareEndpoint).toHaveBeenCalledWith("share_abc123", 32));
    expect(await screen.findByRole("heading", { name: "Create invoice" }, { timeout: 5000 })).toBeInTheDocument();
  });

  it("shows an error state when the public share shell cannot load", async () => {
    fetchPublicShare.mockRejectedValueOnce(new Error("Share not found"));

    renderWithPreferences("missing");

    expect(await screen.findByText("Share not found")).toBeInTheDocument();
  });

  it("keeps the shell visible and shows a local detail error when endpoint loading fails", async () => {
    fetchPublicShareEndpoint.mockRejectedValueOnce(new Error("Endpoint detail failed"));

    renderWithPreferences();

    expect(await screen.findByText("Payments API")).toBeInTheDocument();
    expect(await screen.findByText("Endpoint detail failed")).toBeInTheDocument();
    expect(screen.getByText("搜索并浏览接口")).toBeInTheDocument();
  });

  it("shows an explicit empty state when filtering removes every endpoint", async () => {
    renderWithPreferences();

    await waitFor(() => expect(fetchPublicShareEndpoint).toHaveBeenCalledWith("share_abc123", 31));
    expect(await screen.findByRole("heading", { name: "Get invoice" }, { timeout: 5000 })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("搜索文档"), { target: { value: "missing" } });

    expect(await screen.findByText("当前文档搜索没有匹配的接口。")).toBeInTheDocument();
    expect(screen.getByText("未选择接口")).toBeInTheDocument();
  });
});
