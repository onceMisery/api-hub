import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { mockPush, mockRefresh, mockReplace, login, fetchMe } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
  mockReplace: vi.fn(),
  login: vi.fn(),
  fetchMe: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    replace: mockReplace
  })
}));

vi.mock("@api-hub/api-sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@api-hub/api-sdk")>();
  return {
    ...actual,
    login,
    fetchMe
  };
});

import { LoginForm } from "./login-form";
import { saveTokens } from "../../../lib/auth-store";

describe("LoginForm", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it("redirects to the console when an existing session is already valid", async () => {
    fetchMe.mockResolvedValue({
      code: 0,
      message: "ok",
      data: { id: 1, username: "admin", displayName: "Administrator" }
    });
    saveTokens("access", "refresh");

    render(<LoginForm />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/console/projects"));
  });

  it("logs in and stores fresh tokens", async () => {
    fetchMe.mockRejectedValue(new Error("No session"));
    login.mockResolvedValue({
      code: 0,
      message: "ok",
      data: { accessToken: "new-access", refreshToken: "new-refresh" }
    });

    render(<LoginForm />);

    fireEvent.click(screen.getByRole("button", { name: "Enter Console" }));

    await waitFor(() => expect(login).toHaveBeenCalledWith({ username: "admin", password: "123456" }));
    expect(window.localStorage.getItem("apihub.accessToken")).toBe("new-access");
    expect(window.localStorage.getItem("apihub.refreshToken")).toBe("new-refresh");
    expect(mockPush).toHaveBeenCalledWith("/console/projects");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("prefills seeded role accounts for quick verification", async () => {
    fetchMe.mockRejectedValue(new Error("No session"));

    render(<LoginForm />);

    fireEvent.click(screen.getByRole("button", { name: "Use Viewer account" }));
    expect(screen.getByRole("textbox", { name: "Username" })).toHaveValue("viewer");
    expect(screen.getByLabelText("Password")).toHaveValue("123456");

    fireEvent.click(screen.getByRole("button", { name: "Use Editor account" }));
    expect(screen.getByRole("textbox", { name: "Username" })).toHaveValue("editor");

    fireEvent.click(screen.getByRole("button", { name: "Use Admin account" }));
    expect(screen.getByRole("textbox", { name: "Username" })).toHaveValue("admin");
  });
});
