import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AppPreferencesProvider, useAppPreferences } from "./ui-preferences";

function PreferenceProbe() {
  const { locale, resolvedTheme, setLocale, setTheme, t } = useAppPreferences();

  return (
    <div>
      <p>{locale}</p>
      <p>{resolvedTheme}</p>
      <p>{t("session.title")}</p>
      <p>{t("catalog.createProject")}</p>
      <button onClick={() => setLocale("en-US")} type="button">
        set english
      </button>
      <button onClick={() => setTheme("dark")} type="button">
        set dark
      </button>
    </div>
  );
}

describe("AppPreferencesProvider", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.localStorage.clear();
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

  afterAll(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: originalMatchMedia
    });
  });

  it("defaults to zh-CN and follows the system dark preference", async () => {
    render(
      <AppPreferencesProvider>
        <PreferenceProbe />
      </AppPreferencesProvider>
    );

    expect(screen.getByText("zh-CN")).toBeInTheDocument();
    expect(screen.getByText("会话")).toBeInTheDocument();
    expect(screen.getByText("创建项目")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("dark")).toBeInTheDocument();
      expect(document.documentElement.lang).toBe("zh-CN");
      expect(document.documentElement.dataset.theme).toBe("dark");
    });
  });

  it("persists locale and theme changes", async () => {
    render(
      <AppPreferencesProvider>
        <PreferenceProbe />
      </AppPreferencesProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "set english" }));
    fireEvent.click(screen.getByRole("button", { name: "set dark" }));

    await waitFor(() => {
      expect(window.localStorage.getItem("apihub.locale")).toBe("en-US");
      expect(window.localStorage.getItem("apihub.theme")).toBe("dark");
      expect(document.documentElement.lang).toBe("en-US");
      expect(document.documentElement.dataset.theme).toBe("dark");
      expect(screen.getByText("Session")).toBeInTheDocument();
    });
  });

  it("falls back to light mode when matchMedia is unavailable", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: undefined
    });

    render(
      <AppPreferencesProvider>
        <PreferenceProbe />
      </AppPreferencesProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("light")).toBeInTheDocument();
      expect(document.documentElement.dataset.theme).toBe("light");
    });
  });
});
