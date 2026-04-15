"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchEndpointMockRules,
  fetchEndpointResponses,
  fetchProjectMockCenter,
  publishEndpointMockRelease,
  replaceEndpointMockRules,
  simulateEndpointMock,
  updateProjectMockAccess,
  type MockAccessMode,
  type MockRuleDetail,
  type MockRuleUpsertItem,
  type MockSimulationResult,
  type ProjectMockCenter,
  type ProjectMockCenterItem,
  type ResponseDetail
} from "@api-hub/api-sdk";
import { Copy, Globe, Plus, RefreshCcw, Save, Search, Sparkles, TestTube2, Trash2, Upload, Waypoints } from "lucide-react";
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
const TEMPLATE_MODE_OPTIONS: Array<{ value: MockRuleUpsertItem["templateMode"]; label: string; hint: string }> = [
  { value: "plain", label: "静态", hint: "原样返回 body 内容" },
  { value: "mockjs", label: "动态模板", hint: "支持 @guid / @email / items|3 这类 Mock.js 风格语法" }
];

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
  return mode === "private" ? "私有" : mode === "token" ? "令牌" : "公开";
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
    body: rule.bodyConditions.map((entry) => `${entry.jsonPath}=${entry.expectedValue}`).join("\n")
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
    templateMode: rule?.templateMode ?? "plain"
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
    exampleValue: response.exampleValue || ""
  }));
}

