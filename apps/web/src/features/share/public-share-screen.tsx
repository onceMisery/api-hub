"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchPublicShareEndpoint, type PublicShareEndpointBundle, type PublicShareShell } from "@api-hub/api-sdk";
import { ChevronDown, ChevronRight, Copy, FileText, FolderOpen, ScrollText, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Badge, MethodBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { filterModules, findFirstEndpointId } from "@/features/console/tree-utils";

type PublicShareScreenProps = {
  initialEndpointId?: number;
  share: PublicShareShell;
  shareCode: string;
};

function formatTimestamp(value?: string | null) {
  if (!value) {
    return "未记录";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function resolveFetchError(error: unknown) {
  return error instanceof Error ? error.message : "公开接口详情加载失败。";
}

export function PublicShareScreen({ shareCode, share, initialEndpointId }: PublicShareScreenProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [treeQuery, setTreeQuery] = useState("");
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>(() => {
    const next: Record<string, boolean> = {};
    share.tree.modules.forEach((module) => {
      next[`module-${module.id}`] = true;
      module.groups.forEach((group) => {
        next[`group-${group.id}`] = true;
      });
    });
    return next;
  });
  const [selectedEndpointId, setSelectedEndpointId] = useState<number | null>(initialEndpointId ?? findFirstEndpointId(share.tree.modules));
  const [endpointBundle, setEndpointBundle] = useState<PublicShareEndpointBundle | null>(null);
  const [loadingEndpoint, setLoadingEndpoint] = useState(false);
  const [endpointError, setEndpointError] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState(false);

  const filteredModules = useMemo(() => filterModules(share.tree.modules, treeQuery), [share.tree.modules, treeQuery]);

  useEffect(() => {
    const rawEndpointId = searchParams.get("endpointId");
    const parsed = rawEndpointId ? Number(rawEndpointId) : null;

    if (parsed && !Number.isNaN(parsed) && parsed !== selectedEndpointId) {
      setSelectedEndpointId(parsed);
    }
  }, [searchParams, selectedEndpointId]);

  useEffect(() => {
    if (!selectedEndpointId) {
      setEndpointBundle(null);
      return;
    }

    let mounted = true;
    setLoadingEndpoint(true);
    setEndpointError(null);

    void fetchPublicShareEndpoint(shareCode, selectedEndpointId)
      .then((response) => {
        if (mounted) {
          setEndpointBundle(response.data);
        }
      })
      .catch((error) => {
        if (mounted) {
          setEndpointError(resolveFetchError(error));
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingEndpoint(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [selectedEndpointId, shareCode]);

  useEffect(() => {
    if (!selectedEndpointId) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    if (params.get("endpointId") === String(selectedEndpointId)) {
      return;
    }

    params.set("endpointId", String(selectedEndpointId));
    void router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams, selectedEndpointId]);

  useEffect(() => {
    if (!copiedPath) {
      return;
    }

    const timer = window.setTimeout(() => setCopiedPath(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copiedPath]);

  function handleToggle(key: string) {
    setExpandedKeys((current) => ({
      ...current,
      [key]: !current[key]
    }));
  }

  async function handleCopyPath() {
    if (!endpointBundle) {
      return;
    }

    try {
      await navigator.clipboard.writeText(endpointBundle.endpoint.path);
      setCopiedPath(true);
    } catch {
      setCopiedPath(false);
    }
  }

  return (
    <div className="min-h-screen bg-transparent px-4 py-6 lg:px-6">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="glass noise-overlay flex flex-col gap-4 rounded-[2rem] border border-border bg-card/90 p-4 shadow-elevated lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)]">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="gradient-bg flex h-10 w-10 items-center justify-center rounded-2xl shadow-glow">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{share.project.name}</p>
              <p className="truncate text-[11px] tracking-[0.18em] text-muted-foreground">{share.project.projectKey}</p>
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">公开文档</p>
            <h2 className="mt-2 text-lg font-semibold text-foreground">{share.share.name}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{share.share.description ?? share.project.description ?? "当前分享没有额外说明。"}</p>
          </div>

          <div className="rounded-[1.5rem] border border-border bg-surface/65 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">分享状态</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <Badge variant={share.share.enabled ? "success" : "warning"}>{share.share.enabled ? "已启用" : "已停用"}</Badge>
              <span className="font-mono text-xs text-foreground">{share.share.shareCode}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">最后更新：{formatTimestamp(share.share.updatedAt)}</p>
          </div>

          <div className="relative">
            <Input className="h-10 text-sm" onChange={(event) => setTreeQuery(event.target.value)} placeholder="搜索模块、分组或接口" value={treeQuery} />
          </div>

          <div className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto pb-1">
            {filteredModules.length === 0 ? (
              <div className="rounded-[1.4rem] border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">没有匹配的接口。</div>
            ) : (
              filteredModules.map((module) => {
                const moduleKey = `module-${module.id}`;
                const moduleExpanded = expandedKeys[moduleKey] ?? true;

                return (
                  <div className="rounded-[1.5rem] border border-border bg-background/55" key={module.id}>
                    <button className="flex w-full items-center gap-3 px-4 py-3 text-left transition-fast hover:bg-accent/40" onClick={() => handleToggle(moduleKey)} type="button">
                      {moduleExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      <FolderOpen className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">{module.name}</span>
                    </button>

                    {moduleExpanded ? (
                      <div className="space-y-3 border-t border-border px-3 py-3">
                        {module.groups.map((group) => {
                          const groupKey = `group-${group.id}`;
                          const groupExpanded = expandedKeys[groupKey] ?? true;

                          return (
                            <div className="rounded-[1.2rem] bg-card/70" key={group.id}>
                              <button className="flex w-full items-center gap-2 px-3 py-3 text-left transition-fast hover:bg-accent/40" onClick={() => handleToggle(groupKey)} type="button">
                                {groupExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{group.name}</span>
                              </button>

                              {groupExpanded ? (
                                <div className="space-y-2 px-2 pb-2">
                                  {group.endpoints.map((endpoint) => (
                                    <button
                                      className={cn(
                                        "w-full rounded-[1rem] border px-3 py-3 text-left transition-smooth",
                                        selectedEndpointId === endpoint.id ? "border-primary/30 bg-primary/10" : "border-transparent bg-surface/50 hover:border-primary/20"
                                      )}
                                      key={endpoint.id}
                                      onClick={() => setSelectedEndpointId(endpoint.id)}
                                      type="button"
                                    >
                                      <div className="flex items-center gap-2">
                                        <MethodBadge method={endpoint.method} />
                                        <span className="truncate text-sm font-medium text-foreground">{endpoint.name}</span>
                                      </div>
                                      <p className="mt-2 truncate font-mono text-[11px] text-muted-foreground">{endpoint.path}</p>
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        <div className="flex flex-col gap-6">
          <header className="rounded-[2rem] border border-border bg-card/84 p-6 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Public Share</p>
                <h1 className="mt-2 text-3xl font-semibold text-foreground">{share.project.name}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{share.project.description || "当前项目没有公开描述。"}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link href="/login" target="_blank">
                  <Button size="sm" variant="outline">
                    返回登录
                  </Button>
                </Link>
                {endpointBundle ? (
                  <Button onClick={handleCopyPath} size="sm" variant="outline">
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    {copiedPath ? "已复制路径" : "复制路径"}
                  </Button>
                ) : null}
              </div>
            </div>
          </header>

          {endpointError ? <div className="rounded-[1.4rem] border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">{endpointError}</div> : null}

          <section className="rounded-[2rem] border border-border bg-card/84 p-6 shadow-card">
            {loadingEndpoint ? (
              <div className="space-y-4">
                <div className="h-5 w-40 animate-pulse rounded-full bg-border" />
                <div className="h-4 w-80 animate-pulse rounded-full bg-border" />
                <div className="h-40 animate-pulse rounded-[1.6rem] bg-border/70" />
              </div>
            ) : endpointBundle ? (
              <div className="space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <MethodBadge method={endpointBundle.endpoint.method} />
                      <code className="rounded-full bg-surface px-3 py-1 text-xs text-muted-foreground">{endpointBundle.endpoint.path}</code>
                    </div>
                    <h2 className="mt-4 text-3xl font-semibold text-foreground">{endpointBundle.endpoint.name}</h2>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{endpointBundle.endpoint.description || "当前接口还没有补充说明。"}</p>
                  </div>

                  <div className="space-y-2 text-right">
                    {endpointBundle.endpoint.releasedVersionLabel ? <Badge variant="success">{endpointBundle.endpoint.releasedVersionLabel}</Badge> : <Badge variant="outline">未标记发布版本</Badge>}
                    <p className="text-xs text-muted-foreground">最近发布时间：{formatTimestamp(endpointBundle.endpoint.releasedAt)}</p>
                  </div>
                </div>

                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">请求参数</h3>
                  </div>

                  {endpointBundle.parameters.length === 0 ? (
                    <div className="rounded-[1.5rem] border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">当前接口没有声明请求参数。</div>
                  ) : (
                    <div className="overflow-hidden rounded-[1.5rem] border border-border">
                      <table className="w-full text-sm">
                        <thead className="bg-surface">
                          <tr className="border-b border-border">
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">参数</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">类型</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">必填</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">说明</th>
                          </tr>
                        </thead>
                        <tbody>
                          {endpointBundle.parameters.map((parameter) => (
                            <tr className="border-b border-border last:border-b-0" key={parameter.id}>
                              <td className="px-4 py-4 font-mono text-xs text-foreground">{parameter.name}</td>
                              <td className="px-4 py-4 text-xs text-muted-foreground">{parameter.dataType}</td>
                              <td className="px-4 py-4">{parameter.required ? <Badge variant="destructive">必填</Badge> : <Badge variant="outline">可选</Badge>}</td>
                              <td className="px-4 py-4 text-xs text-muted-foreground">{parameter.description || "暂无说明"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <ScrollText className="h-4 w-4 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">响应结构</h3>
                  </div>

                  {endpointBundle.responses.length === 0 ? (
                    <div className="rounded-[1.5rem] border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">当前接口没有配置响应字段。</div>
                  ) : (
                    <div className="overflow-hidden rounded-[1.5rem] border border-border">
                      <table className="w-full text-sm">
                        <thead className="bg-surface">
                          <tr className="border-b border-border">
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">状态码</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">字段</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">类型</th>
                            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">媒体类型</th>
                          </tr>
                        </thead>
                        <tbody>
                          {endpointBundle.responses.map((response) => (
                            <tr className="border-b border-border last:border-b-0" key={response.id}>
                              <td className="px-4 py-4 text-xs text-muted-foreground">{response.httpStatusCode}</td>
                              <td className="px-4 py-4 font-mono text-xs text-foreground">{response.name || "(root)"}</td>
                              <td className="px-4 py-4 text-xs text-muted-foreground">{response.dataType}</td>
                              <td className="px-4 py-4 text-xs text-muted-foreground">{response.mediaType}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <div className="grid gap-6 xl:grid-cols-2">
                  <section className="rounded-[1.6rem] border border-border bg-surface/55 p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">版本记录</h3>
                    </div>

                    {endpointBundle.versions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">当前接口还没有可公开的版本记录。</p>
                    ) : (
                      <div className="space-y-3">
                        {endpointBundle.versions.map((version) => (
                          <div className="rounded-[1.3rem] border border-border bg-background/55 px-4 py-4" key={version.id}>
                            <div className="flex items-center justify-between gap-3">
                              <Badge variant={version.released ? "success" : "outline"}>{version.version}</Badge>
                              <span className="text-[11px] text-muted-foreground">{formatTimestamp(version.releasedAt)}</span>
                            </div>
                            <p className="mt-3 text-sm text-muted-foreground">{version.changeSummary || "暂无变更说明"}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="rounded-[1.6rem] border border-border bg-surface/55 p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">Mock 发布</h3>
                    </div>

                    {endpointBundle.mockReleases.length === 0 ? (
                      <p className="text-sm text-muted-foreground">当前接口没有 Mock 发布记录。</p>
                    ) : (
                      <div className="space-y-3">
                        {endpointBundle.mockReleases.map((release) => (
                          <div className="rounded-[1.3rem] border border-border bg-background/55 px-4 py-4" key={release.id}>
                            <div className="flex items-center justify-between gap-3">
                              <Badge>第 {release.releaseNo} 次</Badge>
                              <span className="text-[11px] text-muted-foreground">{formatTimestamp(release.createdAt)}</span>
                            </div>
                            <p className="mt-3 text-sm text-muted-foreground">包含当时的响应结构和规则快照。</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">请先从左侧目录选择一个接口。</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
