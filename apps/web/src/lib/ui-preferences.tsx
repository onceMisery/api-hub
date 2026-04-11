"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";

export type AppLocale = "zh-CN" | "en-US";
export type ThemePreference = "system" | "dark" | "light";
export type ResolvedTheme = "dark" | "light";

const LOCALE_STORAGE_KEY = "apihub.locale";
const THEME_STORAGE_KEY = "apihub.theme";

type TranslationValues = Record<string, string | number>;

const messages = {
  "en-US": {
    "catalog.createProject": "Create project",
    "catalog.empty": "No matching projects. Adjust the search query or project group.",
    "catalog.emptyAll": "No workspaces yet",
    "catalog.emptyAllDetail":
      "Create the first project to start shaping grouped endpoints, debug policies, and mock runtime snapshots.",
    "catalog.group.all": "All projects",
    "catalog.group.all.description": "Browse every workspace you can access in this console.",
    "catalog.group.editable": "Editable",
    "catalog.group.editable.description": "Projects where you can shape APIs and runtime behavior.",
    "catalog.group.manage": "Manage members",
    "catalog.group.manage.description": "Projects where you can rebalance collaborators and ownership.",
    "catalog.group.review": "Review only",
    "catalog.group.review.description": "Read-only workspaces for review, browsing, and verification.",
    "catalog.heading": "Project command center",
    "catalog.search": "Search projects",
    "catalog.searchPlaceholder": "Search by project name, key, or description",
    "catalog.subtitle": "Choose a group first, then open the right API workspace.",
    "catalog.title": "Projects",
    "project.access.admin": "Project admin access",
    "project.access.editor": "Editor access",
    "project.access.fallback": "Project access",
    "project.access.tester": "Tester access",
    "project.access.viewer": "Viewer access",
    "project.action.browseDocs": "Browse docs",
    "project.action.enter": "Enter workspace",
    "project.action.open": "Open",
    "project.badge.manage": "Can manage members",
    "project.badge.readOnly": "Read-only",
    "project.badge.review": "Member review",
    "project.badge.writable": "Writable",
    "project.debugRuleCount": "{count} debug rule",
    "project.debugRuleCount_plural": "{count} debug rules",
    "project.fallbackDescription": "Structured API docs, grouped endpoints, and version snapshots in one workspace.",
    "project.runtimePosture": "Runtime posture",
    "session.backToProjects": "Back to projects",
    "session.changeToChinese": "Switch to Chinese",
    "session.changeToEnglish": "Switch to English",
    "session.loading": "Loading session...",
    "session.signOut": "Sign out",
    "session.signingOut": "Signing out...",
    "session.themeDark": "Switch to dark mode",
    "session.themeLight": "Switch to light mode",
    "session.themeSystem": "Follow system theme",
    "session.title": "Session",
    "workbench.tab.debug": "Debug",
    "workbench.tab.documentation": "Documentation",
    "workbench.tab.environments": "Environments",
    "workbench.tab.members": "Members",
    "workbench.tab.mock": "Mock",
    "workbench.tab.overview": "Overview"
  },
  "zh-CN": {
    "catalog.createProject": "创建项目",
    "catalog.empty": "没有匹配的项目，请调整搜索词或切换项目分组。",
    "catalog.emptyAll": "还没有项目工作区",
    "catalog.emptyAllDetail": "创建第一个项目后，你就可以开始组织接口、调试策略和 Mock 运行时快照。",
    "catalog.group.all": "全部项目",
    "catalog.group.all.description": "查看你在当前控制台可访问的全部项目。",
    "catalog.group.editable": "可编辑",
    "catalog.group.editable.description": "你可以直接维护 API 和运行时行为的项目。",
    "catalog.group.manage": "成员管理",
    "catalog.group.manage.description": "你可以调整协作者和权限席位的项目。",
    "catalog.group.review": "只读评审",
    "catalog.group.review.description": "用于查阅、验收和只读评审的项目。",
    "catalog.heading": "项目控制台",
    "catalog.search": "搜索项目",
    "catalog.searchPlaceholder": "按项目名称、标识或描述搜索",
    "catalog.subtitle": "先选择分组，再进入对应的 API 项目工作区。",
    "catalog.title": "项目",
    "project.access.admin": "项目管理员",
    "project.access.editor": "编辑权限",
    "project.access.fallback": "项目权限",
    "project.access.tester": "测试权限",
    "project.access.viewer": "查看权限",
    "project.action.browseDocs": "浏览文档",
    "project.action.enter": "进入工作台",
    "project.action.open": "打开",
    "project.badge.manage": "可管理成员",
    "project.badge.readOnly": "只读",
    "project.badge.review": "成员评审",
    "project.badge.writable": "可编辑",
    "project.debugRuleCount": "{count} 条调试规则",
    "project.debugRuleCount_plural": "{count} 条调试规则",
    "project.fallbackDescription": "在一个项目里统一管理 API 文档、分组接口和版本快照。",
    "project.runtimePosture": "运行时状态",
    "session.backToProjects": "返回项目列表",
    "session.changeToChinese": "切换为中文",
    "session.changeToEnglish": "切换为 English",
    "session.loading": "正在加载会话...",
    "session.signOut": "退出登录",
    "session.signingOut": "正在退出...",
    "session.themeDark": "切换为深色模式",
    "session.themeLight": "切换为浅色模式",
    "session.themeSystem": "跟随系统主题",
    "session.title": "会话",
    "workbench.tab.debug": "调试",
    "workbench.tab.documentation": "文档",
    "workbench.tab.environments": "环境",
    "workbench.tab.members": "成员",
    "workbench.tab.mock": "Mock",
    "workbench.tab.overview": "总览"
  }
} as const;

