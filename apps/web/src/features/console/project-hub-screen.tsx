"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  createProject,
  createSpace,
  fetchMe,
  fetchProjects,
  fetchSpaces,
  logout,
  type AuthMe,
  type ProjectSummary,
  type SpaceSummary,
} from "@api-hub/api-sdk";
import { ArrowLeft, ArrowRight, FolderKanban, Layers3, LogOut, Plus, Search, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ThemeCustomizer } from "@/components/layout/theme-customizer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { clearTokens, loadTokens } from "@/lib/auth-store";

import { SpecImportPanel } from "./spec-import-panel";

type ScreenStage = "space" | "project";

type CreateSpaceDraft = {
  name: string;
  spaceKey: string;
};

type CreateProjectDraft = {
  name: string;
  projectKey: string;
  description: string;
};

const EMPTY_SPACE_DRAFT: CreateSpaceDraft = {
  name: "",
  spaceKey: "",
};

const EMPTY_PROJECT_DRAFT: CreateProjectDraft = {
  name: "",
  projectKey: "",
  description: "",
};

function formatRoleLabel(role: string | null | undefined) {
  switch (role) {
    case "space_admin":
      return "分组管理员";
    case "project_admin":
      return "项目管理员";
    case "editor":
      return "编辑者";
    case "tester":
      return "测试者";
    case "viewer":
      return "访客";
    default:
      return "成员";
  }
}

