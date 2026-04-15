"use client";

import { useEffect, useMemo, useState } from "react";
import {
  clearEndpointRelease,
  compareEndpointVersions,
  createModuleVersionTag,
  fetchEndpoint,
  fetchEndpointVersions,
  fetchModuleVersionTags,
  fetchProjectDocPushSettings,
  fetchProjectTree,
  regenerateProjectDocPushToken,
  releaseEndpointVersion,
  updateProjectDocPushSettings,
  type EndpointDetail,
  type ModuleVersionTagDetail,
  type ModuleTreeItem,
  type ProjectDocPushSettings,
  type VersionComparisonResult,
  type VersionDetail,
} from "@api-hub/api-sdk";
import { AlertTriangle, ArrowRightLeft, Copy, GitBranch, Search, ShieldAlert, Sparkles, UploadCloud } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Badge, MethodBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";

import { ProjectConsoleLayout } from "./project-console-layout";
import { AiImpactAnalysisCard } from "./ai-impact-analysis-card";
import { findFirstEndpointId, flattenProjectTree } from "./tree-utils";

type VersionsScreenProps = { projectId: number };

const CHANGE_LABELS = { added: "新增", removed: "删除", modified: "修改" } as const;

function formatDateTime(value?: string | null) {
  if (!value) return "未发布";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function copyText(value: string) {
  if (typeof navigator === "undefined") {
    return;
  }
  void navigator.clipboard.writeText(value);
}

export function VersionsScreen({ projectId }: VersionsScreenProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedEndpointId = Number(searchParams.get("endpointId") ?? "") || null;

  const [modules, setModules] = useState<ModuleTreeItem[]>([]);
  const [versions, setVersions] = useState<VersionDetail[]>([]);
  const [endpointDetail, setEndpointDetail] = useState<EndpointDetail | null>(null);
  const [comparison, setComparison] = useState<VersionComparisonResult | null>(null);
  const [pushSettings, setPushSettings] = useState<ProjectDocPushSettings | null>(null);
  const [moduleTags, setModuleTags] = useState<ModuleVersionTagDetail[]>([]);
  const [baseVersionId, setBaseVersionId] = useState<number | null>(null);
  const [targetVersionId, setTargetVersionId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [tagName, setTagName] = useState("");
  const [tagDescription, setTagDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [loadingModuleTags, setLoadingModuleTags] = useState(false);
  const [savingModuleTag, setSavingModuleTag] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const endpointEntries = useMemo(() => flattenProjectTree(modules), [modules]);
  const selectedEndpoint = useMemo(() => endpointEntries.find((item) => item.endpoint.id === selectedEndpointId) ?? null, [endpointEntries, selectedEndpointId]);
  const selectedModuleId = selectedEndpoint?.moduleId ?? null;
  const filteredEndpoints = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return normalized
      ? endpointEntries.filter((item) => `${item.moduleName} ${item.groupName} ${item.endpoint.name} ${item.endpoint.path}`.toLowerCase().includes(normalized))
      : endpointEntries;
  }, [endpointEntries, search]);

  const smartDocPushUrl = useMemo(() => (typeof window === "undefined" || !pushSettings ? "" : `${window.location.origin}/api/v1/doc-push/smartdoc?token=${pushSettings.token}`), [pushSettings]);
  const docForgePushUrl = useMemo(() => (typeof window === "undefined" || !pushSettings ? "" : `${window.location.origin}/api/v1/doc-push/docforge?token=${pushSettings.token}`), [pushSettings]);
  const openApiPushUrl = useMemo(() => (typeof window === "undefined" || !pushSettings ? "" : `${window.location.origin}/api/v1/doc-push/openapi?token=${pushSettings.token}`), [pushSettings]);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchProjectTree(projectId), fetchProjectDocPushSettings(projectId)])
      .then(([treeResponse, pushResponse]) => {
        if (!mounted) return;
        setModules(treeResponse.data.modules);
        setPushSettings(pushResponse.data);
      })
      .catch((loadError) => mounted && setError(loadError instanceof Error ? loadError.message : "版本页加载失败"))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [projectId]);

  useEffect(() => {
    if (loading) return;
    const exists = endpointEntries.some((item) => item.endpoint.id === selectedEndpointId);
    if (!exists) {
      const fallback = findFirstEndpointId(modules);
      if (fallback) {
        router.replace(`${pathname}?endpointId=${fallback}`, { scroll: false });
      }
    }
  }, [endpointEntries, loading, modules, pathname, router, selectedEndpointId]);

  async function loadVersionsAndEndpoint(endpointId: number) {
    setLoadingVersions(true);
    try {
      const [versionsResponse, endpointResponse] = await Promise.all([fetchEndpointVersions(endpointId), fetchEndpoint(endpointId)]);
      setVersions(versionsResponse.data);
      setEndpointDetail(endpointResponse.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "版本详情加载失败");
      setVersions([]);
      setEndpointDetail(null);
      setComparison(null);
    } finally {
      setLoadingVersions(false);
    }
  }

  useEffect(() => {
    if (selectedEndpointId) {
      void loadVersionsAndEndpoint(selectedEndpointId);
    }
  }, [selectedEndpointId]);

  useEffect(() => {
    if (!versions.length) {
      setBaseVersionId(null);
      setTargetVersionId(null);
      setComparison(null);
      return;
    }
    setBaseVersionId((current) => (current && versions.some((item) => item.id === current) ? current : versions.find((item) => item.released)?.id ?? versions[0].id));
    setTargetVersionId((current) => (current && versions.some((item) => item.id === current) ? current : null));
  }, [versions]);

  useEffect(() => {
    if (!selectedEndpointId || !baseVersionId) return;
    let active = true;
    setLoadingComparison(true);
    compareEndpointVersions(selectedEndpointId, baseVersionId, targetVersionId)
      .then((response) =>
        active &&
        setComparison({
          ...response.data,
          breakingChanges: response.data.breakingChanges ?? [],
          changelog: response.data.changelog ?? [],
        }),
      )
      .catch((loadError) => active && setError(loadError instanceof Error ? loadError.message : "版本对比失败"))
      .finally(() => active && setLoadingComparison(false));
    return () => {
      active = false;
    };
  }, [baseVersionId, selectedEndpointId, targetVersionId]);

  async function refreshPushSettings() {
    const response = await fetchProjectDocPushSettings(projectId);
    setPushSettings(response.data);
  }

  async function loadModuleTags(moduleId: number) {
    setLoadingModuleTags(true);
    try {
      const response = await fetchModuleVersionTags(moduleId);
      setModuleTags(response.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "模块版本标签加载失败");
      setModuleTags([]);
    } finally {
      setLoadingModuleTags(false);
    }
  }

  useEffect(() => {
    if (!selectedModuleId) {
      setModuleTags([]);
      return;
    }
    void loadModuleTags(selectedModuleId);
  }, [selectedModuleId]);

  async function handleCreateModuleTag() {
    if (!selectedModuleId || !tagName.trim()) {
      return;
    }
    setSavingModuleTag(true);
    setError(null);
    setMessage(null);
    try {
      await createModuleVersionTag(selectedModuleId, {
        tagName: tagName.trim(),
        description: tagDescription.trim(),
      });
      setTagName("");
      setTagDescription("");
      setMessage("模块版本标签已创建");
      await loadModuleTags(selectedModuleId);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "模块版本标签创建失败");
    } finally {
      setSavingModuleTag(false);
    }
  }

  if (loading) {
    return (
      <ProjectConsoleLayout projectId={projectId} title="版本">
        <div className="rounded-[1.8rem] border border-border bg-card/72 p-8 text-center text-sm text-muted-foreground">正在加载版本工作台...</div>
      </ProjectConsoleLayout>
    );
  }

  return (
    <ProjectConsoleLayout projectId={projectId} title="版本">
      <div className="space-y-6">
        {error ? <div className="rounded-[1.4rem] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
        {message ? <div className="rounded-[1.4rem] border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">{message}</div> : null}

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside>
            <Card className="rounded-[1.8rem] border-border/80 bg-card/84">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">接口列表</p>
                    <h2 className="mt-2 text-xl font-semibold text-foreground">选择接口</h2>
                  </div>
                  <Sparkles className="mt-1 h-4 w-4 text-primary" />
                </div>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-10" onChange={(event) => setSearch(event.target.value)} placeholder="搜索接口" value={search} />
                </div>
                <div className="scrollbar-thin mt-5 max-h-[520px] space-y-3 overflow-y-auto">
                  {filteredEndpoints.map((item) => (
                    <button
                      className={`w-full rounded-[1.4rem] border px-4 py-4 text-left transition-smooth ${selectedEndpointId === item.endpoint.id ? "border-primary/30 bg-primary/10" : "border-border bg-surface/60 hover:border-primary/20 hover:bg-primary/5"}`}
                      key={item.endpoint.id}
                      onClick={() => router.replace(`${pathname}?endpointId=${item.endpoint.id}`, { scroll: false })}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">{item.endpoint.name}</p>
                        <MethodBadge method={item.endpoint.method} />
                      </div>
                      <p className="mt-2 truncate font-mono text-[11px] text-muted-foreground">{item.endpoint.path}</p>
                      <p className="mt-2 text-[11px] text-muted-foreground">{item.moduleName} / {item.groupName}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>

          <section className="space-y-6">
            {selectedEndpoint ? (
              <>
                <Card className="rounded-[1.8rem] border-border/80 bg-card/84">
                  <CardContent className="p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <MethodBadge method={selectedEndpoint.endpoint.method} />
                          <code className="rounded-full bg-surface px-3 py-1 text-xs text-muted-foreground">{selectedEndpoint.endpoint.path}</code>
                          {endpointDetail?.releasedVersionLabel ? <Badge variant="success">{endpointDetail.releasedVersionLabel}</Badge> : <Badge variant="outline">草稿</Badge>}
                        </div>
                        <h2 className="mt-4 text-3xl font-semibold text-foreground">{selectedEndpoint.endpoint.name}</h2>
                        <p className="mt-2 text-sm text-muted-foreground">当前运行版本：{endpointDetail?.releasedVersionLabel ?? "未发布"} | 发布时间：{formatDateTime(endpointDetail?.releasedAt)}</p>
                      </div>
                      <Button
                        disabled={busyKey === "clear"}
                        onClick={() => {
                          setBusyKey("clear");
                          void clearEndpointRelease(selectedEndpointId!).then(() => loadVersionsAndEndpoint(selectedEndpointId!)).finally(() => setBusyKey(null));
                        }}
                        variant="outline"
                      >
                        {busyKey === "clear" ? "处理中..." : "切回草稿"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="space-y-6">
                    <Card className="overflow-hidden rounded-[1.8rem] border-border/80 bg-card/84">
                      <CardContent className="p-0">
                        <div className="border-b border-border/80 bg-gradient-to-r from-primary/10 via-transparent to-warning/10 px-6 py-5">
                          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <ArrowRightLeft className="h-4 w-4 text-primary" />
                            版本对比引擎
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">选择基线与目标，查看差异、破坏性变更和变更时间线。</p>
                        </div>

                        <div className="space-y-6 p-6">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">基线版本</p>
                              <Select onChange={(event) => setBaseVersionId(Number(event.target.value) || null)} value={baseVersionId ? String(baseVersionId) : ""}>
                                {versions.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.version}
                                    {item.released ? " · 运行中" : ""}
                                  </option>
                                ))}
                              </Select>
                            </div>
                            <div>
                              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">对比目标</p>
                              <Select onChange={(event) => setTargetVersionId(event.target.value ? Number(event.target.value) : null)} value={targetVersionId ? String(targetVersionId) : ""}>
                                <option value="">当前草稿</option>
                                {versions.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.version}
                                    {item.released ? " · 运行中" : ""}
                                  </option>
                                ))}
                              </Select>
                            </div>
                          </div>

                          {loadingComparison ? (
                            <div className="rounded-[1.5rem] border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">正在生成差异视图...</div>
                          ) : comparison ? (
                            <div className="space-y-5">
                              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                                <Metric label="接口字段" value={comparison.summary.endpointFieldsChanged} />
                                <Metric label="参数变更" value={`+${comparison.summary.addedParameters} / -${comparison.summary.removedParameters}`} note={`修改 ${comparison.summary.modifiedParameters}`} />
                                <Metric label="响应变更" value={`+${comparison.summary.addedResponses} / -${comparison.summary.removedResponses}`} note={`修改 ${comparison.summary.modifiedResponses}`} />
                                <Metric label="破坏性变更" tone={comparison.summary.breakingChanges ? "danger" : "default"} value={comparison.summary.breakingChanges} />
                                <Metric label="总差异项" value={comparison.changelog?.length ?? 0} />
                              </div>

                              <WarningPanel comparison={comparison} />

                              <DiffGroup
                                emptyText="接口字段没有变化。"
                                items={comparison.endpointChanges.map((change) => ({
                                  key: change.field,
                                  label: change.field,
                                  detail: `${change.beforeValue ?? "空"} -> ${change.afterValue ?? "空"}`,
                                }))}
                                title="接口字段变更"
                              />

                              <DiffGroup
                                emptyText="请求参数没有变化。"
                                items={comparison.parameterChanges.map((change) => ({
                                  key: change.key,
                                  label: `${CHANGE_LABELS[change.changeType]} · ${change.name}`,
                                  detail: `${change.sectionType} · ${change.beforeDataType ?? "-"} -> ${change.afterDataType ?? "-"}`,
                                }))}
                                title="请求参数变更"
                              />

                              <DiffGroup
                                emptyText="响应结构没有变化。"
                                items={comparison.responseChanges.map((change) => ({
                                  key: change.key,
                                  label: `${CHANGE_LABELS[change.changeType]} · ${change.name || "body"}`,
                                  detail: `${change.httpStatusCode} ${change.mediaType} · ${change.beforeDataType ?? "-"} -> ${change.afterDataType ?? "-"}`,
                                }))}
                                title="响应字段变更"
                              />

                              <ChangelogPanel comparison={comparison} />
                            </div>
                          ) : (
                            <div className="rounded-[1.5rem] border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">请先创建版本快照，再开始对比。</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-[1.8rem] border-border/80 bg-card/84">
                      <CardContent className="p-6">
                        <div className="mb-4 flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-primary" />
                          <p className="text-sm font-semibold text-foreground">版本快照</p>
                        </div>
                        {loadingVersions ? (
                          <div className="rounded-[1.5rem] border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">正在加载版本快照...</div>
                        ) : versions.length === 0 ? (
                          <div className="rounded-[1.5rem] border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">还没有版本快照。</div>
                        ) : (
                          <div className="space-y-4">
                            {versions.map((version) => (
                              <div className="rounded-[1.5rem] border border-border bg-surface/60 px-5 py-5" key={version.id}>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <Badge variant={version.released ? "success" : "outline"}>{version.version}</Badge>
                                    <span className="text-xs text-muted-foreground">{version.released ? "运行中版本" : "草稿快照"}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <Button onClick={() => setBaseVersionId(version.id)} size="sm" variant="outline">设为基线</Button>
                                    <Button onClick={() => setTargetVersionId(version.id)} size="sm" variant="outline">设为目标</Button>
                                    <Button
                                      disabled={Boolean(version.released)}
                                      onClick={() => void releaseEndpointVersion(selectedEndpointId!, version.id).then(() => loadVersionsAndEndpoint(selectedEndpointId!))}
                                      size="sm"
                                      variant="outline"
                                    >
                                      {version.released ? "已发布" : "发布"}
                                    </Button>
                                  </div>
                                </div>
                                <p className="mt-3 text-sm text-muted-foreground">{version.changeSummary || "暂无变更摘要。"}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-6">
                    {selectedEndpointId ? (
                      <AiImpactAnalysisCard
                        endpointId={selectedEndpointId}
                        baseVersionId={baseVersionId}
                        targetVersionId={targetVersionId}
                      />
                    ) : null}

                    <Card className="rounded-[1.8rem] border-border/80 bg-card/84">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-primary" />
                          <p className="text-sm font-semibold text-foreground">模块版本 Tag</p>
                        </div>
                        <p className="mt-2 text-sm leading-7 text-muted-foreground">
                          基于当前接口所属模块冻结一份发布快照，记录模块内每个接口当时的发布版本。
                        </p>
                        <div className="mt-4 space-y-3">
                          <Input onChange={(event) => setTagName(event.target.value)} placeholder="例如 v2.0.0-release" value={tagName} />
                          <Input onChange={(event) => setTagDescription(event.target.value)} placeholder="补充这次模块冻结的说明" value={tagDescription} />
                          <Button disabled={!selectedModuleId || !tagName.trim() || savingModuleTag} onClick={() => void handleCreateModuleTag()} size="sm">
                            {savingModuleTag ? "创建中..." : "创建模块 Tag"}
                          </Button>
                        </div>
                        <div className="mt-5 space-y-3">
                          {loadingModuleTags ? (
                            <div className="rounded-[1rem] border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">正在加载模块 Tag...</div>
                          ) : moduleTags.length ? (
                            moduleTags.map((tag) => (
                              <div className="rounded-[1rem] border border-border bg-surface/60 px-4 py-4" key={tag.id}>
                                <div className="flex items-center justify-between gap-3">
                                  <Badge variant="outline">{tag.tagName}</Badge>
                                  <span className="text-[11px] text-muted-foreground">{formatDateTime(tag.createdAt)}</span>
                                </div>
                                <p className="mt-3 text-sm text-muted-foreground">{tag.description || "暂无标签说明。"}</p>
                                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                  <span>接口 {tag.endpointCount}</span>
                                  <span>已发布 {tag.releasedEndpointCount}</span>
                                </div>
                                <div className="mt-3 space-y-2">
                                  {tag.endpoints.slice(0, 4).map((item) => (
                                    <div className="rounded-[0.9rem] border border-border/70 bg-background/40 px-3 py-2" key={`${tag.id}-${item.endpointId}`}>
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="truncate text-xs font-medium text-foreground">{item.endpointName}</span>
                                        <Badge variant={item.releasedVersionId ? "success" : "outline"}>{item.releasedVersionLabel ?? "未发布"}</Badge>
                                      </div>
                                      <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{item.method} {item.path}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-[1rem] border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">当前模块还没有版本 Tag。</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-[1.8rem] border-border/80 bg-card/84">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2">
                          <UploadCloud className="h-4 w-4 text-primary" />
                          <p className="text-sm font-semibold text-foreground">DocForge / SmartDoc 直推</p>
                        </div>
                        <p className="mt-2 text-sm leading-7 text-muted-foreground">本地文档系统可直接将导出的规范推送到当前项目，无需手动上传。</p>
                        <div className="mt-4 space-y-3">
                          <div className="rounded-[1rem] border border-border bg-surface/60 px-4 py-3">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">推送状态</p>
                            <div className="mt-3 flex gap-2">
                              <Button onClick={() => void updateProjectDocPushSettings(projectId, { enabled: true }).then(refreshPushSettings)} size="sm" variant={pushSettings?.enabled ? "default" : "outline"}>启用</Button>
                              <Button onClick={() => void updateProjectDocPushSettings(projectId, { enabled: false }).then(refreshPushSettings)} size="sm" variant={!pushSettings?.enabled ? "default" : "outline"}>停用</Button>
                            </div>
                          </div>
                          <PushField label="SmartDoc 推送地址" value={smartDocPushUrl} />
                          <PushField label="DocForge 推送地址" value={docForgePushUrl} />
                          <PushField label="OpenAPI 推送地址" value={openApiPushUrl} />
                          <PushField label="推送 Token" value={pushSettings?.token ?? ""} />
                          <div className="flex flex-wrap gap-2">
                            <Button onClick={() => copyText(docForgePushUrl)} size="sm" variant="outline"><Copy className="mr-1.5 h-3.5 w-3.5" />复制 DocForge 地址</Button>
                            <Button onClick={() => copyText(pushSettings?.token ?? "")} size="sm" variant="outline"><Copy className="mr-1.5 h-3.5 w-3.5" />复制 Token</Button>
                            <Button onClick={() => void regenerateProjectDocPushToken(projectId).then((response) => { setPushSettings(response.data); setMessage("已重置推送 Token"); })} size="sm" variant="outline">重置 Token</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-[1.8rem] border border-dashed border-border bg-card/72 p-8 text-center text-sm text-muted-foreground">请先从左侧选择一个接口。</div>
            )}
          </section>
        </div>
      </div>
    </ProjectConsoleLayout>
  );
}

function Metric({ label, value, note, tone = "default" }: { label: string; value: string | number; note?: string; tone?: "default" | "danger" }) {
  return (
    <div className={tone === "danger" ? "rounded-[1.4rem] border border-destructive/20 bg-destructive/10 p-4" : "rounded-[1.4rem] border border-border bg-surface/60 p-4"}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={tone === "danger" ? "mt-2 text-2xl font-semibold text-destructive" : "mt-2 text-2xl font-semibold text-foreground"}>{value}</p>
      {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function DiffGroup({ title, emptyText, items }: { title: string; emptyText: string; items: Array<{ key: string; label: string; detail: string }> }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div className="rounded-[1.2rem] border border-border bg-surface/60 p-4" key={item.key}>
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="mt-2 text-xs text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[1.2rem] border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">{emptyText}</div>
      )}
    </div>
  );
}

function WarningPanel({ comparison }: { comparison: VersionComparisonResult }) {
  const breakingChanges = comparison.breakingChanges ?? [];

  return (
    <div className="rounded-[1.5rem] border border-border bg-surface/60 p-5">
      <div className="flex items-center gap-2">
        <ShieldAlert className={breakingChanges.length ? "h-4 w-4 text-destructive" : "h-4 w-4 text-success"} />
        <p className="text-sm font-semibold text-foreground">破坏性变更预警</p>
      </div>
      {breakingChanges.length ? (
        <div className="mt-4 space-y-3">
          {breakingChanges.map((item, index) => (
            <div className="rounded-[1.1rem] border border-destructive/20 bg-destructive/10 p-4" key={`${item.title}-${index}`}>
              <p className="text-sm font-semibold text-destructive">{item.title}</p>
              <p className="mt-2 text-xs text-destructive/90">{item.detail}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-[1.1rem] border border-success/20 bg-success/10 p-4 text-sm text-success">当前对比未检测到破坏性变更。</div>
      )}
    </div>
  );
}

function ChangelogPanel({ comparison }: { comparison: VersionComparisonResult }) {
  const changelog = comparison.changelog ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">变更时间线 / Changelog</p>
      </div>
      {changelog.length ? (
        <div className="space-y-3">
          {changelog.map((entry, index) => (
            <div className="rounded-[1.2rem] border border-border bg-surface/60 p-4" key={`${entry.category}-${index}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">{entry.title}</p>
                <Badge variant="outline">{entry.category}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{entry.detail}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[1.2rem] border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">当前没有可记录的变更时间线。</div>
      )}
    </div>
  );
}

function PushField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-border bg-surface/60 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 break-all font-mono text-xs text-foreground">{value || "-"}</p>
    </div>
  );
}