export function MockScreen({ projectId }: MockScreenProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedEndpointId = Number(searchParams.get("endpointId") ?? "") || null;

  const [center, setCenter] = useState<ProjectMockCenter | null>(null);
  const [responses, setResponses] = useState<ResponseDetail[]>([]);
  const [rules, setRules] = useState<EditableRule[]>([]);
  const [drafts, setDrafts] = useState<Record<string, RuleDraft>>({});
  const [query, setQuery] = useState("");
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
      setError(loadError instanceof Error ? loadError.message : "Mock 中心加载失败。");
    } finally {
      setLoading(false);
    }
  }

  async function loadEndpointEditor(endpointId: number) {
    setLoadingEditor(true);
    setError(null);
    try {
      const [rulesResponse, responsesResponse] = await Promise.all([fetchEndpointMockRules(endpointId), fetchEndpointResponses(endpointId)]);
      const nextRules = rulesResponse.data.map((rule) => makeRule(rule));
      setRules(nextRules);
      setResponses(responsesResponse.data);
      setDrafts(Object.fromEntries(nextRules.map((rule, index) => [rule.rowId, toRuleDraft(rulesResponse.data[index])])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "接口规则加载失败。");
      setRules([]);
      setResponses([]);
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
      setDrafts({});
      return;
    }
    void loadEndpointEditor(selectedEndpointId);
  }, [selectedEndpointId]);

  const filteredItems = useMemo(() => {
    const items = center?.items ?? [];
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return items;
    }
    return items.filter((item) => `${item.endpointName} ${item.path} ${item.method} ${item.moduleName ?? ""} ${item.groupName ?? ""}`.toLowerCase().includes(normalized));
  }, [center?.items, query]);

  const selectedItem = useMemo<ProjectMockCenterItem | null>(() => {
    return filteredItems.find((item) => item.endpointId === selectedEndpointId) ?? center?.items.find((item) => item.endpointId === selectedEndpointId) ?? filteredItems[0] ?? null;
  }, [center?.items, filteredItems, selectedEndpointId]);

  async function handleSaveMode(nextMode: MockAccessMode, regenerateToken = false) {
    setSavingMode(true);
    setError(null);
    setMessage(null);
    try {
      const response = await updateProjectMockAccess(projectId, { mode: nextMode, regenerateToken });
      setCenter((current) => (current ? { ...current, settings: response.data } : current));
      setMode(response.data.mode);
      setMessage("Mock 访问方式已更新。");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Mock 访问方式保存失败。");
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
          templateMode: rule.templateMode
        }))
        .filter((rule) => rule.ruleName);

      await replaceEndpointMockRules(selectedEndpointId, payload);
      setMessage("接口 Mock 规则已保存。");
      await loadCenter(selectedEndpointId);
      await loadEndpointEditor(selectedEndpointId);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "接口 Mock 规则保存失败。");
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
      setMessage("接口 Mock 已发布。");
      await loadCenter(endpointId);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "接口 Mock 发布失败。");
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
            templateMode: rule.templateMode
          }))
          .filter((rule) => rule.ruleName),
        draftResponses: buildSimulationResponses(responses),
        querySamples: parseEntries(queryText),
        headerSamples: parseEntries(headerText),
        bodySample
      });
      setSimulation(response.data);
      setMessage("规则模拟完成。");
    } catch (simulationError) {
      setError(simulationError instanceof Error ? simulationError.message : "规则模拟失败。");
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
        ruleName: "AI 智能生成",
        body,
        templateMode: "plain",
      });
      setRules([nextRule]);
      setDrafts({ [nextRule.rowId]: { query: "", header: "", body: "" } });
      return;
    }
    setRules((current) =>
      current.map((item, index) =>
        index === 0 ? { ...item, body, templateMode: "plain" } : item,
      ),
    );
  }

  return (
    <ProjectConsoleLayout description="在项目级控制 Mock 运行时开放方式，并为每个接口单独编辑规则、预演命中结果、发布可用版本。" projectId={projectId} title="Mock">
      <div className="space-y-6">
        {error ? <div className="rounded-[1.6rem] border border-destructive/20 bg-destructive/10 px-5 py-4 text-sm text-destructive">{error}</div> : null}
        {message ? <div className="rounded-[1.6rem] border border-success/20 bg-success/10 px-5 py-4 text-sm text-success">{message}</div> : null}

        <Card className="rounded-[2rem] border-primary/15 bg-primary/6">
          <CardContent className="grid gap-5 p-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <p className="text-lg font-semibold text-foreground">项目 Mock Runtime</p>
              </div>
              <code className="mt-4 block rounded-[1.2rem] bg-background/70 px-4 py-3 text-sm text-foreground">{runtimeUrl}</code>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                当前访问模式为 {center ? modeLabel(center.settings.mode) : modeLabel(mode)}。规则发布后，外部请求会按接口级规则优先匹配。
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => copyText(runtimeUrl)} size="sm" variant="outline">
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  复制运行时地址
                </Button>
                {center?.settings.token ? (
                  <Button onClick={() => copyText(center.settings.token ?? "")} size="sm" variant="outline">
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    复制访问令牌
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="rounded-[1.7rem] border border-border bg-card/78 p-5">
              <p className="text-sm font-semibold text-foreground">访问方式</p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {(["private", "token", "public"] as MockAccessMode[]).map((item) => (
                  <button
                    className={`rounded-[1.2rem] border px-3 py-3 text-sm font-medium transition-smooth ${
                      mode === item ? "border-primary/35 bg-primary/10 text-primary" : "border-border bg-surface/60 text-muted-foreground hover:border-primary/20"
                    }`}
                    key={item}
                    onClick={() => setMode(item)}
                    type="button"
                  >
                    {modeLabel(item)}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
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
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="rounded-[2rem] border-border/80 bg-card/84">
            <CardContent className="p-0">
              <div className="border-b border-border px-5 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Endpoint Mock Center</p>
                    <h2 className="mt-2 text-xl font-semibold text-foreground">选择接口</h2>
                  </div>
                  <Badge variant="outline">{center?.items.length ?? 0}</Badge>
                </div>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="h-11 pl-10" onChange={(event) => setQuery(event.target.value)} placeholder="搜索接口、路径、模块或分组" value={query} />
                </div>
              </div>

              <div className="scrollbar-thin max-h-[calc(100vh-24rem)] overflow-y-auto px-4 py-4">
                {loading ? <div className="rounded-[1.4rem] border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">正在加载 Mock 中心...</div> : null}
                <div className="space-y-3">
                  {filteredItems.map((item) => (
                    <button
                      className={`w-full rounded-[1.4rem] border px-4 py-4 text-left transition-smooth ${
                        selectedItem?.endpointId === item.endpointId ? "border-primary/30 bg-primary/10" : "border-border bg-surface/60 hover:border-primary/20"
                      }`}
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
                <Card className="rounded-[2rem] border-border/80 bg-card/84">
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <MethodBadge method={selectedItem.method} />
                          <code className="rounded-full bg-surface px-3 py-1 text-xs text-muted-foreground">{selectedItem.path}</code>
                          <Badge variant={selectedItem.mockEnabled ? "success" : "outline"}>{selectedItem.mockEnabled ? "Mock 已启用" : "Mock 未启用"}</Badge>
                        </div>
                        <h2 className="mt-4 text-3xl font-semibold text-foreground">{selectedItem.endpointName}</h2>
                        <p className="mt-3 text-sm leading-7 text-muted-foreground">
                          最新发布：{selectedItem.latestReleaseNo ? `#${selectedItem.latestReleaseNo}` : "未发布"} · {formatTime(selectedItem.latestReleaseAt)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button disabled={publishingId === selectedItem.endpointId} onClick={() => void handlePublish(selectedItem.endpointId)} size="sm">
                          <Upload className="mr-1.5 h-3.5 w-3.5" />
                          {publishingId === selectedItem.endpointId ? "发布中..." : "发布接口 Mock"}
                        </Button>
                        <Button disabled={savingRules} onClick={() => void handleSaveRules()} size="sm" variant="outline">
                          <Save className="mr-1.5 h-3.5 w-3.5" />
                          {savingRules ? "保存中..." : "保存规则"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                  <Card className="rounded-[2rem] border-border/80 bg-card/84">
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

                      {loadingEditor ? <div className="rounded-[1.4rem] border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">正在加载接口 Mock 规则...</div> : null}

                      {!loadingEditor && rules.length === 0 ? (
                        <div className="rounded-[1.4rem] border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">这个接口还没有规则，可以直接新增第一条。</div>
                      ) : null}

                      <div className="space-y-4">
                        {rules.map((rule) => (
                          <div className="rounded-[1.5rem] border border-border bg-surface/60 p-4" key={rule.rowId}>
                            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_110px_120px_46px]">
                              <Input onChange={(event) => setRules((current) => current.map((item) => item.rowId === rule.rowId ? { ...item, ruleName: event.target.value } : item))} placeholder="规则名称" value={rule.ruleName} />
                              <Input onChange={(event) => setRules((current) => current.map((item) => item.rowId === rule.rowId ? { ...item, priority: Number(event.target.value) || 0 } : item))} type="number" value={rule.priority} />
                              <div className="flex items-center gap-2 rounded-lg border border-input bg-surface px-3">
                                <input checked={rule.enabled} className="h-4 w-4 accent-primary" onChange={(event) => setRules((current) => current.map((item) => item.rowId === rule.rowId ? { ...item, enabled: event.target.checked } : item))} type="checkbox" />
                                <span className="text-xs text-muted-foreground">启用</span>
                              </div>
                              <Button onClick={() => removeRule(rule.rowId)} size="icon-sm" variant="ghost">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                              <div>
                                <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Query Conditions</p>
                                <Textarea className="min-h-[100px] font-mono text-xs" onChange={(event) => setDrafts((current) => ({ ...current, [rule.rowId]: { query: event.target.value, header: current[rule.rowId]?.header ?? "", body: current[rule.rowId]?.body ?? "" } }))} placeholder="status=ready" value={drafts[rule.rowId]?.query ?? ""} />
                              </div>
                              <div>
                                <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Header Conditions</p>
                                <Textarea className="min-h-[100px] font-mono text-xs" onChange={(event) => setDrafts((current) => ({ ...current, [rule.rowId]: { query: current[rule.rowId]?.query ?? "", header: event.target.value, body: current[rule.rowId]?.body ?? "" } }))} placeholder="x-env=qa" value={drafts[rule.rowId]?.header ?? ""} />
                              </div>
                              <div>
                                <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Body Conditions</p>
                                <Textarea className="min-h-[100px] font-mono text-xs" onChange={(event) => setDrafts((current) => ({ ...current, [rule.rowId]: { query: current[rule.rowId]?.query ?? "", header: current[rule.rowId]?.header ?? "", body: event.target.value } }))} placeholder="$.status=ready" value={drafts[rule.rowId]?.body ?? ""} />
                              </div>
                              <div className="grid gap-3">
                                <div className="grid gap-3 md:grid-cols-2">
                                  <Input onChange={(event) => setRules((current) => current.map((item) => item.rowId === rule.rowId ? { ...item, statusCode: Number(event.target.value) || 200 } : item))} type="number" value={rule.statusCode} />
                                  <Input onChange={(event) => setRules((current) => current.map((item) => item.rowId === rule.rowId ? { ...item, mediaType: event.target.value } : item))} placeholder="application/json" value={rule.mediaType} />
                                </div>
                                <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)]">
                                  <Input
                                    min={0}
                                    onChange={(event) => setRules((current) => current.map((item) => item.rowId === rule.rowId ? { ...item, delayMs: Number(event.target.value) || 0 } : item))}
                                    placeholder="Delay ms"
                                    type="number"
                                    value={rule.delayMs}
                                  />
                                  <select
                                    className="h-11 rounded-lg border border-input bg-surface px-3 text-sm text-foreground outline-none ring-0 transition-fast focus:border-primary/35"
                                    onChange={(event) => setRules((current) => current.map((item) => item.rowId === rule.rowId ? { ...item, templateMode: event.target.value as MockRuleUpsertItem["templateMode"] } : item))}
                                    value={rule.templateMode}
                                  >
                                    {TEMPLATE_MODE_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <Textarea className="min-h-[100px] font-mono text-xs" onChange={(event) => setRules((current) => current.map((item) => item.rowId === rule.rowId ? { ...item, body: event.target.value } : item))} placeholder='{"ok":true}' value={rule.body} />
                                <div className="rounded-[1rem] border border-border/70 bg-surface/55 px-3 py-3 text-[11px] leading-6 text-muted-foreground">
                                  {rule.templateMode === "mockjs"
                                    ? "动态模板支持示例：@guid、@email、@integer(1,10)、{\"items|3\":[{\"id\":\"@guid\"}]}"
                                    : "静态模式下 body 将原样返回。Delay ms 会在 Mock 网关和模拟器中同时生效。"}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

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

                    <Card className="rounded-[2rem] border-border/80 bg-card/84">
                      <CardContent className="space-y-4 p-6">
                        <div className="flex items-center gap-2">
                          <TestTube2 className="h-4 w-4 text-primary" />
                          <h3 className="text-lg font-semibold text-foreground">规则模拟器</h3>
                        </div>
                        <Textarea className="min-h-[90px] font-mono text-xs" onChange={(event) => setQueryText(event.target.value)} placeholder="status=ready" value={queryText} />
                        <Textarea className="min-h-[90px] font-mono text-xs" onChange={(event) => setHeaderText(event.target.value)} placeholder="x-env=qa" value={headerText} />
                        <Textarea className="min-h-[140px] font-mono text-xs" onChange={(event) => setBodySample(event.target.value)} placeholder='{"status":"ready"}' value={bodySample} />
                        <Button disabled={simulating} onClick={() => void handleSimulation()}>
                          {simulating ? "模拟中..." : "运行模拟"}
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="rounded-[2rem] border-border/80 bg-card/84">
                      <CardContent className="space-y-4 p-6">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <h3 className="text-lg font-semibold text-foreground">模拟结果</h3>
                        </div>

                        {!simulation ? <p className="text-sm text-muted-foreground">运行一次模拟后，可以看到命中的规则、来源和返回体。</p> : null}

                        {simulation ? (
                          <>
                            <div className="grid gap-3 md:grid-cols-4">
                              <div className="rounded-[1.2rem] bg-surface/70 px-4 py-4">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Source</p>
                                <p className="mt-2 text-sm font-semibold text-foreground">{simulation.source}</p>
                              </div>
                              <div className="rounded-[1.2rem] bg-surface/70 px-4 py-4">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Matched Rule</p>
                                <p className="mt-2 text-sm font-semibold text-foreground">{simulation.matchedRuleName || "fallback"}</p>
                              </div>
                              <div className="rounded-[1.2rem] bg-surface/70 px-4 py-4">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">HTTP Status</p>
                                <p className="mt-2 text-sm font-semibold text-foreground">{simulation.statusCode}</p>
                              </div>
                              <div className="rounded-[1.2rem] bg-surface/70 px-4 py-4">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Delay</p>
                                <p className="mt-2 text-sm font-semibold text-foreground">{simulation.delayMs} ms</p>
                              </div>
                            </div>
                            <pre className="scrollbar-thin max-h-[220px] overflow-auto rounded-[1.3rem] bg-background/70 p-4 text-[11px] text-foreground">{simulation.body}</pre>
                            <div className="space-y-2">
                              {simulation.ruleTraces.map((trace, index) => (
                                <div className="rounded-[1.2rem] border border-border bg-surface/55 px-4 py-3" key={`${trace.ruleName}-${index}`}>
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-semibold text-foreground">{trace.ruleName}</p>
                                    <Badge variant={trace.status === "matched" ? "success" : "outline"}>{trace.status}</Badge>
                                  </div>
                                  <p className="mt-2 text-xs text-muted-foreground">{trace.summary}</p>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : null}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            ) : (
              <Card className="rounded-[2rem] border-border/80 bg-card/84">
                <CardContent className="p-10 text-center text-sm text-muted-foreground">请选择一个接口，进入规则编辑和发布流。</CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ProjectConsoleLayout>
  );
}
