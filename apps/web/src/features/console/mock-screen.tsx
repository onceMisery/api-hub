"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  fetchEndpointMockReleases,
  fetchEndpointMockRules,
  fetchEndpointResponses,
  fetchProjectMockCenter,
  publishEndpointMockRelease,
  replaceEndpointMockRules,
  simulateEndpointMock,
  updateProjectMockAccess,
  type MockAccessMode,
  type MockReleaseDetail,
  type MockRuleDetail,
  type MockRuleUpsertItem,
  type MockSimulationResult,
  type ProjectMockCenter,
  type ProjectMockCenterItem,
  type ResponseDetail,
} from "@api-hub/api-sdk";
import {
  BadgeCheck,
  Clock3,
  Copy,
  Flame,
  Layers3,
  Play,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Waypoints,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Badge, MethodBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";

import { MockAiGeneratorCard } from "./mock-ai-generator-card";
import { ProjectConsoleLayout } from "./project-console-layout";

type MockScreenProps = {
  projectId: number;
};

type EditableRule = MockRuleUpsertItem & { rowId: string };
type RuleDraft = { query: string; header: string; body: string };
type EndpointFilter = "all" | "mocked" | "dirty" | "published";

const TEMPLATE_MODE_OPTIONS: Array<{ value: MockRuleUpsertItem["templateMode"]; label: string; hint: string }> = [
  { value: "plain", label: "静态", hint: "原样返回 body 内容" },
  { value: "mockjs", label: "动态模板", hint: "支持 @guid / @email / items|3 这类 Mock.js 风格语法" },
];

const ACCESS_MODE_OPTIONS: Array<{ value: MockAccessMode; label: string; hint: string }> = [
  { value: "private", label: "私有", hint: "仅控制台可访问" },
  { value: "token", label: "令牌", hint: "需要访问令牌" },
  { value: "public", label: "公开", hint: "外部可直接访问" },
];

const ENDPOINT_FILTERS: Array<{ value: EndpointFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "mocked", label: "已启用" },
  { value: "dirty", label: "待发布" },
  { value: "published", label: "已发布" },
];

const QUERY_HINTS = ["登录", "订单", "userId", "mock", "status=ready", "v2.0.0-release"];

function nowId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function copyText(text: string) {
  if (typeof window !== "undefined") {
    void navigator.clipboard.writeText(text);
  }
}

function formatTime(value?: string | null) {
  if (!value) {
    return "未发布";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function modeLabel(mode: MockAccessMode) {
  return ACCESS_MODE_OPTIONS.find((item) => item.value === mode)?.label ?? "私有";
}

function parseEntries(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const index = line.indexOf("=");
      if (index < 0) {
        return { name: line, value: "" };
      }
      return { name: line.slice(0, index).trim(), value: line.slice(index + 1).trim() };
    })
    .filter((entry) => entry.name);
}

function parseBodyEntries(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const index = line.indexOf("=");
      if (index < 0) {
        return { jsonPath: line, expectedValue: "" };
      }
      return { jsonPath: line.slice(0, index).trim(), expectedValue: line.slice(index + 1).trim() };
    })
    .filter((entry) => entry.jsonPath);
}

function toRuleDraft(rule: Pick<MockRuleDetail, "queryConditions" | "headerConditions" | "bodyConditions">): RuleDraft {
  return {
    query: rule.queryConditions.map((entry) => `${entry.name}=${entry.value}`).join("\n"),
    header: rule.headerConditions.map((entry) => `${entry.name}=${entry.value}`).join("\n"),
    body: rule.bodyConditions.map((entry) => `${entry.jsonPath}=${entry.expectedValue}`).join("\n"),
  };
}

function makeRule(rule?: Partial<MockRuleUpsertItem>): EditableRule {
  return {
    rowId: nowId(),
    ruleName: rule?.ruleName ?? "",
    priority: rule?.priority ?? 100,
    enabled: rule?.enabled ?? true,
    queryConditions: rule?.queryConditions ?? [],
    headerConditions: rule?.headerConditions ?? [],
    bodyConditions: rule?.bodyConditions ?? [],
    statusCode: rule?.statusCode ?? 200,
    mediaType: rule?.mediaType ?? "application/json",
    body: rule?.body ?? "{}",
    delayMs: rule?.delayMs ?? 0,
    templateMode: rule?.templateMode ?? "plain",
  };
}

