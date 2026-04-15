"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Bot,
  BookMarked,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  FlaskConical,
  FolderOpen,
  Layers3,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareMore,
  Search,
  Share2,
  TestTube2,
  Waypoints,
  Workflow,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { fetchMe, fetchProject, fetchProjectTree, isApiRequestError, type AuthMe, type ModuleTreeItem, type ProjectDetail } from "@api-hub/api-sdk";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { ThemeCustomizer } from "@/components/layout/theme-customizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { flattenProjectTree } from "@/features/console/tree-utils";
import { clearTokens } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "search", icon: Search, label: "搜索" },
  { href: "api", icon: LayoutDashboard, label: "接口列表" },
  { href: "debug", icon: TestTube2, label: "调试台" },
  { href: "environments", icon: Wrench, label: "环境" },
  { href: "versions", icon: Workflow, label: "版本" },
  { href: "mock", icon: Waypoints, label: "Mock" },
  { href: "notifications", icon: Bell, label: "通知" },
  { href: "ai", icon: Bot, label: "AI配置" },
  { href: "ai-assistant", icon: MessageSquareMore, label: "AI助手" },
  { href: "dictionary", icon: BookMarked, label: "字典中心" },
  { href: "share", icon: Share2, label: "分享" },
  { href: "test-suites", icon: FlaskConical, label: "测试套件" },
] as const;

type ProjectConsoleLayoutProps = {
  children: React.ReactNode;
  description?: string;
  projectId: number;
  title: string;
};

