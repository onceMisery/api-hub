"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createVersion,
  fetchEndpoint,
  fetchEndpointParameters,
  fetchEndpointResponses,
  fetchEndpointVersions,
  fetchProjectTree,
  replaceEndpointParameters,
  replaceEndpointResponses,
  updateEndpoint,
  type EndpointDetail,
  type ModuleTreeItem,
  type ParameterUpsertItem,
  type ResponseUpsertItem,
  type VersionDetail,
} from "@api-hub/api-sdk";
import {
  Copy,
  Eye,
  GitBranch,
  PencilLine,
  Play,
  Plus,
  Save,
  Search,
  Share2,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Badge, MethodBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { ProjectConsoleLayout } from "./project-console-layout";
import { filterModules, findFirstEndpointId, flattenProjectTree } from "./tree-utils";

type Props = { projectId: number };
type ViewMode = "browse" | "edit";
type EditTab = "basics" | "parameters" | "responses" | "versions";
type EditableParameter = ParameterUpsertItem & { rowId: string };
type EditableResponse = ResponseUpsertItem & { rowId: string };
type Bundle = {
  endpoint: EndpointDetail;
  parameters: ParameterUpsertItem[];
  responses: ResponseUpsertItem[];
  versions: VersionDetail[];
};

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
const SECTIONS = ["path", "query", "header", "body"] as const;
const TYPES = ["string", "integer", "number", "boolean", "object", "array"] as const;

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeParameter(partial?: Partial<EditableParameter>): EditableParameter {
  return {
    rowId: makeId("parameter"),
    sectionType: "query",
    name: "",
    dataType: "string",
    required: false,
    description: "",
    exampleValue: "",
    ...partial,
  };
}

function makeResponse(partial?: Partial<EditableResponse>): EditableResponse {
  return {
    rowId: makeId("response"),
    httpStatusCode: 200,
    mediaType: "application/json",
    name: "",
    dataType: "string",
    required: false,
    description: "",
    exampleValue: "",
    ...partial,
  };
}

function sectionLabel(value: string) {
  return (
    {
      path: "Path 参数",
      query: "Query 参数",
      header: "Header 参数",
      body: "Body 参数",
    }[value] ?? value
  );
}

function copyText(value: string) {
  if (typeof navigator === "undefined") {
    return;
  }
  void navigator.clipboard.writeText(value);
}

export function ApiBrowserScreen({ projectId }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const endpointId = Number(searchParams.get("endpointId") ?? "") || null;

  const [modules, setModules] = useState<ModuleTreeItem[]>([]);
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("browse");
  const [editTab, setEditTab] = useState<EditTab>("basics");
  const [loadingTree, setLoadingTree] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState<string | null>(null);
  const [basics, setBasics] = useState({
    name: "",
    method: "GET",
    path: "",
    description: "",
    mockEnabled: false,
  });
  const [parameters, setParameters] = useState<EditableParameter[]>([]);
  const [responses, setResponses] = useState<EditableResponse[]>([]);
  const [version, setVersion] = useState("v1.0.0");
  const [summary, setSummary] = useState("");

  useEffect(() => {
    let active = true;
    setLoadingTree(true);
    setError(null);

    fetchProjectTree(projectId)
      .then((response) => {
        if (active) {
          setModules(response.data.modules);
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "接口树加载失败");
        }
      })
      .finally(() => {
        if (active) {
          setLoadingTree(false);
        }
      });

    return () => {
      active = false;
    };
  }, [projectId, refreshKey]);

  useEffect(() => {
    if (loadingTree) {
      return;
    }
    const exists = flattenProjectTree(modules).some((item) => item.endpoint.id === endpointId);
    if (!exists) {
      const firstId = findFirstEndpointId(modules);
      if (firstId) {
        router.replace(`${pathname}?endpointId=${firstId}`, { scroll: false });
      }
    }
  }, [endpointId, loadingTree, modules, pathname, router]);

  useEffect(() => {
    if (!endpointId) {
      return;
    }

    let active = true;
    setLoadingDetail(true);
    setError(null);

    Promise.all([
      fetchEndpoint(endpointId),
      fetchEndpointParameters(endpointId),
      fetchEndpointResponses(endpointId),
      fetchEndpointVersions(endpointId),
    ])
      .then(([endpointResponse, parameterResponse, responseResponse, versionResponse]) => {
        if (!active) {
          return;
        }

        const nextBundle: Bundle = {
          endpoint: endpointResponse.data,
          parameters: parameterResponse.data.map((item) => ({
            sectionType: item.sectionType,
            name: item.name,
            dataType: item.dataType,
            required: item.required,
            description: item.description || "",
            exampleValue: item.exampleValue || "",
          })),
          responses: responseResponse.data.map((item) => ({
            httpStatusCode: item.httpStatusCode,
            mediaType: item.mediaType,
            name: item.name || "",
            dataType: item.dataType,
            required: item.required,
            description: item.description || "",
            exampleValue: item.exampleValue || "",
          })),
          versions: versionResponse.data,
        };

        setBundle(nextBundle);
        setBasics({
          name: nextBundle.endpoint.name,
          method: nextBundle.endpoint.method,
          path: nextBundle.endpoint.path,
          description: nextBundle.endpoint.description || "",
          mockEnabled: nextBundle.endpoint.mockEnabled,
        });
        setParameters(nextBundle.parameters.map((item) => makeParameter(item)));
        setResponses(nextBundle.responses.map((item) => makeResponse(item)));
        setVersion(nextBundle.versions[0]?.version ? `${nextBundle.versions[0].version}-next` : "v1.0.0");
        setSummary("");
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "接口详情加载失败");
        }
      })
      .finally(() => {
        if (active) {
          setLoadingDetail(false);
        }
      });

    return () => {
      active = false;
    };
  }, [endpointId, refreshKey]);

  const filteredModules = useMemo(() => filterModules(modules, query), [modules, query]);
  const selectedEntry = useMemo(
    () => flattenProjectTree(modules).find((item) => item.endpoint.id === endpointId) ?? null,
    [modules, endpointId],
  );
  const responsePreview = useMemo(() => {
    const source = bundle?.responses ?? [];
    return JSON.stringify(
      Object.fromEntries(
        source.map((item, index) => [item.name || `field_${index + 1}`, item.exampleValue || item.dataType || "string"]),
      ),
      null,
      2,
    );
  }, [bundle]);

  async function saveBasics() {
    if (!endpointId) {
      return;
    }
    setSaving("basics");
    setError(null);
    setMessage(null);
    try {
      await updateEndpoint(endpointId, {
        ...basics,
        name: basics.name.trim(),
        path: basics.path.trim(),
        description: basics.description.trim(),
      });
      setMessage("基础信息已保存");
      setRefreshKey((value) => value + 1);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存接口失败");
    } finally {
      setSaving(null);
    }
  }

  async function saveParameters() {
    if (!endpointId) {
      return;
    }
    setSaving("parameters");
    setError(null);
    setMessage(null);
    try {
      await replaceEndpointParameters(
        endpointId,
        parameters
          .map(({ rowId: _rowId, ...row }) => row)
          .filter((row) => row.name.trim())
          .map((row) => ({
            ...row,
            name: row.name.trim(),
            description: row.description.trim(),
            exampleValue: row.exampleValue.trim(),
          })),
      );
      setMessage("请求参数已保存");
      setRefreshKey((value) => value + 1);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存请求参数失败");
    } finally {
      setSaving(null);
    }
  }

  async function saveResponses() {
    if (!endpointId) {
      return;
    }
    setSaving("responses");
    setError(null);
    setMessage(null);
    try {
      await replaceEndpointResponses(
        endpointId,
        responses
          .map(({ rowId: _rowId, ...row }) => row)
          .filter((row) => row.name.trim())
          .map((row) => ({
            ...row,
            name: row.name.trim(),
            mediaType: row.mediaType.trim(),
            description: row.description.trim(),
            exampleValue: row.exampleValue.trim(),
          })),
      );
      setMessage("响应结构已保存");
      setRefreshKey((value) => value + 1);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存响应结构失败");
    } finally {
      setSaving(null);
    }
  }

  async function saveVersion() {
    if (!endpointId) {
      return;
    }
    setSaving("version");
    setError(null);
    setMessage(null);
    try {
      await createVersion(endpointId, {
        version: version.trim(),
        changeSummary: summary.trim(),
        snapshotJson: JSON.stringify(
          {
            endpoint: basics,
            parameters: parameters.map(({ rowId: _rowId, ...row }) => row),
            responses: responses.map(({ rowId: _rowId, ...row }) => row),
          },
          null,
          2,
        ),
      });
      setMessage("版本快照已创建");
      setRefreshKey((value) => value + 1);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "创建版本快照失败");
    } finally {
      setSaving(null);
    }
  }

  return (
    <ProjectConsoleLayout projectId={projectId} title="接口工作台">
      <div className="space-y-5">
        {error ? <AlertBox tone="error" text={error} /> : null}
        {message ? <AlertBox tone="success" text={message} /> : null}

        <div className="grid gap-5 xl:grid-cols-[336px_minmax(0,1fr)]">
          <Card className="rounded-[1.8rem] border-border/80 bg-card/88">
            <CardContent className="p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">接口列表</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {loadingTree ? "同步中..." : `${flattenProjectTree(filteredModules).length} 个接口`}
                  </p>
                </div>
                <Badge variant="outline">组内视图</Badge>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-11 pl-10"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索接口、路径、分组"
                  value={query}
                />
              </div>

              <div className="scrollbar-thin max-h-[calc(100vh-14rem)] space-y-3 overflow-y-auto pr-1">
                {filteredModules.map((module) => (
                  <div className="rounded-[1.4rem] border border-border bg-surface/55 p-3" key={module.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{module.name}</p>
                      <Badge variant="outline">{module.groups.length} 个分组</Badge>
                    </div>

                    <div className="mt-3 space-y-3">
                      {module.groups.map((group) => (
                        <div key={group.id}>
                          <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{group.name}</p>
                          <div className="space-y-2">
                            {group.endpoints.map((endpoint) => {
                              const active = endpoint.id === endpointId;
                              return (
                                <button
                                  className={cn(
                                    "w-full rounded-[1.1rem] border px-3 py-3 text-left transition-smooth",
                                    active
                                      ? "border-primary/35 bg-primary/12 shadow-[0_12px_30px_hsl(var(--primary)/0.14)]"
                                      : "border-border bg-card/80 hover:border-primary/20 hover:bg-primary/5",
                                  )}
                                  key={endpoint.id}
                                  onClick={() => router.replace(`${pathname}?endpointId=${endpoint.id}`, { scroll: false })}
                                  type="button"
                                >
                                  <div className="flex items-center gap-2">
                                    <MethodBadge method={endpoint.method} />
                                    <span className="truncate text-sm font-medium text-foreground">{endpoint.name}</span>
                                  </div>
                                  <p className="mt-2 truncate font-mono text-[11px] text-muted-foreground">{endpoint.path}</p>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {!loadingTree && filteredModules.length === 0 ? <EmptyBox text="没有匹配的接口" /> : null}
              </div>
            </CardContent>
          </Card>

          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.8rem] border border-border/80 bg-card/88 px-5 py-4 shadow-card">
              <div className="flex flex-wrap items-center gap-2">
                <ToolbarToggle active={viewMode === "browse"} icon={<Eye className="mr-1.5 inline h-3.5 w-3.5" />} label="预览模式" onClick={() => setViewMode("browse")} />
                <ToolbarToggle active={viewMode === "edit"} icon={<PencilLine className="mr-1.5 inline h-3.5 w-3.5" />} label="编辑模式" onClick={() => setViewMode("edit")} />
              </div>
              {bundle ? (
                <div className="flex flex-wrap gap-2">
                  <Link href={`/console/projects/${projectId}/debug?endpointId=${bundle.endpoint.id}`}>
                    <Button size="sm" variant="outline">
                      <Play className="mr-1.5 h-3.5 w-3.5" />
                      调试
                    </Button>
                  </Link>
                  <Link href={`/console/projects/${projectId}/versions?endpointId=${bundle.endpoint.id}`}>
                    <Button size="sm" variant="outline">
                      <GitBranch className="mr-1.5 h-3.5 w-3.5" />
                      版本对比
                    </Button>
                  </Link>
                  <Link href={`/console/projects/${projectId}/share`}>
                    <Button size="sm" variant="outline">
                      <Share2 className="mr-1.5 h-3.5 w-3.5" />
                      分享
                    </Button>
                  </Link>
                </div>
              ) : null}
            </div>

            {loadingDetail ? <EmptyBox text="正在加载接口详情..." /> : null}
            {!loadingDetail && !bundle ? <EmptyBox text="请先从左侧选择一个接口" /> : null}

            {bundle ? (
              <>
                <Card className="rounded-[1.9rem] border-border/80 bg-card/88">
                  <CardContent className="p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <MethodBadge method={bundle.endpoint.method} />
                          <code className="rounded-full bg-surface px-3 py-1 font-mono text-[11px] text-muted-foreground">
                            {bundle.endpoint.path}
                          </code>
                          {selectedEntry ? (
                            <Badge variant="outline">
                              {selectedEntry.moduleName} / {selectedEntry.groupName}
                            </Badge>
                          ) : null}
                          <Badge variant={bundle.endpoint.mockEnabled ? "info" : "outline"}>
                            {bundle.endpoint.mockEnabled ? "Mock 已启用" : "Mock 未启用"}
                          </Badge>
                        </div>

                        <h2 className="mt-4 text-3xl font-semibold text-foreground">{bundle.endpoint.name}</h2>
                        <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
                          {bundle.endpoint.description || "当前接口还没有补充说明。"}
                        </p>
                      </div>

                      <div className="grid min-w-[260px] gap-3 sm:grid-cols-2">
                        <Metric icon={<UserRound className="h-4 w-4 text-primary" />} label="创建人" value={bundle.endpoint.createdByDisplayName || "未记录"} />
                        <Metric icon={<UserRound className="h-4 w-4 text-primary" />} label="更新人" value={bundle.endpoint.updatedByDisplayName || "未记录"} />
                        <Metric label="请求参数" value={`${bundle.parameters.length} 项`} />
                        <Metric label="响应字段" value={`${bundle.responses.length} 项`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {viewMode === "browse" ? (
                  <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-5">
                      <PreviewCard count={`${bundle.parameters.length} 项`} title="接口输入预览">
                        {bundle.parameters.length ? (
                          bundle.parameters.map((item, index) => (
                            <PreviewRow
                              key={`${item.name}-${index}`}
                              label={item.name}
                              meta={`${sectionLabel(item.sectionType)} · ${item.dataType}`}
                              text={item.description || "暂无说明"}
                            />
                          ))
                        ) : (
                          <EmptyText text="当前接口没有配置请求参数。" />
                        )}
                      </PreviewCard>

                      <PreviewCard count={`${bundle.responses.length} 项`} title="接口输出预览">
                        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                          <div className="space-y-2">
                            {bundle.responses.length ? (
                              bundle.responses.map((item, index) => (
                                <PreviewRow
                                  key={`${item.name}-${index}`}
                                  label={item.name || `field_${index + 1}`}
                                  meta={`${item.httpStatusCode} · ${item.dataType}`}
                                  text={item.description || "暂无说明"}
                                />
                              ))
                            ) : (
                              <EmptyText text="当前接口还没有配置响应字段。" />
                            )}
                          </div>

                          <div className="rounded-[1.2rem] border border-border bg-surface/55">
                            <div className="flex items-center justify-between border-b border-border px-4 py-3">
                              <p className="text-sm font-semibold text-foreground">响应示例</p>
                              <Button onClick={() => copyText(responsePreview)} size="icon-sm" variant="ghost">
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                            <pre className="overflow-x-auto px-4 py-4 text-xs text-muted-foreground">{responsePreview}</pre>
                          </div>
                        </div>
                      </PreviewCard>
                    </div>

                    <div className="space-y-5">
                      <PreviewCard title="接口摘要">
                        <Summary label="接口名称" value={bundle.endpoint.name} />
                        <Summary label="请求方法" value={bundle.endpoint.method} />
                        <Summary label="接口路径" mono value={bundle.endpoint.path} />
                      </PreviewCard>

                      <PreviewCard count={`${bundle.versions.length} 条`} title="快照与发布记录">
                        {bundle.versions.length ? (
                          bundle.versions.map((item) => (
                            <div className="rounded-[1rem] border border-border bg-surface/60 p-4" key={item.id}>
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-foreground">{item.version}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">{item.changeSummary || "暂无变更摘要"}</p>
                                </div>
                                {item.released ? <Badge variant="success">已发布</Badge> : <Badge variant="outline">草稿</Badge>}
                              </div>
                            </div>
                          ))
                        ) : (
                          <EmptyText text="还没有版本快照。" />
                        )}
                      </PreviewCard>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_320px]">
                    <PreviewCard title="编辑工作区">
                      <div className="mb-5 flex flex-wrap gap-2">
                        {[
                          ["basics", "基础信息"],
                          ["parameters", "请求参数"],
                          ["responses", "响应结构"],
                          ["versions", "版本快照"],
                        ].map(([id, label]) => (
                          <ToolbarToggle active={editTab === id} key={id} label={label} onClick={() => setEditTab(id as EditTab)} />
                        ))}
                      </div>

                      {editTab === "basics" ? (
                        <div className="space-y-4">
                          <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)]">
                            <Select onChange={(event) => setBasics((current) => ({ ...current, method: event.target.value }))} value={basics.method}>
                              {METHODS.map((method) => (
                                <option key={method} value={method}>
                                  {method}
                                </option>
                              ))}
                            </Select>
                            <Input onChange={(event) => setBasics((current) => ({ ...current, path: event.target.value }))} placeholder="/users/{id}" value={basics.path} />
                          </div>
                          <Input onChange={(event) => setBasics((current) => ({ ...current, name: event.target.value }))} placeholder="接口名称" value={basics.name} />
                          <Textarea className="min-h-[140px]" onChange={(event) => setBasics((current) => ({ ...current, description: event.target.value }))} placeholder="接口说明" value={basics.description} />
                          <div className="flex flex-wrap items-center gap-2">
                            <ToolbarToggle active={basics.mockEnabled} label={basics.mockEnabled ? "Mock 已启用" : "启用 Mock"} onClick={() => setBasics((current) => ({ ...current, mockEnabled: !current.mockEnabled }))} />
                          </div>
                          <Button disabled={saving === "basics"} onClick={() => void saveBasics()}>
                            <Save className="mr-1.5 h-3.5 w-3.5" />
                            {saving === "basics" ? "保存中..." : "保存基础信息"}
                          </Button>
                        </div>
                      ) : null}

                      {editTab === "parameters" ? (
                        <div className="space-y-3">
                          {parameters.map((row) => (
                            <EditableRow key={row.rowId}>
                              <div className="space-y-3">
                                <div className="grid gap-3 lg:grid-cols-[140px_140px_minmax(0,1fr)_56px]">
                                  <Select onChange={(event) => setParameters((current) => current.map((item) => (item.rowId === row.rowId ? { ...item, sectionType: event.target.value } : item)))} value={row.sectionType}>
                                    {SECTIONS.map((section) => (
                                      <option key={section} value={section}>
                                        {sectionLabel(section)}
                                      </option>
                                    ))}
                                  </Select>
                                  <Select onChange={(event) => setParameters((current) => current.map((item) => (item.rowId === row.rowId ? { ...item, dataType: event.target.value } : item)))} value={row.dataType}>
                                    {TYPES.map((type) => (
                                      <option key={type} value={type}>
                                        {type}
                                      </option>
                                    ))}
                                  </Select>
                                  <Input onChange={(event) => setParameters((current) => current.map((item) => (item.rowId === row.rowId ? { ...item, name: event.target.value } : item)))} placeholder="参数名称" value={row.name} />
                                  <Button onClick={() => setParameters((current) => current.filter((item) => item.rowId !== row.rowId))} size="icon" type="button" variant="ghost">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="grid gap-3 lg:grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)]">
                                  <label className="flex items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-2 text-sm text-foreground">
                                    <input checked={row.required} className="h-4 w-4 accent-[hsl(var(--primary))]" onChange={(event) => setParameters((current) => current.map((item) => (item.rowId === row.rowId ? { ...item, required: event.target.checked } : item)))} type="checkbox" />
                                    必填
                                  </label>
                                  <Input onChange={(event) => setParameters((current) => current.map((item) => (item.rowId === row.rowId ? { ...item, description: event.target.value } : item)))} placeholder="参数说明" value={row.description} />
                                  <Input onChange={(event) => setParameters((current) => current.map((item) => (item.rowId === row.rowId ? { ...item, exampleValue: event.target.value } : item)))} placeholder="示例值" value={row.exampleValue} />
                                </div>
                              </div>
                            </EditableRow>
                          ))}

                          <div className="flex flex-wrap gap-2">
                            <Button onClick={() => setParameters((current) => [...current, makeParameter()])} size="sm" type="button" variant="outline">
                              <Plus className="mr-1.5 h-3.5 w-3.5" />
                              新增参数
                            </Button>
                            <Button disabled={saving === "parameters"} onClick={() => void saveParameters()}>
                              <Save className="mr-1.5 h-3.5 w-3.5" />
                              {saving === "parameters" ? "保存中..." : "保存请求参数"}
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      {editTab === "responses" ? (
                        <div className="space-y-3">
                          {responses.map((row) => (
                            <EditableRow key={row.rowId}>
                              <div className="space-y-3">
                                <div className="grid gap-3 lg:grid-cols-[120px_150px_minmax(0,1fr)_56px]">
                                  <Input max={599} min={100} onChange={(event) => setResponses((current) => current.map((item) => (item.rowId === row.rowId ? { ...item, httpStatusCode: Number(event.target.value) || 200 } : item)))} type="number" value={row.httpStatusCode} />
                                  <Select onChange={(event) => setResponses((current) => current.map((item) => (item.rowId === row.rowId ? { ...item, dataType: event.target.value } : item)))} value={row.dataType}>
                                    {TYPES.map((type) => (
                                      <option key={type} value={type}>
                                        {type}
                                      </option>
                                    ))}
                                  </Select>
                                  <Input onChange={(event) => setResponses((current) => current.map((item) => (item.rowId === row.rowId ? { ...item, name: event.target.value } : item)))} placeholder="字段名称" value={row.name} />
                                  <Button onClick={() => setResponses((current) => current.filter((item) => item.rowId !== row.rowId))} size="icon" type="button" variant="ghost">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="grid gap-3 lg:grid-cols-[160px_120px_minmax(0,1fr)_minmax(0,1fr)]">
                                  <Input onChange={(event) => setResponses((current) => current.map((item) => (item.rowId === row.rowId ? { ...item, mediaType: event.target.value } : item)))} placeholder="application/json" value={row.mediaType} />
                                  <label className="flex items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-2 text-sm text-foreground">
                                    <input checked={row.required} className="h-4 w-4 accent-[hsl(var(--primary))]" onChange={(event) => setResponses((current) => current.map((item) => (item.rowId === row.rowId ? { ...item, required: event.target.checked } : item)))} type="checkbox" />
                                    必填
                                  </label>
                                  <Input onChange={(event) => setResponses((current) => current.map((item) => (item.rowId === row.rowId ? { ...item, description: event.target.value } : item)))} placeholder="字段说明" value={row.description} />
                                  <Input onChange={(event) => setResponses((current) => current.map((item) => (item.rowId === row.rowId ? { ...item, exampleValue: event.target.value } : item)))} placeholder="示例值" value={row.exampleValue} />
                                </div>
                              </div>
                            </EditableRow>
                          ))}

                          <div className="flex flex-wrap gap-2">
                            <Button onClick={() => setResponses((current) => [...current, makeResponse()])} size="sm" type="button" variant="outline">
                              <Plus className="mr-1.5 h-3.5 w-3.5" />
                              新增响应字段
                            </Button>
                            <Button disabled={saving === "responses"} onClick={() => void saveResponses()}>
                              <Save className="mr-1.5 h-3.5 w-3.5" />
                              {saving === "responses" ? "保存中..." : "保存响应结构"}
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      {editTab === "versions" ? (
                        <div className="space-y-4">
                          <div className="grid gap-3 md:grid-cols-2">
                            <Input onChange={(event) => setVersion(event.target.value)} placeholder="v2.3.1" value={version} />
                            <Input onChange={(event) => setSummary(event.target.value)} placeholder="变更摘要" value={summary} />
                          </div>
                          <Button disabled={saving === "version"} onClick={() => void saveVersion()}>
                            <GitBranch className="mr-1.5 h-3.5 w-3.5" />
                            {saving === "version" ? "创建中..." : "创建版本快照"}
                          </Button>
                        </div>
                      ) : null}
                    </PreviewCard>

                    <PreviewCard title="编辑摘要">
                      <Summary label="当前标签" value={editTab === "basics" ? "基础信息" : editTab === "parameters" ? "请求参数" : editTab === "responses" ? "响应结构" : "版本快照"} />
                      <Summary label="创建人" value={bundle.endpoint.createdByDisplayName || "未记录"} />
                      <Summary label="更新人" value={bundle.endpoint.updatedByDisplayName || "未记录"} />
                    </PreviewCard>
                  </div>
                )}
              </>
            ) : null}
          </section>
        </div>
      </div>
    </ProjectConsoleLayout>
  );
}

function ToolbarToggle({ active, icon, label, onClick }: { active: boolean; icon?: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      className={cn(
        "rounded-full px-4 py-2 text-xs font-semibold transition-smooth",
        active ? "bg-primary/14 text-primary shadow-[0_8px_18px_hsl(var(--primary)/0.14)]" : "bg-surface text-muted-foreground hover:bg-accent",
      )}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function PreviewCard({ title, count, children }: { title: string; count?: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-[1.8rem] border-border/80 bg-card/88">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{title}</p>
          {count ? <Badge variant="outline">{count}</Badge> : null}
        </div>
        <div className="space-y-3">{children}</div>
      </CardContent>
    </Card>
  );
}

function PreviewRow({ label, meta, text }: { label: string; meta: string; text: string }) {
  return (
    <div className="rounded-[1rem] border border-border bg-surface/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{meta}</p>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{text}</p>
    </div>
  );
}

function Summary({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-[1rem] border border-border bg-surface/60 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={cn("mt-2 text-sm font-medium text-foreground", mono ? "font-mono" : "")}>{value}</p>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-[1.2rem] border border-border bg-surface/55 px-4 py-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[11px] uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function EditableRow({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[1rem] border border-border bg-surface/55 p-3">{children}</div>;
}

function AlertBox({ text, tone }: { text: string; tone: "error" | "success" }) {
  return (
    <div className={cn("rounded-[1.3rem] px-4 py-3 text-sm", tone === "error" ? "border border-destructive/20 bg-destructive/10 text-destructive" : "border border-success/20 bg-success/10 text-success")}>
      {text}
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return <div className="rounded-[1.8rem] border border-dashed border-border bg-card/72 px-5 py-10 text-center text-sm text-muted-foreground">{text}</div>;
}

function EmptyText({ text }: { text: string }) {
  return <div className="rounded-[1rem] border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">{text}</div>;
}
