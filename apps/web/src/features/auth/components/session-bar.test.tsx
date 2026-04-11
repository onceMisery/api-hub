import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { mockReplace, fetchMe, logout } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  fetchMe: vi.fn(),
  logout: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace
  })
}));

vi.mock("@api-hub/api-sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@api-hub/api-sdk")>();
  return {
    ...actual,
    fetchMe,
    logout
  };
});

import { SessionBar } from "./session-bar";
import { saveTokens } from "../../../lib/auth-store";
import { AppPreferencesProvider } from "../../../lib/ui-preferences";

describe("SessionBar", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        removeEventListener: vi.fn(),
        removeListener: vi.fn()
      }))
    });
  });

  it("loads the current user and logs out from the session bar", async () => {
    fetchMe.mockResolvedValue({
      code: 0,
      message: "ok",
      data: { id: 1, username: "admin", displayName: "Administrator", email: "admin@local.dev" }
    });
    logout.mockResolvedValue({ code: 0, message: "ok", data: null });
    saveTokens("access", "refresh");

    render(<SessionBar />);

    expect(await screen.findByText("Administrator")).toBeInTheDocument();
    expect(screen.getByText("@admin")).toBeInTheDocument();
    expect(screen.getByText("admin@local.dev")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(logout).toHaveBeenCalled());
    expect(window.localStorage.getItem("apihub.accessToken")).toBeNull();
    expect(window.localStorage.getItem("apihub.refreshToken")).toBeNull();
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  it("renders zh-CN shell controls including the back button and preference switches", async () => {
    fetchMe.mockResolvedValue({
      code: 0,
      message: "ok",
      data: { id: 1, username: "admin", displayName: "Administrator", email: "admin@local.dev" }
    });
    logout.mockResolvedValue({ code: 0, message: "ok", data: null });
    saveTokens("access", "refresh");

    render(
      <AppPreferencesProvider>
        <SessionBar backHref="/console/projects" />
      </AppPreferencesProvider>
    );

    expect(await screen.findByText("Administrator")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "返回项目列表" })).toHaveAttribute("href", "/console/projects");
    expect(screen.getByRole("button", { name: "切换为英文" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "切换为深色模式" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "退出登录" })).toBeInTheDocument();
  });
});
