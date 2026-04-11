import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const {
  fetchProjectShareLinks,
  createProjectShareLink,
  updateProjectShareLink
} = vi.hoisted(() => ({
  fetchProjectShareLinks: vi.fn(),
  createProjectShareLink: vi.fn(),
  updateProjectShareLink: vi.fn()
}));

vi.mock("@api-hub/api-sdk", () => ({
  fetchProjectShareLinks,
  createProjectShareLink,
  updateProjectShareLink
}));

import { ProjectShareDesk } from "./project-share-desk";

describe("ProjectShareDesk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });

    fetchProjectShareLinks
      .mockResolvedValueOnce({
        data: [
          {
            id: 3,
            projectId: 7,
            shareCode: "share_abc123",
            name: "External reviewers",
            description: "Read-only contract access",
            enabled: true,
            expiresAt: "2026-04-30T12:00:00Z",
            createdAt: "2026-04-11T08:00:00Z",
            updatedAt: "2026-04-11T08:00:00Z"
          }
        ]
      })
      .mockResolvedValue({
        data: [
          {
            id: 3,
            projectId: 7,
            shareCode: "share_abc123",
            name: "External reviewers",
            description: "Read-only contract access",
            enabled: false,
            expiresAt: null,
            createdAt: "2026-04-11T08:00:00Z",
            updatedAt: "2026-04-11T08:05:00Z"
          },
          {
            id: 4,
            projectId: 7,
            shareCode: "share_public999",
            name: "QA handoff",
            description: "Fresh handoff link",
            enabled: true,
            expiresAt: null,
            createdAt: "2026-04-11T08:10:00Z",
            updatedAt: "2026-04-11T08:10:00Z"
          }
        ]
      });

    createProjectShareLink.mockResolvedValue({
      data: {
        id: 4,
        projectId: 7,
        shareCode: "share_public999",
        name: "QA handoff",
        description: "Fresh handoff link",
        enabled: true,
        expiresAt: null,
        createdAt: "2026-04-11T08:10:00Z",
        updatedAt: "2026-04-11T08:10:00Z"
      }
    });

    updateProjectShareLink.mockResolvedValue({
      data: {
        id: 3,
        projectId: 7,
        shareCode: "share_abc123",
        name: "External reviewers",
        description: "Read-only contract access",
        enabled: false,
        expiresAt: null,
        createdAt: "2026-04-11T08:00:00Z",
        updatedAt: "2026-04-11T08:05:00Z"
      }
    });
  });

  it("loads share links, creates a new link, and copies a public url", async () => {
    render(<ProjectShareDesk projectId={7} />);

    expect(screen.getByText("Loading share links...")).toBeInTheDocument();
    const existingCard = await screen.findByRole("article", { name: "External reviewers" });
    expect(existingCard).toBeInTheDocument();
    expect(within(existingCard).getByText("Read-only contract access", { selector: "p" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Share name"), { target: { value: "QA handoff" } });
    fireEvent.change(screen.getByLabelText("Share description"), { target: { value: "Fresh handoff link" } });
    fireEvent.click(screen.getByRole("button", { name: "Create share link" }));

    await waitFor(() =>
      expect(createProjectShareLink).toHaveBeenCalledWith(7, {
        name: "QA handoff",
        description: "Fresh handoff link",
        expiresAt: null
      })
    );

    expect(await screen.findByText("QA handoff")).toBeInTheDocument();

    const qaCard = screen.getByRole("article", { name: "QA handoff" });
    fireEvent.click(within(qaCard).getByRole("button", { name: "Copy link" }));

    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("http://localhost:3000/share/share_public999")
    );
  });

  it("updates enablement and expiry state from the card action", async () => {
    render(<ProjectShareDesk projectId={7} />);

    const card = await screen.findByRole("article", { name: "External reviewers" });
    expect(within(card).getByText("Expires Apr 30, 2026")).toBeInTheDocument();

    fireEvent.click(within(card).getByRole("button", { name: "Disable link" }));

    await waitFor(() =>
      expect(updateProjectShareLink).toHaveBeenCalledWith(7, 3, {
        enabled: false
      })
    );

    expect(await screen.findByText("Disabled")).toBeInTheDocument();
  });

  it("edits existing share details and can clear expiry", async () => {
    render(<ProjectShareDesk projectId={7} />);

    const card = await screen.findByRole("article", { name: "External reviewers" });

    fireEvent.change(within(card).getByLabelText("Share name 3"), { target: { value: "Partner docs" } });
    fireEvent.change(within(card).getByLabelText("Share description 3"), { target: { value: "Partner-facing contract access" } });
    fireEvent.click(within(card).getByRole("button", { name: "Save details" }));

    await waitFor(() =>
      expect(updateProjectShareLink).toHaveBeenNthCalledWith(1, 7, 3, {
        name: "Partner docs",
        description: "Partner-facing contract access"
      })
    );

    fireEvent.change(within(card).getByLabelText("Expiry 3"), { target: { value: "" } });
    fireEvent.click(within(card).getByRole("button", { name: "Save expiry" }));

    await waitFor(() =>
      expect(updateProjectShareLink).toHaveBeenNthCalledWith(2, 7, 3, {
        clearExpiry: true
      })
    );
  });
});
