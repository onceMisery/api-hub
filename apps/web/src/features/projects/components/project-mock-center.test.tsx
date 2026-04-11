import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const {
  fetchProjectMockCenter,
  updateProjectMockAccess,
  publishProjectMockCenterEndpoint
} = vi.hoisted(() => ({
  fetchProjectMockCenter: vi.fn(),
  updateProjectMockAccess: vi.fn(),
  publishProjectMockCenterEndpoint: vi.fn()
}));

vi.mock("@api-hub/api-sdk", () => ({
  fetchProjectMockCenter,
  updateProjectMockAccess,
  publishProjectMockCenterEndpoint
}));

import { AppPreferencesProvider } from "../../../lib/ui-preferences";
import { ProjectMockCenter } from "./project-mock-center";

describe("ProjectMockCenter", () => {
  function renderWithPreferences() {
    return render(
      <AppPreferencesProvider>
        <ProjectMockCenter projectId={7} />
      </AppPreferencesProvider>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();

    fetchProjectMockCenter
      .mockResolvedValueOnce({
        data: {
          settings: {
            mode: "token",
            token: "preview_token"
          },
          items: [
            {
              endpointId: 31,
              endpointName: "Get invoice",
              method: "GET",
              path: "/invoices/{id}",
              moduleName: "Billing",
              groupName: "Invoices",
              mockEnabled: true,
              latestReleaseNo: 4,
              latestReleaseAt: "2026-04-11T09:00:00Z",
              draftChanged: true,
              totalRuleCount: 5,
              enabledRuleCount: 4,
              responseFieldCount: 7
            },
            {
              endpointId: 32,
              endpointName: "Create invoice",
              method: "POST",
              path: "/invoices",
              moduleName: "Billing",
              groupName: "Invoices",
              mockEnabled: false,
              latestReleaseNo: null,
              latestReleaseAt: null,
              draftChanged: false,
              totalRuleCount: 0,
              enabledRuleCount: 0,
              responseFieldCount: 3
            }
          ]
        }
      })
      .mockResolvedValue({
        data: {
          settings: {
            mode: "public",
            token: "rotated_token"
          },
          items: [
            {
              endpointId: 31,
              endpointName: "Get invoice",
              method: "GET",
              path: "/invoices/{id}",
              moduleName: "Billing",
              groupName: "Invoices",
              mockEnabled: true,
              latestReleaseNo: 5,
              latestReleaseAt: "2026-04-11T10:00:00Z",
              draftChanged: false,
              totalRuleCount: 5,
              enabledRuleCount: 4,
              responseFieldCount: 7
            },
            {
              endpointId: 32,
              endpointName: "Create invoice",
              method: "POST",
              path: "/invoices",
              moduleName: "Billing",
              groupName: "Invoices",
              mockEnabled: false,
              latestReleaseNo: null,
              latestReleaseAt: null,
              draftChanged: false,
              totalRuleCount: 0,
              enabledRuleCount: 0,
              responseFieldCount: 3
            }
          ]
        }
      });

    updateProjectMockAccess.mockResolvedValue({
      data: {
        mode: "public",
        token: "rotated_token"
      }
    });

    publishProjectMockCenterEndpoint.mockResolvedValue({
      data: {
        endpointId: 31,
        latestReleaseNo: 5
      }
    });
  });

  it("shows runtime posture and updates access mode", async () => {
    renderWithPreferences();

    expect(screen.getByText("正在加载 Mock 中心...")).toBeInTheDocument();
    expect(await screen.findByText("preview_token")).toBeInTheDocument();
    expect(screen.getByText("Get invoice")).toBeInTheDocument();
    expect(screen.getByText("草稿有漂移")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "公开模式" }));
    fireEvent.change(screen.getByLabelText("Mock 访问令牌"), { target: { value: "rotated_token" } });
    fireEvent.click(screen.getByRole("button", { name: "保存 Mock 访问" }));

    await waitFor(() =>
      expect(updateProjectMockAccess).toHaveBeenCalledWith(7, {
        mode: "public",
        token: "rotated_token"
      })
    );

    expect(await screen.findByText("所有调用方都可以访问公开 Mock 流量。")).toBeInTheDocument();
  });

  it("publishes one endpoint and refreshes the release card state", async () => {
    renderWithPreferences();

    const card = await screen.findByRole("article", { name: "Get invoice" });
    expect(within(card).getByText("发布 #4")).toBeInTheDocument();

    fireEvent.click(within(card).getByRole("button", { name: "发布接口" }));

    await waitFor(() => expect(publishProjectMockCenterEndpoint).toHaveBeenCalledWith(7, 31));
    expect(await screen.findByText("发布 #5")).toBeInTheDocument();
    expect(screen.getByText("Mock 未启用")).toBeInTheDocument();
  });

  it("regenerates the shared runtime token from the access panel", async () => {
    renderWithPreferences();

    expect(await screen.findByText("preview_token")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "重新生成令牌" }));

    await waitFor(() =>
      expect(updateProjectMockAccess).toHaveBeenCalledWith(7, {
        mode: "token",
        regenerateToken: true
      })
    );

    expect(await screen.findByText("rotated_token")).toBeInTheDocument();
  });
});
