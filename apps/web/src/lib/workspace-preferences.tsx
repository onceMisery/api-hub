"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

export type WorkspaceTheme = "light" | "dark";
export type WorkspaceAccent = "violet" | "emerald" | "cyan" | "amber" | "rose";
export type WorkspaceBackgroundMode = "none" | "upload";

type WorkspacePreferencesContextValue = {
  accent: WorkspaceAccent;
  backgroundImageUrl: string;
  backgroundMode: WorkspaceBackgroundMode;
  clearBackgroundImage: () => void;
  setAccent: (accent: WorkspaceAccent) => void;
  setBackgroundImageUrl: (imageUrl: string) => void;
  setBackgroundMode: (mode: WorkspaceBackgroundMode) => void;
  setTheme: (theme: WorkspaceTheme) => void;
  theme: WorkspaceTheme;
};

const THEME_STORAGE_KEY = "apihub.ui.theme";
const ACCENT_STORAGE_KEY = "apihub.ui.accent";
const BACKGROUND_MODE_STORAGE_KEY = "apihub.ui.background.mode";
const BACKGROUND_IMAGE_STORAGE_KEY = "apihub.ui.background.image";

const WorkspacePreferencesContext = createContext<WorkspacePreferencesContextValue | null>(null);

function escapeCssUrl(value: string) {
  return value.replace(/"/g, '\\"');
}

export function WorkspacePreferencesProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<WorkspaceTheme>("dark");
  const [accent, setAccent] = useState<WorkspaceAccent>("violet");
  const [backgroundMode, setBackgroundMode] = useState<WorkspaceBackgroundMode>("none");
  const [backgroundImageUrl, setBackgroundImageUrlState] = useState("");
  const hasCustomBackground = backgroundMode === "upload" && Boolean(backgroundImageUrl);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const nextTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const nextAccent = window.localStorage.getItem(ACCENT_STORAGE_KEY);
    const nextBackgroundMode = window.localStorage.getItem(BACKGROUND_MODE_STORAGE_KEY);
    const nextBackgroundImage = window.localStorage.getItem(BACKGROUND_IMAGE_STORAGE_KEY);

    if (nextTheme === "light" || nextTheme === "dark") {
      setTheme(nextTheme);
    }
    if (nextAccent === "violet" || nextAccent === "emerald" || nextAccent === "cyan" || nextAccent === "amber" || nextAccent === "rose") {
      setAccent(nextAccent);
    }
    if (nextBackgroundMode === "none" || nextBackgroundMode === "upload") {
      setBackgroundMode(nextBackgroundMode);
    }
    if (nextBackgroundImage) {
      setBackgroundImageUrlState(nextBackgroundImage);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const root = document.documentElement;

    root.classList.toggle("dark", theme === "dark");
    root.dataset.theme = theme;
    root.dataset.accent = accent;
    root.dataset.backgroundMode = backgroundMode;
    root.style.colorScheme = theme;
    root.style.setProperty("--workspace-bg-image", hasCustomBackground ? `url("${escapeCssUrl(backgroundImageUrl)}")` : "none");

    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    window.localStorage.setItem(ACCENT_STORAGE_KEY, accent);
    window.localStorage.setItem(BACKGROUND_MODE_STORAGE_KEY, backgroundMode);

    if (backgroundImageUrl) {
      window.localStorage.setItem(BACKGROUND_IMAGE_STORAGE_KEY, backgroundImageUrl);
    } else {
      window.localStorage.removeItem(BACKGROUND_IMAGE_STORAGE_KEY);
    }
  }, [accent, backgroundImageUrl, backgroundMode, theme]);

  function setBackgroundImageUrl(imageUrl: string) {
    setBackgroundImageUrlState(imageUrl);
    setBackgroundMode(imageUrl ? "upload" : "none");
  }

  function clearBackgroundImage() {
    setBackgroundImageUrlState("");
    setBackgroundMode("none");
  }

  const value = useMemo(
    () => ({
      accent,
      backgroundImageUrl,
      backgroundMode,
      clearBackgroundImage,
      setAccent,
      setBackgroundImageUrl,
      setBackgroundMode,
      setTheme,
      theme,
    }),
    [accent, backgroundImageUrl, backgroundMode, theme],
  );

  return (
    <WorkspacePreferencesContext.Provider value={value}>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
      >
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.18]"
          style={{
            backgroundAttachment: "fixed",
            backgroundImage: hasCustomBackground ? `url("${backgroundImageUrl}")` : "none",
            transform: hasCustomBackground ? "scale(1.02)" : undefined,
          }}
        />
      </div>
      <div className="relative z-[1]">{children}</div>
    </WorkspacePreferencesContext.Provider>
  );
}

export function useWorkspacePreferences() {
  const context = useContext(WorkspacePreferencesContext);
  if (!context) {
    throw new Error("useWorkspacePreferences must be used within WorkspacePreferencesProvider");
  }

  return context;
}
