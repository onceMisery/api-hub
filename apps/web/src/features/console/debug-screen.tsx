"use client";

import { useEffect, useMemo, useState } from "react";
import {
  executeDebug,
  fetchDebugHistory,
  fetchEnvironments,
  fetchEndpoint,
  fetchEndpointVersions,
  fetchProjectTree,
  type DebugExecutionResult,
  type DebugHistoryItem,
  type EndpointDetail,
  type EnvironmentDetail,
  type ModuleTreeItem,
  type VersionDetail
} from "@api-hub/api-sdk";
import { Copy, History, Plus, Send, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Badge, MethodBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { ProjectConsoleLayout } from "./project-console-layout";
import { flattenProjectTree, findFirstEndpointId } from "./tree-utils";

type DebugScreenProps = {
  projectId: number;
};

type ResponseTab = "body" | "headers" | "summary";

type EditableHeader = {
  enabled: boolean;
  id: string;
  name: string;
  value: string;
};

const authModeLabels: Record<string, string> = {
  none: "无认证",
  bearer: "Bearer",
  api_key_header: "API Key Header",
  api_key_query: "API Key Query",
  basic: "Basic"
};

function buildHeaderRow(entry: { name: string; value: string }, index: number): EditableHeader {
  return {
    id: `${entry.name}-${index}`,
    name: entry.name,
    value: entry.value,
    enabled: true
  };
}

function buildQueryString(entries: { name: string; value: string }[]) {
  return entries.map((entry) => `${entry.name}=${entry.value}`).join("&");
}

function buildPreviewUrl(baseUrl: string, path: string, queryString: string) {
  const trimmedBaseUrl = baseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return queryString ? `${trimmedBaseUrl}${normalizedPath}?${queryString}` : `${trimmedBaseUrl}${normalizedPath}`;
}

export function DebugScreen({ projectId }: DebugScreenProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [modules, setModules] = useState<ModuleTreeItem[]>([]);
  const [environments, setEnvironments] = useState<EnvironmentDetail[]>([]);
  const [history, setHistory] = useState<DebugHistoryItem[]>([]);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<number | null>(null);
  const [endpointDetail, setEndpointDetail] = useState<EndpointDetail | null>(null);
  const [endpointVersions, setEndpointVersions] = useState<VersionDetail[]>([]);
  const [endpointSearch, setEndpointSearch] = useState("");
  const [headers, setHeaders] = useState<EditableHeader[]>([]);
  const [queryString, setQueryString] = useState("");
  const [body, setBody] = useState("{}");
  const [executionResult, setExecutionResult] = useState<DebugExecutionResult | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);
  const [responseTab, setResponseTab] = useState<ResponseTab>("body");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedEndpointId = Number(searchParams.get("endpointId") ?? "") || null;
  const endpointEntries = useMemo(() => flattenProjectTree(modules), [modules]);

  const filteredEndpoints = useMemo(() => {
    const normalized = endpointSearch.trim().toLowerCase();
    if (!normalized) {
      return endpointEntries;
    }

    return endpointEntries.filter((entry) =>
      `${entry.moduleName} ${entry.groupName} ${entry.endpoint.name} ${entry.endpoint.path}`.toLowerCase().includes(normalized)
    );
  }, [endpointEntries, endpointSearch]);

  const selectedEndpointEntry = useMemo(
    () => endpointEntries.find((entry) => entry.endpoint.id === selectedEndpointId) ?? null,
    [endpointEntries, selectedEndpointId]
  );

  const selectedEnvironment = useMemo(
    () => environments.find((environment) => environment.id === selectedEnvironmentId) ?? null,
    [environments, selectedEnvironmentId]
  );

  const selectedHistory = useMemo(() => history.find((item) => item.id === selectedHistoryId) ?? null, [history, selectedHistoryId]);
  const latestVersion = endpointVersions[0] ?? null;

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      setLoading(true);
      setError(null);

      try {
        const [treeResponse, environmentsResponse, historyResponse] = await Promise.all([
          fetchProjectTree(projectId),
          fetchEnvironments(projectId),
          fetchDebugHistory(projectId, { limit: 12 })
        ]);

        if (!mounted) {
          return;
        }

        setModules(treeResponse.data.modules);
        setEnvironments(environmentsResponse.data);
        setHistory(historyResponse.data);

        const defaultEnvironment = environmentsResponse.data.find((item) => item.isDefault) ?? environmentsResponse.data[0] ?? null;
        if (defaultEnvironment) {
          setSelectedEnvironmentId(defaultEnvironment.id);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "调试工作台加载失败。");
        }
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
  }, [projectId]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const exists = endpointEntries.some((entry) => entry.endpoint.id === selectedEndpointId);
    if (!exists) {
      const fallbackEndpointId = findFirstEndpointId(modules);
      if (fallbackEndpointId) {
        router.replace(`${pathname}?endpointId=${fallbackEndpointId}`, { scroll: false });
      }
    }
  }, [endpointEntries, loading, modules, pathname, router, selectedEndpointId]);

  useEffect(() => {
    if (!selectedEndpointId) {
      setEndpointDetail(null);
      setEndpointVersions([]);
      return;
    }

    const endpointId = selectedEndpointId;

    let mounted = true;

    async function loadEndpointData() {
      try {
        const [endpointResponse, versionsResponse] = await Promise.all([fetchEndpoint(endpointId), fetchEndpointVersions(endpointId)]);
        if (!mounted) {
          return;
        }

        setEndpointDetail(endpointResponse.data);
        setEndpointVersions(versionsResponse.data);
      } catch {
        if (mounted) {
          setEndpointDetail(null);
          setEndpointVersions([]);
        }
      }
    }

    void loadEndpointData();

    return () => {
      mounted = false;
    };
  }, [selectedEndpointId]);

  useEffect(() => {
    if (!selectedEnvironment) {
      return;
    }

    setHeaders(selectedEnvironment.defaultHeaders.map(buildHeaderRow));
    setQueryString(buildQueryString(selectedEnvironment.defaultQuery));
  }, [selectedEnvironmentId]);

  async function refreshHistory() {
    try {
      const response = await fetchDebugHistory(projectId, { limit: 12 });
      setHistory(response.data);
    } catch {
      // Ignore refresh failures.
    }
  }

  async function handleSend() {
    if (!selectedEnvironment || !selectedEndpointId) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await executeDebug({
        environmentId: selectedEnvironment.id,
        endpointId: selectedEndpointId,
        queryString: queryString.trim(),
        headers: headers
          .filter((item) => item.enabled && item.name.trim())
          .map((item) => ({
            name: item.name.trim(),
            value: item.value
          })),
        body
      });

      setExecutionResult(response.data);
      setResponseTab("body");
      await refreshHistory();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "调试请求失败。");
    } finally {
      setSending(false);
    }
  }

  function updateHeaderRow(id: string, patch: Partial<EditableHeader>) {
    setHeaders((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  if (loading) {
    return (
      <ProjectConsoleLayout description="使用项目环境和接口定义直接发起调试请求，并查看最近一次返回结果。" projectId={projectId} title="调试台">
        <div className="rounded-[1.8rem] border border-border bg-card/72 p-8 text-center text-sm text-muted-foreground">正在加载调试工作台...</div>
      </ProjectConsoleLayout>
    );
  }

  return (
    <ProjectConsoleLayout description="使用项目环境和接口定义直接发起调试请求，并查看最近一次返回结果。" projectId={projectId} title="调试台">
      <div className="space-y-6">
        {error ? <div className="rounded-[1.6rem] border border-destructive/20 bg-destructive/10 px-5 py-4 text-sm text-destructive">{error}</div> : null}

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <Card className="rounded-[1.8rem] border-border/80 bg-card/84">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">History</p>
                    <h2 className="mt-2 text-lg font-semibold text-foreground">调试历史</h2>
                  </div>
                  <Button onClick={refreshHistory} size="icon-sm" variant="ghost">
                    <History className="h-4 w-4" />
                  </Button>
                </div>

                <div className="scrollbar-thin mt-5 max-h-[360px] space-y-2 overflow-y-auto">
                  {history.length === 0 ? (
                    <div className="rounded-[1.3rem] border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">还没有调试记录。</div>
                  ) : (
                    history.map((item) => (
                      <button
                        className={cn(
                          "w-full rounded-[1.3rem] border px-4 py-3 text-left transition-smooth",
                          selectedHistoryId === item.id ? "border-primary/30 bg-primary/10" : "border-border bg-surface/60 hover:border-primary/20"
                        )}
                        key={item.id}
                        onClick={() => setSelectedHistoryId(item.id)}
                        type="button"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate text-xs font-medium text-foreground">{item.finalUrl}</span>
                          <span className={cn("font-mono text-xs", item.statusCode < 400 ? "text-success" : "text-destructive")}>{item.statusCode}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span>{item.method}</span>
                          <span>{item.durationMs}ms</span>
                          <span>{new Date(item.createdAt).toLocaleString()}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {selectedHistory ? (
              <Card className="rounded-[1.8rem] border-border/80 bg-card/84">
                <CardContent className="p-5">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Selected Record</p>
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-foreground">请求体</p>
                      <pre className="scrollbar-thin mt-2 max-h-32 overflow-auto rounded-[1.2rem] bg-surface/70 p-3 text-[11px] text-muted-foreground">{selectedHistory.requestBody || "-"}</pre>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">响应体</p>
                      <pre className="scrollbar-thin mt-2 max-h-32 overflow-auto rounded-[1.2rem] bg-surface/70 p-3 text-[11px] text-muted-foreground">{selectedHistory.responseBody || "-"}</pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </aside>

          <section className="space-y-6">
            <Card className="rounded-[1.8rem] border-border/80 bg-card/84">
              <CardContent className="p-5">
                <div className="grid gap-4 xl:grid-cols-[180px_minmax(0,1fr)]">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">环境</p>
                    <Select className="mt-2 h-11" onChange={(event) => setSelectedEnvironmentId(Number(event.target.value))} value={selectedEnvironmentId ?? ""}>
                      {environments.map((environment) => (
                        <option key={environment.id} value={environment.id}>
                          {environment.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">接口</p>
                    <div className="mt-2 grid gap-3 lg:grid-cols-[minmax(0,1fr)_120px_108px]">
                      <Input onChange={(event) => setEndpointSearch(event.target.value)} placeholder="搜索接口、路径或模块" value={endpointSearch} />
                      <Select onChange={(event) => router.replace(`${pathname}?endpointId=${Number(event.target.value)}`, { scroll: false })} value={selectedEndpointId ?? ""}>
                        {filteredEndpoints.map((entry) => (
                          <option key={entry.endpoint.id} value={entry.endpoint.id}>
                            {entry.endpoint.name}
                          </option>
                        ))}
                      </Select>
                      <Button disabled={!selectedEnvironment || !selectedEndpointId || sending} onClick={handleSend}>
                        <Send className="mr-1.5 h-4 w-4" />
                        {sending ? "发送中..." : "发送"}
                      </Button>
                    </div>
                  </div>
                </div>

                {selectedEndpointEntry && endpointDetail ? (
                  <div className="mt-5 rounded-[1.5rem] bg-surface/70 px-4 py-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <MethodBadge method={endpointDetail.method} />
                      <code className="rounded-full bg-background px-3 py-1 text-xs text-muted-foreground">{endpointDetail.path}</code>
                      {latestVersion ? <Badge variant="outline">{latestVersion.version}</Badge> : null}
                    </div>
                    <p className="mt-3 text-lg font-semibold text-foreground">{endpointDetail.name}</p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{endpointDetail.description || "当前接口没有补充描述。"}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <div className="grid gap-6 2xl:grid-cols-[1.1fr_0.9fr]">
              <Card className="rounded-[1.8rem] border-border/80 bg-card/84">
                <CardContent className="space-y-5 p-5">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">请求预览</p>
                    <p className="mt-2 text-sm text-muted-foreground">{selectedEnvironment ? buildPreviewUrl(selectedEnvironment.baseUrl, endpointDetail?.path ?? selectedEndpointEntry?.endpoint.path ?? "/", queryString.trim()) : "请先选择环境。"}</p>
                  </div>

                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Query String</p>
                    <Textarea className="mt-2 min-h-[84px] font-mono text-xs" onChange={(event) => setQueryString(event.target.value)} value={queryString} />
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Headers</p>
                      <Button onClick={() => setHeaders((current) => [...current, { id: `header-${Date.now()}`, name: "", value: "", enabled: true }])} size="sm" variant="ghost">
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        新增
                      </Button>
                    </div>

                    <div className="mt-3 space-y-2">
                      {headers.map((header) => (
                        <div className="grid gap-2 lg:grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)_40px]" key={header.id}>
                          <input checked={header.enabled} className="mt-3 h-4 w-4 accent-primary" onChange={(event) => updateHeaderRow(header.id, { enabled: event.target.checked })} type="checkbox" />
                          <Input className="font-mono text-xs" onChange={(event) => updateHeaderRow(header.id, { name: event.target.value })} placeholder="Header 名称" value={header.name} />
                          <Input className="font-mono text-xs" onChange={(event) => updateHeaderRow(header.id, { value: event.target.value })} placeholder="Header 值" value={header.value} />
                          <Button onClick={() => setHeaders((current) => current.filter((item) => item.id !== header.id))} size="icon-sm" type="button" variant="ghost">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Body</p>
                    <Textarea className="mt-2 min-h-[240px] font-mono text-xs" onChange={(event) => setBody(event.target.value)} value={body} />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[1.8rem] border-border/80 bg-card/84">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">响应</p>
                      <div className="mt-2 flex items-center gap-3">
                        {executionResult ? (
                          <>
                            <Badge variant={executionResult.statusCode < 400 ? "success" : "warning"}>{executionResult.statusCode}</Badge>
                            <span className="text-sm text-muted-foreground">{executionResult.durationMs}ms</span>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">尚未发送请求</span>
                        )}
                      </div>
                    </div>

                    {executionResult?.finalUrl ? (
                      <Button onClick={() => navigator.clipboard.writeText(executionResult.finalUrl)} size="sm" variant="outline">
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                        复制 URL
                      </Button>
                    ) : null}
                  </div>

                  <div className="mt-5 flex gap-2">
                    {([
                      { id: "body", label: "响应体" },
                      { id: "headers", label: "响应头" },
                      { id: "summary", label: "摘要" }
                    ] as const).map((tab) => (
                      <button
                        className={cn(
                          "rounded-full px-3 py-1.5 text-[11px] font-medium transition-fast",
                          responseTab === tab.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                        key={tab.id}
                        onClick={() => setResponseTab(tab.id)}
                        type="button"
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-5">
                    {!executionResult ? (
                      <div className="rounded-[1.5rem] border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">发送一次请求后，这里会展示响应内容。</div>
                    ) : responseTab === "body" ? (
                      <pre className="scrollbar-thin max-h-[420px] overflow-auto rounded-[1.5rem] bg-surface/70 p-4 text-xs text-foreground">{executionResult.responseBody || ""}</pre>
                    ) : responseTab === "headers" ? (
                      <div className="space-y-2 rounded-[1.5rem] bg-surface/70 p-4 text-sm">
                        {executionResult.responseHeaders.map((header) => (
                          <div className="flex items-start gap-2" key={header.name}>
                            <span className="w-28 shrink-0 font-mono text-xs text-foreground">{header.name}</span>
                            <span className="break-all text-xs text-muted-foreground">{header.value}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3 rounded-[1.5rem] bg-surface/70 p-4 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">最终 URL</span>
                          <span className="max-w-[60%] truncate font-mono text-xs text-foreground">{executionResult.finalUrl}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">方法</span>
                          <span className="text-foreground">{executionResult.method}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">状态码</span>
                          <span className="text-foreground">{executionResult.statusCode}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">耗时</span>
                          <span className="text-foreground">{executionResult.durationMs}ms</span>
                        </div>
                        {selectedEnvironment ? (
                          <div className="rounded-[1.2rem] border border-border bg-background/55 px-4 py-3">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">环境认证模式</p>
                            <p className="mt-2 text-sm font-semibold text-foreground">{authModeLabels[selectedEnvironment.authMode] ?? selectedEnvironment.authMode}</p>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </div>
    </ProjectConsoleLayout>
  );
}