type MessageKey = keyof (typeof messages)["en-US"];

type AppPreferencesContextValue = {
  locale: AppLocale;
  resolvedTheme: ResolvedTheme;
  setLocale: (locale: AppLocale) => void;
  setTheme: (theme: ThemePreference) => void;
  t: (key: MessageKey, values?: TranslationValues) => string;
  theme: ThemePreference;
};

const defaultContext: AppPreferencesContextValue = {
  locale: "en-US",
  resolvedTheme: "light",
  setLocale: () => undefined,
  setTheme: () => undefined,
  t: (key, values) => formatMessage(messages["en-US"][key], values),
  theme: "light"
};

const AppPreferencesContext = createContext<AppPreferencesContextValue>(defaultContext);

export function AppPreferencesProvider({ children }: PropsWithChildren) {
  const [locale, setLocale] = useState<AppLocale>("zh-CN");
  const [theme, setTheme] = useState<ThemePreference>("system");
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (storedLocale === "zh-CN" || storedLocale === "en-US") {
      setLocale(storedLocale);
    }

    if (storedTheme === "system" || storedTheme === "dark" || storedTheme === "light") {
      setTheme(storedTheme);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (typeof window.matchMedia !== "function") {
      setSystemTheme("light");
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function syncSystemTheme() {
      setSystemTheme(mediaQuery.matches ? "dark" : "light");
    }

    syncSystemTheme();
    mediaQuery.addEventListener?.("change", syncSystemTheme);

    return () => mediaQuery.removeEventListener?.("change", syncSystemTheme);
  }, []);

  const resolvedTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme, theme]);

  const value = useMemo<AppPreferencesContextValue>(
    () => ({
      locale,
      resolvedTheme,
      setLocale,
      setTheme,
      t: (key, values) => formatMessage(messages[locale][key] ?? messages["en-US"][key], values),
      theme
    }),
    [locale, resolvedTheme, theme]
  );

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
}

export function useAppPreferences() {
  return useContext(AppPreferencesContext);
}

export function useI18n() {
  const { locale, t } = useAppPreferences();

  return {
    locale,
    t
  };
}

function formatMessage(template: string, values?: TranslationValues) {
  if (!values) {
    return template;
  }

  const pluralTemplate =
    values.count !== undefined && Number(values.count) !== 1
      ? template === messages["en-US"]["project.debugRuleCount"]
        ? messages["en-US"]["project.debugRuleCount_plural"]
        : template === messages["zh-CN"]["project.debugRuleCount"]
          ? messages["zh-CN"]["project.debugRuleCount_plural"]
          : template
      : template;

  return pluralTemplate.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}