export function ProjectConsoleLayout({ children, projectId, title }: ProjectConsoleLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthMe | null>(null);
  const [modules, setModules] = useState<ModuleTreeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarQuery, setSidebarQuery] = useState("");

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      setLoading(true);
      setError(null);
      try {
        const [meResponse, projectResponse, treeResponse] = await Promise.all([fetchMe(), fetchProject(projectId), fetchProjectTree(projectId)]);
        if (!mounted) {
          return;
        }
        setCurrentUser(meResponse.data);
        setProject(projectResponse.data);
        setModules(treeResponse.data.modules);
      } catch (loadError) {
        if (!mounted) {
          return;
        }
        if (isApiRequestError(loadError) && loadError.status === 401) {
          clearTokens();
          router.replace("/login");
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "项目控制台加载失败");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, [projectId, router]);

  const endpointEntries = useMemo(() => flattenProjectTree(modules), [modules]);
  const filteredEntries = useMemo(() => {
    const normalized = sidebarQuery.trim().toLowerCase();
    if (!normalized) {
      return endpointEntries.slice(0, 16);
    }
    return endpointEntries
      .filter((item) => `${item.moduleName} ${item.groupName} ${item.endpoint.name} ${item.endpoint.path}`.toLowerCase().includes(normalized))
      .slice(0, 16);
  }, [endpointEntries, sidebarQuery]);

  function handleLogout() {
    clearTokens();
    router.replace("/login");
  }

  function renderSidebar() {
    return (
      <aside
        className={cn(
          "glass scrollbar-thin fixed inset-y-0 left-0 z-50 flex w-[292px] flex-col border-r border-border bg-card/92 transition-smooth lg:static lg:z-auto",
          collapsed ? "lg:w-[96px]" : "lg:w-[292px]",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-border px-5">
          <div className="gradient-bg shadow-glow flex h-10 w-10 items-center justify-center rounded-2xl">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">API Hub</p>
              <p className="text-[11px] tracking-[0.18em] text-muted-foreground">项目控制台</p>
            </div>
          ) : null}
          <button className="ml-auto rounded-xl p-2 text-muted-foreground transition-fast hover:bg-accent hover:text-foreground lg:hidden" onClick={() => setMobileSidebarOpen(false)} type="button">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-border px-4 py-4">
          <Link className="block rounded-[1.5rem] border border-border bg-surface/68 px-4 py-4 transition-smooth hover:border-primary/20" href="/console">
            <div className="flex items-center gap-3">
              <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
              {!collapsed ? (
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{project?.name ?? `项目 #${projectId}`}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {project?.spaceName ? `${project.spaceName} / ${project.projectKey}` : project?.projectKey ?? "返回分组与项目选择"}
                  </p>
                </div>
              ) : null}
            </div>
          </Link>
        </div>

        <nav className="space-y-1 border-b border-border px-3 py-4">
          {navItems.map((item) => {
            const active = pathname.split("/").includes(item.href);
            return (
              <Link
                className={cn(
                  "flex items-center gap-3 rounded-[1.2rem] transition-fast",
                  collapsed ? "justify-center px-0 py-3" : "px-3 py-3",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
                href={`/console/projects/${projectId}/${item.href}`}
                key={item.href}
                onClick={() => setMobileSidebarOpen(false)}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed ? <span className="text-sm font-medium">{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>

        {!collapsed ? (
          <div className="flex min-h-0 flex-1 flex-col px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers3 className="h-4 w-4 text-primary" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">快速接口入口</p>
              </div>
              <span className="text-[11px] text-muted-foreground">{endpointEntries.length}</span>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-9 pl-9 text-xs" onChange={(event) => setSidebarQuery(event.target.value)} placeholder="搜索接口" value={sidebarQuery} />
            </div>

            <div className="scrollbar-thin space-y-2 overflow-y-auto pb-2">
              {filteredEntries.map((item) => (
                <Link
                  className="block rounded-[1.2rem] border border-border bg-surface/60 px-3 py-3 transition-smooth hover:border-primary/20 hover:bg-primary/5"
                  href={`/console/projects/${projectId}/api?endpointId=${item.endpoint.id}`}
                  key={item.endpoint.id}
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  <p className="truncate text-xs font-semibold text-foreground">{item.endpoint.name}</p>
                  <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{item.endpoint.path}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {item.moduleName} / {item.groupName}
                  </p>
                </Link>
              ))}

              {filteredEntries.length === 0 ? (
                <div className="rounded-[1.3rem] border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">没有匹配的接口</div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="hidden border-t border-border px-3 py-4 lg:block">
          <button className="flex w-full items-center justify-center rounded-2xl py-2 text-muted-foreground transition-fast hover:bg-accent hover:text-foreground" onClick={() => setCollapsed((value) => !value)} type="button">
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>
    );
  }

  if (loading) {
    return <main className="container py-10 text-sm text-muted-foreground">正在进入项目控制台...</main>;
  }

  if (error) {
    return (
      <main className="container py-10">
        <div className="rounded-[1.8rem] border border-destructive/20 bg-destructive/10 px-6 py-6 text-sm text-destructive">{error}</div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-transparent">
      {mobileSidebarOpen ? <div className="fixed inset-0 z-40 bg-background/75 backdrop-blur-sm lg:hidden" onClick={() => setMobileSidebarOpen(false)} /> : null}
      {renderSidebar()}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-30 border-b border-border bg-card/72">
          <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <button className="rounded-xl p-2 text-muted-foreground transition-fast hover:bg-accent hover:text-foreground lg:hidden" onClick={() => setMobileSidebarOpen(true)} type="button">
                <Menu className="h-4 w-4" />
              </button>

              <Link className="hidden items-center gap-1 text-xs text-muted-foreground transition-fast hover:text-foreground sm:flex" href="/console">
                <ChevronLeft className="h-3.5 w-3.5" />
                返回分组与项目
              </Link>

              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {project?.spaceName ? `${project.spaceName} / ${project.name}` : project?.name ?? `项目 #${projectId}`}
                </p>
                <h1 className="mt-1 truncate text-xl font-semibold text-foreground">{title}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeCustomizer compact onToggle={() => setCustomizerOpen((value) => !value)} open={customizerOpen} />
              <Button size="icon-sm" variant="ghost">
                <Bell className="h-4 w-4" />
              </Button>
              <Button onClick={handleLogout} size="icon-sm" variant="ghost">
                <LogOut className="h-4 w-4" />
              </Button>
              <div className="gradient-bg flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-primary-foreground">
                {(currentUser?.displayName ?? currentUser?.username ?? "U").slice(0, 1).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-5">{children}</main>
      </div>
    </div>
  );
}