function formatVisibleRoleLabel(role: string | null | undefined) {
  if (role === "resource_manage") {
    return "资源管理";
  }
  if (role === "resource_preview") {
    return "资源预览";
  }
  return formatRoleLabel(role);
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function ProjectHubScreen() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthMe | null>(null);
  const [spaces, setSpaces] = useState<SpaceSummary[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | null>(null);
  const [stage, setStage] = useState<ScreenStage>("space");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [creatingSpace, setCreatingSpace] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [spaceDraft, setSpaceDraft] = useState<CreateSpaceDraft>(EMPTY_SPACE_DRAFT);
  const [projectDraft, setProjectDraft] = useState<CreateProjectDraft>(EMPTY_PROJECT_DRAFT);

  const selectedSpace = useMemo(
    () => spaces.find((space) => space.id === selectedSpaceId) ?? null,
    [selectedSpaceId, spaces],
  );

  const visibleProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return projects;
    }
    return projects.filter((project) =>
      `${project.name} ${project.projectKey} ${project.description ?? ""}`.toLowerCase().includes(query),
    );
  }, [projects, searchQuery]);

  useEffect(() => {
    const { accessToken, refreshToken } = loadTokens();
    if (!accessToken && !refreshToken) {
      clearTokens();
      router.replace("/login");
      return;
    }

    let mounted = true;

    async function bootstrap() {
      setLoading(true);
      setError(null);
      try {
        const [meResponse, spacesResponse] = await Promise.all([fetchMe(), fetchSpaces()]);
        if (!mounted) {
          return;
        }
        setCurrentUser(meResponse.data);
        setSpaces(spacesResponse.data);
      } catch (loadError) {
        if (!mounted) {
          return;
        }
        clearTokens();
        router.replace("/login");
        setError(loadError instanceof Error ? loadError.message : "控制台加载失败。");
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
  }, [router]);

  async function refreshSpaces() {
    const response = await fetchSpaces();
    setSpaces(response.data);
  }

  async function loadProjectsBySpace(spaceId: number) {
    setLoadingProjects(true);
    try {
      const response = await fetchProjects(spaceId);
      setProjects(response.data);
    } catch (loadError) {
      setProjects([]);
      setError(loadError instanceof Error ? loadError.message : "组内项目加载失败。");
    } finally {
      setLoadingProjects(false);
    }
  }

  async function enterSpace(space: SpaceSummary) {
    setError(null);
    setMessage(null);
    setStage("project");
    setSelectedSpaceId(space.id);
    setSearchQuery("");
    await loadProjectsBySpace(space.id);
  }

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // ignore
    } finally {
      clearTokens();
      router.replace("/login");
    }
  }

  async function handleCreateSpace() {
    if (!spaceDraft.name.trim()) {
      return;
    }

    setCreatingSpace(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        name: spaceDraft.name.trim(),
        spaceKey: (spaceDraft.spaceKey.trim() || slugify(spaceDraft.name)) || "space",
      };
      const response = await createSpace(payload);
      const nextSpace = response.data;
      setSpaces((current) => [...current, nextSpace].sort((left, right) => left.id - right.id));
      setSpaceDraft(EMPTY_SPACE_DRAFT);
      setMessage(`已创建分组“${nextSpace.name}”。`);
      await enterSpace(nextSpace);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "创建分组失败。");
    } finally {
      setCreatingSpace(false);
    }
  }

  async function handleCreateProject() {
    if (!selectedSpaceId || !projectDraft.name.trim() || !projectDraft.projectKey.trim()) {
      return;
    }

    setCreatingProject(true);
    setError(null);
    setMessage(null);
    try {
      await createProject(
        {
          name: projectDraft.name.trim(),
          projectKey: projectDraft.projectKey.trim(),
          description: projectDraft.description.trim(),
          debugAllowedHosts: [],
        },
        selectedSpaceId,
      );
      setProjectDraft(EMPTY_PROJECT_DRAFT);
      setMessage("已在当前分组中创建项目。");
      await refreshSpaces();
      await loadProjectsBySpace(selectedSpaceId);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "创建项目失败。");
    } finally {
      setCreatingProject(false);
    }
  }

  if (loading) {
    return <main className="container py-10 text-sm text-muted-foreground">正在进入控制台...</main>;
  }

  return (
    <main className="container py-6 text-foreground">
      <section className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3 rounded-[1.5rem] border border-border bg-card/82 px-4 py-3 shadow-card">
          <div className="gradient-bg flex h-10 w-10 items-center justify-center rounded-2xl shadow-glow">
            <Layers3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">API Hub 控制台</p>
            <p className="truncate text-xs text-muted-foreground">
              {stage === "space"
                ? `先选择分组，再进入组内项目。当前共 ${spaces.length} 个分组`
                : `${selectedSpace?.name ?? "当前分组"} · ${projects.length} 个项目`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="glass flex items-center gap-3 rounded-[1.5rem] border border-border bg-card/84 px-4 py-2.5">
            <div className="gradient-bg flex h-9 w-9 items-center justify-center rounded-xl">
              <UserRound className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{currentUser?.displayName ?? currentUser?.username}</p>
              <p className="text-xs text-muted-foreground">@{currentUser?.username}</p>
            </div>
          </div>
          <ThemeCustomizer onToggle={() => setCustomizerOpen((value) => !value)} open={customizerOpen} />
          <Button onClick={handleLogout} size="sm" variant="outline">
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            退出登录
          </Button>
        </div>
      </section>

      {error ? (
        <div className="mb-6 rounded-[1.4rem] border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="mb-6 rounded-[1.4rem] border border-success/25 bg-success/10 px-4 py-3 text-sm text-success">
          {message}
        </div>
      ) : null}

      {stage === "space" ? (
        <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-5">
            <Card className="overflow-hidden rounded-[2rem] border-border/80 bg-card/86">
              <CardContent className="p-0">
                <div className="border-b border-border bg-gradient-to-r from-card via-card to-primary/5 px-5 py-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">第一步</p>
                      <h2 className="mt-2 text-2xl font-semibold text-foreground">选择分组</h2>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">
                        分组是控制台的隔离边界。选定分组后，我们再进入组内的项目、接口、环境和 Mock 工作流。
                      </p>
                    </div>
                    <div className="grid min-w-[220px] grid-cols-2 gap-3">
                      <StatCard label="分组数" value={spaces.length} />
                      <StatCard label="可进入" value={spaces.length} />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
                  {spaces.map((space, index) => (
                    <motion.button
                      className="cursor-pointer rounded-[1.7rem] border border-border bg-surface/68 p-5 text-left transition-smooth hover:border-primary/25 hover:bg-card hover:shadow-card-hover"
                      initial={{ opacity: 0, y: 14 }}
                      key={space.id}
                      onClick={() => void enterSpace(space)}
                      transition={{ delay: index * 0.04 }}
                      type="button"
                      viewport={{ once: true }}
                      whileInView={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-lg font-semibold text-foreground">{space.name}</p>
                          <p className="mt-1 font-mono text-xs text-muted-foreground">{space.spaceKey}</p>
                        </div>
                        <Badge>{space.projectCount}</Badge>
                      </div>
                      <div className="mt-6 flex items-center justify-between gap-3">
                        <div className="text-xs text-muted-foreground">
                          {formatVisibleRoleLabel(space.currentUserRole)} · {space.canCreateProject ? "可创建项目" : "只读"}
                        </div>
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                          进入
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </motion.button>
                  ))}

                  {spaces.length === 0 ? (
                    <div className="md:col-span-2 xl:col-span-3">
                      <EmptyState
                        icon={<Sparkles className="h-5 w-5 text-muted-foreground" />}
                        title="还没有分组"
                        description="先创建一个分组，作为项目、接口和环境的隔离空间。"
                      />
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-5 xl:sticky xl:top-6">
            <Card className="rounded-[2rem] border-border/80 bg-card/86">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">创建分组</p>
                    <h3 className="mt-2 text-xl font-semibold text-foreground">新建隔离空间</h3>
                  </div>
                  <Badge variant="success">Namespace</Badge>
                </div>

                <Input
                  onChange={(event) => {
                    const nextName = event.target.value;
                    setSpaceDraft((current) => ({
                      name: nextName,
                      spaceKey: current.spaceKey || slugify(nextName),
                    }));
                  }}
                  placeholder="例如：电商平台 API"
                  value={spaceDraft.name}
                />
                <Input
                  onChange={(event) => setSpaceDraft((current) => ({ ...current, spaceKey: event.target.value }))}
                  placeholder="例如：commerce-platform"
                  value={spaceDraft.spaceKey}
                />

                <Button
                  className="w-full"
                  disabled={creatingSpace || !spaceDraft.name.trim()}
                  onClick={() => void handleCreateSpace()}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  {creatingSpace ? "创建中..." : "创建分组"}
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-border/80 bg-card/80">
              <CardContent className="p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">推荐结构</p>
                <div className="mt-4 space-y-3">
                  <HintRow title="分组" value="电商平台 API" />
                  <HintRow title="项目" value="用户中心 / 商品中心 / 订单中心" />
                  <HintRow title="项目内" value="接口列表、环境、Mock、版本、调试" />
                </div>
              </CardContent>
            </Card>
          </aside>
        </section>
      ) : (
        <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-5">
            <Card className="rounded-[2rem] border-border/80 bg-card/86">
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="mb-3 flex items-center gap-3">
                      <Button onClick={() => setStage("space")} size="sm" type="button" variant="outline">
                        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                        返回分组
                      </Button>
                      <Badge variant="outline">{formatVisibleRoleLabel(selectedSpace?.currentUserRole)}</Badge>
                    </div>
                    <h2 className="text-2xl font-semibold text-foreground">{selectedSpace?.name ?? "当前分组"}</h2>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      当前分组下的项目会共享协作边界，但仍保留各自独立的接口、环境、版本和 Mock 能力。
                    </p>
                  </div>
                  <div className="grid min-w-[240px] grid-cols-2 gap-3">
                    <StatCard label="项目数" value={projects.length} />
                    <StatCard label="Key" value={selectedSpace?.spaceKey ?? "-"} mono />
                  </div>
                </div>

                <div className="relative mt-5">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-11 pl-10"
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="搜索项目名称、标识或说明"
                    value={searchQuery}
                  />
                </div>
              </CardContent>
            </Card>

            {loadingProjects ? (
              <div className="rounded-[1.8rem] border border-border bg-card/72 p-8 text-center text-sm text-muted-foreground">
                正在加载组内项目...
              </div>
            ) : null}

            {!loadingProjects ? (
              <div className="grid gap-5 md:grid-cols-2">
                {visibleProjects.map((project, index) => (
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    key={project.id}
                    transition={{ delay: index * 0.04 }}
                    viewport={{ once: true }}
                    whileInView={{ opacity: 1, y: 0 }}
                  >
                    <Card className="h-full rounded-[1.9rem] border-border/80 bg-card/84 hover:shadow-card-hover">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-lg font-semibold text-foreground">{project.name}</p>
                            <p className="mt-1 font-mono text-xs text-muted-foreground">{project.projectKey}</p>
                          </div>
                          <Badge variant={project.canWrite ? "success" : "outline"}>
                            {project.canWrite ? "可编辑" : "只读"}
                          </Badge>
                        </div>

                        <p className="mt-4 line-clamp-3 text-sm leading-7 text-muted-foreground">
                          {project.description || "暂无项目说明。"}
                        </p>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <InfoTile label="我的角色" value={formatVisibleRoleLabel(project.currentUserRole)} />
                          <InfoTile
                            label="协作权限"
                            value={project.canManageMembers ? "成员管理" : "项目协作"}
                            icon={<ShieldCheck className="h-4 w-4 text-primary" />}
                          />
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                          <Badge variant="outline">接口</Badge>
                          <Badge variant="outline">环境</Badge>
                          <Badge variant="outline">Mock</Badge>
                          <Badge variant="outline">版本</Badge>
                        </div>

                        <Link className="mt-6 block" href={`/console/projects/${project.id}/api`}>
                          <Button className="w-full">
                            进入项目
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : null}

            {!loadingProjects && visibleProjects.length === 0 ? (
              <EmptyState
                icon={<FolderKanban className="h-5 w-5 text-muted-foreground" />}
                title="当前分组下还没有匹配项目"
                description="你可以直接创建项目，或者从 OpenAPI / SmartDoc 导入生成项目。"
              />
            ) : null}

            {selectedSpaceId ? (
              <SpecImportPanel
                canSubmit={!!selectedSpace?.canCreateProject}
                mode="space-project"
                onImported={() => {
                  setMessage("已根据规格文档创建项目。");
                  void refreshSpaces();
                  void loadProjectsBySpace(selectedSpaceId);
                }}
                spaceId={selectedSpaceId}
              />
            ) : null}
          </section>

          <aside className="space-y-5 xl:sticky xl:top-6">
            <Card className="rounded-[2rem] border-border/80 bg-card/86">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">创建项目</p>
                    <h3 className="mt-2 text-xl font-semibold text-foreground">在当前分组内新建项目</h3>
                  </div>
                  <Badge variant={selectedSpace?.canCreateProject ? "success" : "outline"}>
                    {selectedSpace?.canCreateProject ? "可创建" : "受限"}
                  </Badge>
                </div>

                <Input
                  onChange={(event) => {
                    const nextName = event.target.value;
                    setProjectDraft((current) => ({
                      ...current,
                      name: nextName,
                      projectKey: current.projectKey || slugify(nextName),
                    }));
                  }}
                  placeholder="例如：用户中心"
                  value={projectDraft.name}
                />
                <Input
                  onChange={(event) => setProjectDraft((current) => ({ ...current, projectKey: event.target.value }))}
                  placeholder="例如：user-center"
                  value={projectDraft.projectKey}
                />
                <Textarea
                  className="min-h-[120px]"
                  onChange={(event) => setProjectDraft((current) => ({ ...current, description: event.target.value }))}
                  placeholder="简要说明这个项目承载的业务域或接口范围"
                  value={projectDraft.description}
                />

                <Button
                  className="w-full"
                  disabled={!selectedSpace?.canCreateProject || creatingProject || !projectDraft.name.trim() || !projectDraft.projectKey.trim()}
                  onClick={() => void handleCreateProject()}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  {creatingProject ? "创建中..." : "创建项目"}
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-border/80 bg-card/80">
              <CardContent className="p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">当前分组</p>
                <div className="mt-4 space-y-3">
                  <HintRow title="分组名称" value={selectedSpace?.name ?? "-"} />
                  <HintRow title="分组标识" value={selectedSpace?.spaceKey ?? "-"} mono />
                  <HintRow title="项目数量" value={`${selectedSpace?.projectCount ?? 0} 个`} />
                </div>
              </CardContent>
            </Card>
          </aside>
        </section>
      )}
    </main>
  );
}

function StatCard({ label, value, mono = false }: { label: string; value: number | string; mono?: boolean }) {
  return (
    <div className="rounded-[1.3rem] border border-border bg-surface/70 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={mono ? "mt-2 font-mono text-sm font-semibold text-foreground" : "mt-2 text-lg font-semibold text-foreground"}>
        {value}
      </p>
    </div>
  );
}

function HintRow({ title, value, mono = false }: { title: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-[1.3rem] border border-border bg-surface/70 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      <p className={mono ? "mt-2 font-mono text-sm font-semibold text-foreground" : "mt-2 text-sm font-semibold text-foreground"}>
        {value}
      </p>
    </div>
  );
}

function InfoTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-[1.3rem] bg-surface/70 px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  description,
  icon,
  title,
}: {
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-[2rem] border border-dashed border-border bg-card/72 px-6 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface/70">{icon}</div>
      <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p>
    </div>
  );
}