function buildSimulationResponses(responses: ResponseDetail[]) {
  return responses.map((response) => ({
    httpStatusCode: response.httpStatusCode,
    mediaType: response.mediaType,
    name: response.name || "",
    dataType: response.dataType,
    required: response.required,
    description: response.description || "",
    exampleValue: response.exampleValue || "",
  }));
}

function safeJsonArrayLength(value: string | null | undefined) {
  if (!value) {
    return 0;
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export function MockScreen({ projectId }: MockScreenProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedEndpointId = Number(searchParams.get("endpointId") ?? "") || null;

  const [center, setCenter] = useState<ProjectMockCenter | null>(null);
  const [responses, setResponses] = useState<ResponseDetail[]>([]);
  const [rules, setRules] = useState<EditableRule[]>([]);
  const [releases, setReleases] = useState<MockReleaseDetail[]>([]);
  const [drafts, setDrafts] = useState<Record<string, RuleDraft>>({});
  const [query, setQuery] = useState("");
  const [endpointFilter, setEndpointFilter] = useState<EndpointFilter>("all");
  const [mode, setMode] = useState<MockAccessMode>("private");
  const [loading, setLoading] = useState(true);
  const [loadingEditor, setLoadingEditor] = useState(false);
  const [savingMode, setSavingMode] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queryText, setQueryText] = useState("");
  const [headerText, setHeaderText] = useState("");
  const [bodySample, setBodySample] = useState("{}");
  const [simulation, setSimulation] = useState<MockSimulationResult | null>(null);
  const deferredQuery = useDeferredValue(query);

  const runtimeUrl = typeof window === "undefined" ? `/mock/${projectId}` : `${window.location.origin}/mock/${projectId}`;

  async function loadCenter(preferredId?: number | null) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchProjectMockCenter(projectId);
      setCenter(response.data);
      setMode(response.data.settings.mode);
      const targetId = preferredId ?? selectedEndpointId;
      const exists = response.data.items.some((item) => item.endpointId === targetId);
      if (!exists) {
        const fallback = response.data.items.find((item) => item.mockEnabled) ?? response.data.items[0];
        if (fallback) {
          router.replace(`${pathname}?endpointId=${fallback.endpointId}`, { scroll: false });
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Mock 中心加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function loadEndpointEditor(endpointId: number) {
    setLoadingEditor(true);
    setError(null);
    try {
      const [rulesResponse, responsesResponse, releasesResponse] = await Promise.all([
        fetchEndpointMockRules(endpointId),
        fetchEndpointResponses(endpointId),
        fetchEndpointMockReleases(endpointId),
      ]);
      const nextRules = rulesResponse.data.map((rule) => makeRule(rule));
      setRules(nextRules);
      setResponses(responsesResponse.data);
      setReleases(releasesResponse.data);
      setDrafts(Object.fromEntries(nextRules.map((rule, index) => [rule.rowId, toRuleDraft(rulesResponse.data[index])])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "接口 Mock 数据加载失败");
      setRules([]);
      setResponses([]);
      setReleases([]);
      setDrafts({});
    } finally {
      setLoadingEditor(false);
    }
  }

  useEffect(() => {
    void loadCenter();
  }, [projectId]);

  useEffect(() => {
    if (!selectedEndpointId) {
      setRules([]);
      setResponses([]);
      setReleases([]);
      setDrafts({});
      return;
    }
    void loadEndpointEditor(selectedEndpointId);
  }, [selectedEndpointId]);

  const filteredItems = useMemo(() => {
    const items = center?.items ?? [];
    const normalized = deferredQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (endpointFilter === "mocked" && !item.mockEnabled) {
        return false;
      }
      if (endpointFilter === "dirty" && !item.draftChanged) {
        return false;
      }
      if (endpointFilter === "published" && !item.latestReleaseNo) {
        return false;
      }
      if (!normalized) {
        return true;
      }
      return `${item.endpointName} ${item.path} ${item.method} ${item.moduleName ?? ""} ${item.groupName ?? ""}`
        .toLowerCase()
        .includes(normalized);
    });
  }, [center?.items, deferredQuery, endpointFilter]);

  const selectedItem = useMemo<ProjectMockCenterItem | null>(() => {
    return filteredItems.find((item) => item.endpointId === selectedEndpointId) ?? center?.items.find((item) => item.endpointId === selectedEndpointId) ?? filteredItems[0] ?? null;
  }, [center?.items, filteredItems, selectedEndpointId]);

  const releaseSummary = useMemo(() => {
    return releases.slice(0, 5).map((release) => ({
      id: release.id,
      releaseNo: release.releaseNo,
      createdAt: release.createdAt,
      ruleCount: safeJsonArrayLength(release.rulesSnapshotJson),
      responseCount: safeJsonArrayLength(release.responseSnapshotJson),
      isLatest: releases[0]?.id === release.id,
    }));
  }, [releases]);

  const metrics = useMemo(() => {
    if (!selectedItem) {
      return [];
    }
    return [
      {
        label: "接口总数",
        value: center?.items.length ?? 0,
      },
      {
        label: "当前接口规则",
        value: selectedItem.totalRuleCount,
      },
      {
        label: "已启用规则",
        value: selectedItem.enabledRuleCount,
      },
      {
        label: "响应字段",
        value: selectedItem.responseFieldCount,
      },
    ];
  }, [center?.items.length, selectedItem]);

  async function handleSaveMode(nextMode: MockAccessMode, regenerateToken = false) {
    setSavingMode(true);
    setError(null);
    setMessage(null);
    try {
      const response = await updateProjectMockAccess(projectId, { mode: nextMode, regenerateToken });
      setCenter((current) => (current ? { ...current, settings: response.data } : current));
      setMode(response.data.mode);
      setMessage("Mock 访问模式已更新");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Mock 访问模式保存失败");
    } finally {
      setSavingMode(false);
    }
  }

  async function handleSaveRules() {
    if (!selectedEndpointId) {
      return;
    }
    setSavingRules(true);
    setError(null);
    setMessage(null);
    try {
      const payload = rules
        .map((rule) => ({
          ruleName: rule.ruleName.trim(),
          priority: rule.priority,
          enabled: rule.enabled,
          queryConditions: parseEntries(drafts[rule.rowId]?.query ?? ""),
          headerConditions: parseEntries(drafts[rule.rowId]?.header ?? ""),
          bodyConditions: parseBodyEntries(drafts[rule.rowId]?.body ?? ""),
          statusCode: rule.statusCode,
          mediaType: rule.mediaType.trim() || "application/json",
          body: rule.body,
          delayMs: Math.max(rule.delayMs, 0),
          templateMode: rule.templateMode,
        }))
        .filter((rule) => rule.ruleName);

      await replaceEndpointMockRules(selectedEndpointId, payload);
      setMessage("Mock 规则已保存");
      await loadCenter(selectedEndpointId);
      await loadEndpointEditor(selectedEndpointId);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Mock 规则保存失败");
    } finally {
      setSavingRules(false);
    }
  }

  async function handlePublish(endpointId: number) {
    setPublishingId(endpointId);
    setError(null);
    setMessage(null);
    try {
      await publishEndpointMockRelease(endpointId);
      setMessage("Mock 快照已发布");
      await loadCenter(endpointId);
      await loadEndpointEditor(endpointId);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Mock 发布失败");
    } finally {
      setPublishingId(null);
    }
  }

  async function handleSimulation() {
    if (!selectedEndpointId) {
      return;
    }
    setSimulating(true);
    setError(null);
    setMessage(null);
    try {
      const response = await simulateEndpointMock(selectedEndpointId, {
        draftRules: rules
          .map((rule) => ({
            ruleName: rule.ruleName.trim(),
            priority: rule.priority,
            enabled: rule.enabled,
            queryConditions: parseEntries(drafts[rule.rowId]?.query ?? ""),
            headerConditions: parseEntries(drafts[rule.rowId]?.header ?? ""),
            bodyConditions: parseBodyEntries(drafts[rule.rowId]?.body ?? ""),
            statusCode: rule.statusCode,
            mediaType: rule.mediaType.trim() || "application/json",
            body: rule.body,
            delayMs: Math.max(rule.delayMs, 0),
            templateMode: rule.templateMode,
          }))
          .filter((rule) => rule.ruleName),
        draftResponses: buildSimulationResponses(responses),
        querySamples: parseEntries(queryText),
        headerSamples: parseEntries(headerText),
        bodySample,
      });
      setSimulation(response.data);
      setMessage("Mock 规则模拟已完成");
    } catch (simulationError) {
      setError(simulationError instanceof Error ? simulationError.message : "Mock 规则模拟失败");
    } finally {
      setSimulating(false);
    }
  }

  function addRule() {
    const nextRule = makeRule();
    setRules((current) => [...current, nextRule]);
    setDrafts((current) => ({ ...current, [nextRule.rowId]: { query: "", header: "", body: "" } }));
  }

  function removeRule(rowId: string) {
    setRules((current) => current.filter((rule) => rule.rowId !== rowId));
    setDrafts((current) => {
      const next = { ...current };
      delete next[rowId];
      return next;
    });
  }

  function applyAiMock(body: string) {
    if (!body.trim()) {
      return;
    }
    if (rules.length === 0) {
      const nextRule = makeRule({
        ruleName: "AI 生成规则",
        body,
        templateMode: "plain",
      });
      setRules([nextRule]);
      setDrafts({ [nextRule.rowId]: { query: "", header: "", body: "" } });
      return;
    }
    setRules((current) => current.map((item, index) => (index === 0 ? { ...item, body, templateMode: "plain" } : item)));
  }

  return (
    <ProjectConsoleLayout description="按项目控制 Mock 的运行态、规则草稿、发布快照与模拟解释" projectId={projectId} title="Mock">
      <div className="space-y-6">
        {(error || message) && (
          <div className="grid gap-3 lg:grid-cols-2">
            {error ? <div className="rounded-[1.4rem] border border-destructive/20 bg-destructive/10 px-5 py-4 text-sm text-destructive">{error}</div> : null}
            {message ? <div className="rounded-[1.4rem] border border-success/20 bg-success/10 px-5 py-4 text-sm text-success">{message}</div> : null}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_360px]">
          <Card className="overflow-hidden rounded-[2rem] border-border/80 bg-card/85">
            <CardContent className="space-y-5 p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                    <Flame className="h-3.5 w-3.5" />
                    Mock Runtime Console
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-foreground">项目 Mock 运行控制台</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
                      这里同时展示草稿规则、已发布快照和命中解释。你可以先改规则，再用模拟器验证，最后把当前草稿发布成新的运行快照。
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
                  <MetricCard label="当前接口" value={selectedItem?.endpointName ?? "未选择"} subLabel={selectedItem ? `${selectedItem.method} ${selectedItem.path}` : "请选择一个接口"} />
                  <MetricCard label="最新发布" value={selectedItem?.latestReleaseNo ? `#${selectedItem.latestReleaseNo}` : "未发布"} subLabel={formatTime(selectedItem?.latestReleaseAt)} />
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_340px]">
                <div className="space-y-3 rounded-[1.6rem] border border-border bg-background/55 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">运行地址</p>
                  <code className="block break-all rounded-[1.2rem] border border-border bg-surface/75 px-4 py-3 font-mono text-sm text-foreground">
                    {runtimeUrl}
                  </code>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => copyText(runtimeUrl)} size="sm" variant="outline">
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      复制地址
                    </Button>
                    {center?.settings.token ? (
                      <Button onClick={() => copyText(center.settings.token ?? "")} size="sm" variant="outline">
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                        复制令牌
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-3 rounded-[1.6rem] border border-border bg-background/55 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">访问模式</p>
                      <p className="mt-1 text-sm text-muted-foreground">切换后会即时影响 mock 网关访问方式。</p>
                    </div>
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      {modeLabel(center?.settings.mode ?? mode)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {ACCESS_MODE_OPTIONS.map((option) => (
                      <button
                        className={[
                          "rounded-[1rem] border px-3 py-3 text-left transition-fast",
                          mode === option.value ? "border-primary/35 bg-primary/10 text-primary" : "border-border bg-surface/70 text-muted-foreground hover:border-primary/20 hover:text-foreground",
                        ].join(" ")}
                        key={option.value}
                        onClick={() => setMode(option.value)}
                        type="button"
                      >
                        <p className="text-sm font-semibold">{option.label}</p>
                        <p className="mt-1 text-[11px] leading-5">{option.hint}</p>
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={savingMode} onClick={() => void handleSaveMode(mode)} size="sm">
                      {savingMode ? "保存中..." : "保存模式"}
                    </Button>
                    {mode === "token" ? (
                      <Button disabled={savingMode} onClick={() => void handleSaveMode("token", true)} size="sm" variant="outline">
                        <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                        重置令牌
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <Metric label="接口总数" value={center?.items.length ?? 0} />
            <Metric label="待发布接口" value={center?.items.filter((item) => item.draftChanged).length ?? 0} />
            <Metric label="已启用接口" value={center?.items.filter((item) => item.mockEnabled).length ?? 0} />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
          <Card className="rounded-[2rem] border-border/80 bg-card/85">
            <CardContent className="p-0">
              <div className="border-b border-border px-5 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Endpoint Mock Center</p>
                    <h3 className="mt-2 text-xl font-semibold text-foreground">选择接口</h3>
                  </div>
                  <Badge variant="outline">{filteredItems.length}/{center?.items.length ?? 0}</Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {ENDPOINT_FILTERS.map((filter) => (
                    <button
                      className={[
                        "rounded-full border px-3 py-2 text-xs font-medium transition-fast",
                        endpointFilter === filter.value ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-surface/70 text-muted-foreground hover:border-primary/20 hover:text-foreground",
                      ].join(" ")}
                      key={filter.value}
                      onClick={() => setEndpointFilter(filter.value)}
                      type="button"
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="h-11 pl-10" onChange={(event) => setQuery(event.target.value)} placeholder="搜索接口、路径、模块或分组" value={query} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {QUERY_HINTS.map((hint) => (
                    <button
                      className="rounded-full border border-border bg-surface/70 px-3 py-2 text-[11px] text-muted-foreground transition-fast hover:border-primary/25 hover:text-foreground"
                      key={hint}
                      onClick={() => setQuery(hint)}
                      type="button"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>

              <div className="scrollbar-thin max-h-[calc(100vh-24rem)] overflow-y-auto px-4 py-4">
                {loading ? <div className="rounded-[1.4rem] border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">正在加载 Mock 中心...</div> : null}
                <div className="space-y-3">
                  {filteredItems.map((item) => (
                    <button
                      className={[
                        "w-full rounded-[1.4rem] border px-4 py-4 text-left transition-fast",
                        selectedItem?.endpointId === item.endpointId ? "border-primary/30 bg-primary/8" : "border-border bg-surface/60 hover:border-primary/20 hover:bg-primary/5",
                      ].join(" ")}
                      key={item.endpointId}
                      onClick={() => router.replace(`${pathname}?endpointId=${item.endpointId}`, { scroll: false })}
                      type="button"
                    >
                      <div className="flex items-center gap-2">
                        <MethodBadge method={item.method} />
                        <span className="truncate text-sm font-semibold text-foreground">{item.endpointName}</span>
                      </div>
                      <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{item.path}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <Badge variant={item.mockEnabled ? "success" : "outline"}>{item.mockEnabled ? "已启用" : "未启用"}</Badge>
                        <Badge variant={item.draftChanged ? "warning" : "outline"}>{item.draftChanged ? "待发布" : "已同步"}</Badge>
                        <span>{item.totalRuleCount} 条规则</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {selectedItem ? (
              <>
                <Card className="rounded-[2rem] border-border/80 bg-card/85">
                  <CardContent className="space-y-5 p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <MethodBadge method={selectedItem.method} />
                          <code className="rounded-full bg-surface px-3 py-1 text-xs text-muted-foreground">{selectedItem.path}</code>
                          <Badge variant={selectedItem.mockEnabled ? "success" : "outline"}>{selectedItem.mockEnabled ? "Mock 已启用" : "Mock 未启用"}</Badge>
                          <Badge variant={selectedItem.draftChanged ? "warning" : "success"}>{selectedItem.draftChanged ? "草稿已变更" : "草稿已同步"}</Badge>
                        </div>
                        <div>
                          <h2 className="text-3xl font-semibold text-foreground">{selectedItem.endpointName}</h2>
                          <p className="mt-3 text-sm leading-7 text-muted-foreground">
                            最新发布：{selectedItem.latestReleaseNo ? `#${selectedItem.latestReleaseNo}` : "未发布"} · {formatTime(selectedItem.latestReleaseAt)}
                          </p>
                          <p className="mt-1 text-sm leading-7 text-muted-foreground">
                            {selectedItem.moduleName}
                            {selectedItem.groupName ? ` / ${selectedItem.groupName}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button disabled={publishingId === selectedItem.endpointId} onClick={() => void handlePublish(selectedItem.endpointId)} size="sm">
                          <Upload className="mr-1.5 h-3.5 w-3.5" />
                          {publishingId === selectedItem.endpointId ? "发布中..." : "发布快照"}
                        </Button>
                        <Button disabled={savingRules} onClick={() => void handleSaveRules()} size="sm" variant="outline">
                          <Save className="mr-1.5 h-3.5 w-3.5" />
                          {savingRules ? "保存中..." : "保存规则"}
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {metrics.map((item) => (
                        <MetricCard key={item.label} label={item.label} value={typeof item.value === "number" ? item.value : item.value} subLabel={typeof item.value === "number" ? "条" : undefined} />
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="space-y-6">
                    <Card className="rounded-[2rem] border-border/80 bg-card/85">
                      <CardContent className="space-y-4 p-6">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Waypoints className="h-4 w-4 text-primary" />
                            <h3 className="text-lg font-semibold text-foreground">规则编辑器</h3>
                          </div>
                          <Button onClick={addRule} size="sm" variant="outline">
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            新增规则
                          </Button>
                        </div>

                        {loadingEditor ? <div className="rounded-[1.4rem] border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">正在加载规则、响应和发布历史...</div> : null}

                        {!loadingEditor && rules.length === 0 ? (
                          <div className="rounded-[1.4rem] border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">这个接口还没有规则，先创建第一条规则吧。</div>
                        ) : null}

                        <div className="space-y-4">
                          {rules.map((rule) => (
                            <div className="rounded-[1.5rem] border border-border bg-surface/65 p-4" key={rule.rowId}>
                              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_110px_120px_44px]">
                                <Input
                                  onChange={(event) => setRules((current) => current.map((item) => (item.rowId === rule.rowId ? { ...item, ruleName: event.target.value } : item)))}
                                  placeholder="规则名称"
                                  value={rule.ruleName}
                                />
                                <Input
                                  onChange={(event) => setRules((current) => current.map((item) => (item.rowId === rule.rowId ? { ...item, priority: Number(event.target.value) || 0 } : item)))}
                                  type="number"
                                  value={rule.priority}
                                />
                                <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3">
                                  <input
                                    checked={rule.enabled}
                                    className="h-4 w-4 accent-primary"
                                    onChange={(event) => setRules((current) => current.map((item) => (item.rowId === rule.rowId ? { ...item, enabled: event.target.checked } : item)))}
                                    type="checkbox"
                                  />
                                  <span className="text-xs text-muted-foreground">启用</span>
                                </div>
                                <Button onClick={() => removeRule(rule.rowId)} size="icon-sm" variant="ghost">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <RuleField title="Query 条件" placeholder="status=ready" value={drafts[rule.rowId]?.query ?? ""} onChange={(value) => setDrafts((current) => ({ ...current, [rule.rowId]: { query: value, header: current[rule.rowId]?.header ?? "", body: current[rule.rowId]?.body ?? "" } }))} />
                                <RuleField title="Header 条件" placeholder="x-env=qa" value={drafts[rule.rowId]?.header ?? ""} onChange={(value) => setDrafts((current) => ({ ...current, [rule.rowId]: { query: current[rule.rowId]?.query ?? "", header: value, body: current[rule.rowId]?.body ?? "" } }))} />
                                <RuleField title="Body 条件" placeholder="$.status=ready" value={drafts[rule.rowId]?.body ?? ""} onChange={(value) => setDrafts((current) => ({ ...current, [rule.rowId]: { query: current[rule.rowId]?.query ?? "", header: current[rule.rowId]?.header ?? "", body: value } }))} />

                                <div className="space-y-3">
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <Input
                                      onChange={(event) => setRules((current) => current.map((item) => (item.rowId === rule.rowId ? { ...item, statusCode: Number(event.target.value) || 200 } : item)))}
                                      type="number"
                                      value={rule.statusCode}
                                    />
                                    <Input
                                      onChange={(event) => setRules((current) => current.map((item) => (item.rowId === rule.rowId ? { ...item, mediaType: event.target.value } : item)))}
                                      placeholder="application/json"
                                      value={rule.mediaType}
                                    />
                                  </div>
                                  <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
                                    <Input
                                      min={0}
                                      onChange={(event) => setRules((current) => current.map((item) => (item.rowId === rule.rowId ? { ...item, delayMs: Number(event.target.value) || 0 } : item)))}
                                      placeholder="Delay ms"
                                      type="number"
                                      value={rule.delayMs}
                                    />
                                    <select
                                      className="h-11 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none ring-0 transition-fast focus:border-primary/35"
                                      onChange={(event) => setRules((current) => current.map((item) => (item.rowId === rule.rowId ? { ...item, templateMode: event.target.value as MockRuleUpsertItem["templateMode"] } : item)))}
                                      value={rule.templateMode}
                                    >
                                      {TEMPLATE_MODE_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <Textarea
                                    className="min-h-[124px] font-mono text-xs"
                                    onChange={(event) => setRules((current) => current.map((item) => (item.rowId === rule.rowId ? { ...item, body: event.target.value } : item)))}
                                    placeholder='{"ok": true}'
                                    value={rule.body}
                                  />
                                  <div className="rounded-[1rem] border border-border/70 bg-surface/55 px-3 py-3 text-[11px] leading-6 text-muted-foreground">
                                    {rule.templateMode === "mockjs"
                                      ? "动态模板示例：@guid、@email、@integer(1,10)、{\"items|3\":[{\"id\":\"@guid\"}]}"
                                      : "静态模式下 body 会原样返回。Delay ms 会在运行态和模拟器中同时生效。"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-[2rem] border-border/80 bg-card/85">
                      <CardContent className="space-y-4 p-6">
                        <div className="flex items-center gap-2">
                          <Play className="h-4 w-4 text-primary" />
                          <h3 className="text-lg font-semibold text-foreground">模拟器</h3>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                          <Textarea className="min-h-[86px] font-mono text-xs" onChange={(event) => setQueryText(event.target.value)} placeholder="query: status=ready" value={queryText} />
                          <Textarea className="min-h-[86px] font-mono text-xs" onChange={(event) => setHeaderText(event.target.value)} placeholder="header: x-env=qa" value={headerText} />
                          <Textarea className="min-h-[86px] font-mono text-xs md:min-h-[120px]" onChange={(event) => setBodySample(event.target.value)} placeholder='{"status":"ready"}' value={bodySample} />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button disabled={simulating} onClick={() => void handleSimulation()}>
                            {simulating ? "模拟中..." : "运行模拟"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-[2rem] border-border/80 bg-card/85">
                      <CardContent className="space-y-4 p-6">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <h3 className="text-lg font-semibold text-foreground">模拟结果</h3>
                        </div>

                        {!simulation ? <p className="text-sm text-muted-foreground">运行一次模拟后，这里会展示命中的规则、延迟、响应体和解释链路。</p> : null}

                        {simulation ? (
                          <div className="space-y-4">
                            <div className="grid gap-3 md:grid-cols-4">
                              <ResultTile label="Source" value={simulation.source} />
                              <ResultTile label="Matched Rule" value={simulation.matchedRuleName || "fallback"} />
                              <ResultTile label="HTTP Status" value={String(simulation.statusCode)} />
                              <ResultTile label="Delay" value={`${simulation.delayMs} ms`} />
                            </div>

                            <div className="rounded-[1.3rem] border border-border bg-background/70 p-4">
                              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Response Body</p>
                              <pre className="scrollbar-thin max-h-[260px] overflow-auto whitespace-pre-wrap break-words text-[11px] leading-6 text-foreground">{simulation.body}</pre>
                            </div>

                            <div className="space-y-2">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Rule Traces</p>
                              {simulation.ruleTraces.map((trace, index) => (
                                <div className="rounded-[1.2rem] border border-border bg-surface/55 px-4 py-3" key={`${trace.ruleName}-${index}`}>
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold text-foreground">{trace.ruleName}</p>
                                      <p className="mt-1 text-xs text-muted-foreground">Priority {trace.priority}</p>
                                    </div>
                                    <Badge variant={trace.status === "matched" ? "success" : trace.status === "skipped" ? "warning" : "outline"}>{trace.status}</Badge>
                                  </div>
                                  <p className="mt-2 text-xs leading-6 text-muted-foreground">{trace.summary}</p>
                                  {trace.checks.length > 0 ? <p className="mt-2 text-[11px] leading-6 text-muted-foreground">{trace.checks.join(" · ")}</p> : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-6">
                    <MockAiGeneratorCard
                      endpointId={selectedItem.endpointId}
                      endpoint={{
                        name: selectedItem.endpointName,
                        method: selectedItem.method,
                        path: selectedItem.path,
                      }}
                      responses={responses}
                      onApplyGenerated={applyAiMock}
                    />

                    <Card className="rounded-[2rem] border-border/80 bg-card/85">
                      <CardContent className="space-y-4 p-6">
                        <div className="flex items-center gap-2">
                          <Layers3 className="h-4 w-4 text-primary" />
                          <h3 className="text-lg font-semibold text-foreground">发布历史</h3>
                        </div>

                        {releaseSummary.length === 0 ? (
                          <p className="text-sm leading-7 text-muted-foreground">这个接口还没有发布过快照。保存好规则后就可以先发布一次，形成稳定运行态。</p>
                        ) : (
                          <div className="space-y-3">
                            {releaseSummary.map((release) => (
                              <div className="rounded-[1.2rem] border border-border bg-surface/60 px-4 py-4" key={release.id}>
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge variant={release.isLatest ? "success" : "outline"}>{release.isLatest ? "最新" : "历史"}</Badge>
                                      <span className="text-sm font-semibold text-foreground">#{release.releaseNo}</span>
                                    </div>
                                    <p className="mt-2 text-xs text-muted-foreground">{formatTime(release.createdAt)}</p>
                                  </div>
                                  <Clock3 className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                                  <div className="rounded-lg border border-border bg-background/50 px-3 py-2">规则 {release.ruleCount}</div>
                                  <div className="rounded-lg border border-border bg-background/50 px-3 py-2">响应 {release.responseCount}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="rounded-[2rem] border-border/80 bg-card/85">
                      <CardContent className="space-y-4 p-6">
                        <div className="flex items-center gap-2">
                          <BadgeCheck className="h-4 w-4 text-primary" />
                          <h3 className="text-lg font-semibold text-foreground">运行摘要</h3>
                        </div>
                        <div className="space-y-3 text-sm leading-7 text-muted-foreground">
                          <p>当前运行态优先使用最新发布快照，未发布时回退到草稿模拟。</p>
                          <p>规则命中顺序按 `priority desc, id asc` 计算，模拟器会输出每条规则的命中状态和检查链路。</p>
                          <p>Delay ms、Mock.js 模板模式和响应快照现在都可以一起工作，适合前后端联调时快速复现慢接口和动态数据。</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            ) : (
              <Card className="rounded-[2rem] border-border/80 bg-card/85">
                <CardContent className="p-10 text-center text-sm text-muted-foreground">请选择一个接口进入规则编辑、发布和模拟流程。</CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ProjectConsoleLayout>
  );
}

function MetricCard({ label, value, subLabel }: { label: string; value: number | string; subLabel?: string }) {
  return (
    <Card className="rounded-[1.4rem] border-border/80 bg-background/65">
      <CardContent className="p-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
        {subLabel ? <p className="mt-1 text-xs text-muted-foreground">{subLabel}</p> : null}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="rounded-[1.4rem] border-border/80 bg-background/65">
      <CardContent className="p-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function RuleField({
  title,
  placeholder,
  value,
  onChange,
}: {
  title: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      <Textarea className="min-h-[98px] font-mono text-xs" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} />
    </div>
  );
}

function ResultTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] bg-surface/70 px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
