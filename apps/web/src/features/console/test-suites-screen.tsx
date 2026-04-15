"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  createTestSuite,
  createTestSuiteTrigger,
  deleteTestSuite,
  deleteTestSuiteTrigger,
  executeTestSuite,
  fetchEnvironments,
  fetchProject,
  fetchProjectTree,
  fetchTestDashboard,
  fetchTestExecution,
  fetchTestSuiteSchedule,
  fetchTestSuite,
  fetchTestSuiteTriggers,
  fetchTestSuites,
  replaceTestSuiteSteps,
  updateTestSuiteSchedule,
  updateTestSuite,
  type CreatedTestSuiteTrigger,
  type DebugHeader,
  type EnvironmentDetail,
  type ModuleTreeItem,
  type ProjectDetail,
  type TestAssertionItem,
  type TestDashboardDetail,
  type TestExecutionDetail,
  type TestExtractorItem,
  type TestSuiteScheduleDetail,
  type TestStepDetail,
  type TestStepUpsertItem,
  type TestSuiteDetail,
  type TestSuiteSummary,
  type TestSuiteTriggerSummary,
} from "@api-hub/api-sdk";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Clock3,
  Copy,
  FlaskConical,
  Gauge,
  KeyRound,
  Play,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";

import { Badge, MethodBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";

import { ProjectConsoleLayout } from "./project-console-layout";
import { AiTestCasePanel } from "./ai-test-case-panel";
import { flattenProjectTree } from "./tree-utils";

type TestSuitesScreenProps = { projectId: number };
type SuiteDraft = { name: string; description: string };
type EditableStep = {
  rowId: string;
  endpointId: number | null;
  environmentId: number | null;
  name: string;
  enabled: boolean;
  queryString: string;
  headersText: string;
  body: string;
  assertionsText: string;
  extractorsText: string;
  preScript: string;
  postScript: string;
};

type TriggerDraft = {
  name: string;
};

type ScheduleDraft = {
  enabled: boolean;
  intervalMinutes: string;
};

type ExecutionSourceFilter = "all" | "manual" | "trigger" | "schedule";

const EXTRACTOR_SOURCE_TYPES = [
  "body_json_path",
  "response_header",
  "response_status",
] as const;
const isExtractorSourceType = (
  value: string,
): value is TestExtractorItem["sourceType"] =>
  EXTRACTOR_SOURCE_TYPES.includes(
    value as (typeof EXTRACTOR_SOURCE_TYPES)[number],
  );
const id = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const statusVariant = (status?: string | null) =>
  status === "passed"
    ? "success"
    : status === "failed"
      ? "destructive"
      : status === "error"
        ? "warning"
        : "outline";
const statusLabel = (status?: string | null) =>
  status === "passed"
    ? "通过"
    : status === "failed"
      ? "失败"
      : status === "error"
        ? "异常"
        : "空闲";
const formatTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("zh-CN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "尚未运行";
const formatPercent = (value?: number | null) => `${(value ?? 0).toFixed(1)}%`;
const formatInterval = (value?: number | null) => {
  const minutes = value ?? 0;
  if (minutes >= 60 && minutes % 60 === 0) {
    return `每 ${minutes / 60} 小时`;
  }
  return `每 ${minutes} 分钟`;
};
const executionSourceLabel = (value?: string | null) =>
  value === "trigger"
    ? "触发器"
    : value === "schedule"
      ? "定时"
      : "手动";
const executionSourceVariant = (value?: string | null) =>
  value === "trigger"
    ? "warning"
    : value === "schedule"
      ? "outline"
      : "success";
const headersToText = (headers: DebugHeader[]) =>
  headers.map((header) => `${header.name}=${header.value}`).join("\n");
const extractorsToText = (extractors: TestExtractorItem[]) =>
  extractors
    .map(
      (extractor) =>
        `${extractor.variableName}|${extractor.sourceType}|${extractor.expression}`,
    )
    .join("\n");
const assertionsToText = (assertions: TestAssertionItem[]) =>
  assertions
    .map((assertion) =>
      assertion.expression?.trim()
        ? `${assertion.type}|${assertion.expression}|${assertion.expectedValue ?? ""}`
        : `${assertion.type}|${assertion.expectedValue ?? ""}`,
    )
    .join("\n");
const parseAssertions = (value: string): TestAssertionItem[] =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const parts = line.split("|").map((part) => part.trim());
      const type = parts[0] ?? "";
      if (!type) {
        return [];
      }
      if (
        [
          "json_path_equals",
          "json_path_exists",
          "json_path_not_empty",
        ].includes(type)
      ) {
        const expression = parts[1] ?? "";
        const expectedValue = parts.slice(2).join("|");
        return expression ? [{ type: type as TestAssertionItem["type"], expression, expectedValue }] : [];
      }
      const expectedValue = parts.slice(1).join("|");
      return expectedValue ? [{ type: type as TestAssertionItem["type"], expectedValue }] : [];
    });
const parseHeaders = (value: string): DebugHeader[] =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const index = line.indexOf("=");
      return index < 0
        ? { name: line, value: "" }
        : {
            name: line.slice(0, index).trim(),
            value: line.slice(index + 1).trim(),
          };
    })
    .filter((header) => header.name);
const parseExtractors = (value: string): TestExtractorItem[] =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const [variableName = "", sourceType = "", ...rest] = line.split("|");
      const normalizedSourceType = sourceType.trim();
      if (!isExtractorSourceType(normalizedSourceType)) {
        return [];
      }
      const expression = rest.join("|").trim();
      return variableName.trim() && expression
        ? [
            {
              variableName: variableName.trim(),
              sourceType: normalizedSourceType,
              expression,
            },
          ]
        : [];
    });

function fromStep(step: TestStepDetail): EditableStep {
  return {
    rowId: id(),
    endpointId: step.endpointId,
    environmentId: step.environmentId,
    name: step.name,
    enabled: step.enabled,
    queryString: step.queryString,
    headersText: headersToText(step.headers),
    body: step.body,
    assertionsText: assertionsToText(step.assertions),
    extractorsText: extractorsToText(step.extractors),
    preScript: step.preScript ?? "",
    postScript: step.postScript ?? "",
  };
}

export function TestSuitesScreen({ projectId }: TestSuitesScreenProps) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [modules, setModules] = useState<ModuleTreeItem[]>([]);
  const [environments, setEnvironments] = useState<EnvironmentDetail[]>([]);
  const [dashboard, setDashboard] = useState<TestDashboardDetail | null>(null);
  const [suites, setSuites] = useState<TestSuiteSummary[]>([]);
  const [selectedSuiteId, setSelectedSuiteId] = useState<number | null>(null);
  const [suiteDetail, setSuiteDetail] = useState<TestSuiteDetail | null>(null);
  const [suiteDraft, setSuiteDraft] = useState<SuiteDraft>({
    name: "",
    description: "",
  });
  const [triggerDraft, setTriggerDraft] = useState<TriggerDraft>({ name: "" });
  const [schedule, setSchedule] = useState<TestSuiteScheduleDetail | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft>({
    enabled: false,
    intervalMinutes: "60",
  });
  const [stepsDraft, setStepsDraft] = useState<EditableStep[]>([]);
  const [activeExecution, setActiveExecution] =
    useState<TestExecutionDetail | null>(null);
  const [triggers, setTriggers] = useState<TestSuiteTriggerSummary[]>([]);
  const [createdTrigger, setCreatedTrigger] =
    useState<CreatedTestSuiteTrigger | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [savingTrigger, setSavingTrigger] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [projectExecutionFilter, setProjectExecutionFilter] =
    useState<ExecutionSourceFilter>("all");
  const [suiteExecutionFilter, setSuiteExecutionFilter] =
    useState<ExecutionSourceFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const deferredSearch = useDeferredValue(search);
  const endpointEntries = useMemo(() => flattenProjectTree(modules), [modules]);
  const defaultEndpointId = endpointEntries[0]?.endpoint.id ?? null;
  const defaultEnvironmentId =
    environments.find((item) => item.isDefault)?.id ??
    environments[0]?.id ??
    null;
  const canEdit = project?.canWrite ?? false;
  const canRun =
    project?.currentUserRole != null && project.currentUserRole !== "viewer";

  const visibleSuites = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return query
      ? suites.filter((suite) =>
          `${suite.name} ${suite.description ?? ""}`
            .toLowerCase()
            .includes(query),
        )
      : suites;
  }, [deferredSearch, suites]);
  const dashboardMetrics = useMemo(
    () => [
      {
        label: "通过率",
        value: formatPercent(dashboard?.overview.passRate),
        hint: `${dashboard?.overview.passedExecutions ?? 0} 次通过执行`,
        icon: ShieldCheck,
      },
      {
        label: "执行次数",
        value: String(dashboard?.overview.totalExecutions ?? 0),
        hint: `${dashboard?.overview.failedExecutions ?? 0} 次失败 · ${dashboard?.overview.errorExecutions ?? 0} 次异常`,
        icon: BarChart3,
      },
      {
        label: "套件数",
        value: String(dashboard?.overview.totalSuites ?? 0),
        hint: `${dashboard?.overview.activeSuites ?? 0} 个含启用步骤`,
        icon: Gauge,
      },
      {
        label: "平均耗时",
        value: `${dashboard?.overview.averageDurationMs ?? 0} ms`,
        hint: "跨套件执行平均值",
        icon: Clock3,
      },
    ],
    [dashboard],
  );
  const filteredProjectExecutions = useMemo(() => {
    const executions = dashboard?.recentExecutions ?? [];
    return projectExecutionFilter === "all"
      ? executions
      : executions.filter(
          (execution) => execution.executionSource === projectExecutionFilter,
        );
  }, [dashboard?.recentExecutions, projectExecutionFilter]);
  const filteredSuiteExecutions = useMemo(() => {
    const executions = suiteDetail?.recentExecutions ?? [];
    return suiteExecutionFilter === "all"
      ? executions
      : executions.filter(
          (execution) => execution.executionSource === suiteExecutionFilter,
        );
  }, [suiteDetail?.recentExecutions, suiteExecutionFilter]);
  const publicTriggerUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return "/api/public/test-suite-triggers/execute";
    }
    return `${window.location.origin}/api/public/test-suite-triggers/execute`;
  }, []);
  const createdTriggerCurl = useMemo(() => {
    if (!createdTrigger) {
      return "";
    }
    return `curl -X POST "${publicTriggerUrl}" \\\n  -H "X-ApiHub-Trigger-Token: ${createdTrigger.token}"`;
  }, [createdTrigger, publicTriggerUrl]);
  const ciTriggerToken = createdTrigger?.token ?? "<replace-with-trigger-token>";
  const githubActionsSnippet = useMemo(
    () =>
      `jobs:\n  api_smoke:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Trigger ApiHub suite\n        run: |\n          curl --fail-with-body -X POST "${publicTriggerUrl}" \\\n            -H "X-ApiHub-Trigger-Token: ${ciTriggerToken}"`,
    [ciTriggerToken, publicTriggerUrl],
  );
  const jenkinsSnippet = useMemo(
    () =>
      `stage('ApiHub Suite') {\n  steps {\n    sh '''\n      curl --fail-with-body -X POST "${publicTriggerUrl}" \\\n        -H "X-ApiHub-Trigger-Token: ${ciTriggerToken}"\n    '''\n  }\n}`,
    [ciTriggerToken, publicTriggerUrl],
  );

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      setLoading(true);
      try {
        const [
          projectResponse,
          treeResponse,
          environmentsResponse,
          dashboardResponse,
          suitesResponse,
        ] = await Promise.all([
          fetchProject(projectId),
          fetchProjectTree(projectId),
          fetchEnvironments(projectId),
          fetchTestDashboard(projectId),
          fetchTestSuites(projectId),
        ]);
        if (!mounted) return;
        setProject(projectResponse.data);
        setModules(treeResponse.data.modules);
        setEnvironments(environmentsResponse.data);
        setDashboard(dashboardResponse.data);
        setSuites(suitesResponse.data);
        setSelectedSuiteId(suitesResponse.data[0]?.id ?? null);
      } catch (loadError) {
        if (mounted)
          setError(
            loadError instanceof Error
              ? loadError.message
              : "加载测试套件失败。",
          );
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void bootstrap();
    return () => {
      mounted = false;
    };
  }, [projectId]);

  useEffect(() => {
    if (!selectedSuiteId) {
      setSuiteDetail(null);
      setStepsDraft([]);
      setActiveExecution(null);
      setTriggers([]);
      setSchedule(null);
      setScheduleDraft({ enabled: false, intervalMinutes: "60" });
      setCreatedTrigger(null);
      return;
    }
    const suiteId = selectedSuiteId;
    let mounted = true;
    async function loadDetail() {
      setLoadingDetail(true);
      try {
        const [response, triggerResponse, scheduleResponse] = await Promise.all([
          fetchTestSuite(projectId, suiteId),
          fetchTestSuiteTriggers(projectId, suiteId),
          fetchTestSuiteSchedule(projectId, suiteId),
        ]);
        if (!mounted) return;
        setSuiteDetail(response.data);
        setTriggers(triggerResponse.data);
        setSchedule(scheduleResponse.data);
        setScheduleDraft({
          enabled: scheduleResponse.data.enabled,
          intervalMinutes: String(scheduleResponse.data.intervalMinutes || 60),
        });
        setCreatedTrigger(null);
        setSuiteDraft({
          name: response.data.name,
          description: response.data.description ?? "",
        });
        setStepsDraft(response.data.steps.map(fromStep));
        const executionId = response.data.recentExecutions[0]?.id;
        setActiveExecution(
          executionId
            ? (await fetchTestExecution(projectId, executionId)).data
            : null,
        );
      } catch (detailError) {
        if (mounted)
          setError(
            detailError instanceof Error
              ? detailError.message
              : "加载套件详情失败。",
          );
      } finally {
        if (mounted) setLoadingDetail(false);
      }
    }
    void loadDetail();
    return () => {
      mounted = false;
    };
  }, [projectId, selectedSuiteId]);

  async function refreshSuites(preferredSuiteId?: number | null) {
    const response = await fetchTestSuites(projectId);
    setSuites(response.data);
    setSelectedSuiteId(
      preferredSuiteId &&
        response.data.some((suite) => suite.id === preferredSuiteId)
        ? preferredSuiteId
        : (response.data[0]?.id ?? null),
    );
  }

  async function refreshDashboard() {
    const response = await fetchTestDashboard(projectId);
    setDashboard(response.data);
  }

  async function refreshTriggers(suiteId: number) {
    const response = await fetchTestSuiteTriggers(projectId, suiteId);
    setTriggers(response.data);
  }

  async function refreshSchedule(suiteId: number) {
    const response = await fetchTestSuiteSchedule(projectId, suiteId);
    setSchedule(response.data);
    setScheduleDraft({
      enabled: response.data.enabled,
      intervalMinutes: String(response.data.intervalMinutes || 60),
    });
  }

  async function handleCreateTrigger() {
    if (!canEdit || !selectedSuiteId) return;
    const name = triggerDraft.name.trim();
    if (!name) {
      setError("请输入触发器名称。");
      return;
    }
    setSavingTrigger(true);
    setError(null);
    setMessage(null);
    try {
      const response = await createTestSuiteTrigger(projectId, selectedSuiteId, {
        name,
      });
      setCreatedTrigger(response.data);
      setTriggerDraft({ name: "" });
      await refreshTriggers(selectedSuiteId);
      setMessage("触发器已创建。");
    } catch (triggerError) {
      setError(
        triggerError instanceof Error
          ? triggerError.message
          : "创建触发器失败。",
      );
    } finally {
      setSavingTrigger(false);
    }
  }

  async function handleDeleteTrigger(triggerId: number) {
    if (!canEdit || !selectedSuiteId) return;
    setSavingTrigger(true);
    setError(null);
    setMessage(null);
    try {
      await deleteTestSuiteTrigger(projectId, selectedSuiteId, triggerId);
      if (createdTrigger?.trigger.id === triggerId) {
        setCreatedTrigger(null);
      }
      await refreshTriggers(selectedSuiteId);
      setMessage("触发器已删除。");
    } catch (triggerError) {
      setError(
        triggerError instanceof Error
          ? triggerError.message
          : "删除触发器失败。",
      );
    } finally {
      setSavingTrigger(false);
    }
  }

  async function handleSaveSchedule() {
    if (!canEdit || !selectedSuiteId) return;
    const intervalMinutes = Number(scheduleDraft.intervalMinutes);
    if (!Number.isInteger(intervalMinutes) || intervalMinutes < 5) {
      setError("调度间隔不能小于 5 分钟。");
      return;
    }
    setSavingSchedule(true);
    setError(null);
    setMessage(null);
    try {
      await updateTestSuiteSchedule(projectId, selectedSuiteId, {
        enabled: scheduleDraft.enabled,
        intervalMinutes,
      });
      await refreshSchedule(selectedSuiteId);
      setMessage("调度已更新。");
    } catch (scheduleError) {
      setError(
        scheduleError instanceof Error
          ? scheduleError.message
          : "更新调度失败。",
      );
    } finally {
      setSavingSchedule(false);
    }
  }

  async function handleCopy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(`${label}已复制。`);
    } catch {
      setError(`${label}复制失败。`);
    }
  }

  function updateStep(rowId: string, patch: Partial<EditableStep>) {
    setStepsDraft((current) =>
      current.map((step) =>
        step.rowId === rowId ? { ...step, ...patch } : step,
      ),
    );
  }

  function moveStep(rowId: string, offset: -1 | 1) {
    setStepsDraft((current) => {
      const index = current.findIndex((step) => step.rowId === rowId);
      const nextIndex = index + offset;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length)
        return current;
      const copy = [...current];
      [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
      return copy;
    });
  }

  function appendSuggestedCases(cases: TestStepUpsertItem[]) {
    setStepsDraft((current) => [
      ...current,
      ...cases.map((item) => ({
        rowId: id(),
        endpointId: item.endpointId,
        environmentId: item.environmentId,
        name: item.name,
        enabled: item.enabled,
        queryString: item.queryString,
        headersText: headersToText(item.headers),
        body: item.body,
        assertionsText: assertionsToText(item.assertions),
        extractorsText: extractorsToText(item.extractors),
        preScript: item.preScript,
        postScript: item.postScript,
      })),
    ]);
    setMessage(`已导入 ${cases.length} 条 AI 推荐步骤`);
  }

  async function handleCreateSuite() {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await createTestSuite(projectId, {
        name: `套件 ${suites.length + 1}`,
        description: "串行冒烟流程",
      });
      await refreshDashboard();
      await refreshSuites(response.data.id);
      setMessage("测试套件已创建。");
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "创建测试套件失败。",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSuite() {
    if (!canEdit || !selectedSuiteId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateTestSuite(projectId, selectedSuiteId, suiteDraft);
      const payload = stepsDraft
        .map((step) =>
          step.endpointId && step.environmentId
            ? {
                endpointId: step.endpointId,
                environmentId: step.environmentId,
                name: step.name.trim(),
                enabled: step.enabled,
                queryString: step.queryString,
                headers: parseHeaders(step.headersText),
                body: step.body,
                preScript: step.preScript,
                postScript: step.postScript,
                assertions: parseAssertions(step.assertionsText),
                extractors: parseExtractors(step.extractorsText),
              }
            : null,
        )
        .filter((item): item is TestStepUpsertItem => item != null);
      const detailResponse = await replaceTestSuiteSteps(
        projectId,
        selectedSuiteId,
        payload,
      );
      setSuiteDetail(detailResponse.data);
      setStepsDraft(detailResponse.data.steps.map(fromStep));
      await refreshDashboard();
      await refreshSuites(selectedSuiteId);
      setMessage("测试套件已保存。");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "保存测试套件失败。",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSuite() {
    if (!canEdit || !selectedSuiteId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await deleteTestSuite(projectId, selectedSuiteId);
      await refreshDashboard();
      await refreshSuites(null);
      setMessage("测试套件已删除。");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "删除测试套件失败。",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRunSuite() {
    if (!selectedSuiteId || !canRun) return;
    setRunning(true);
    setError(null);
    setMessage(null);
    try {
      const execution = (await executeTestSuite(projectId, selectedSuiteId))
        .data;
      setActiveExecution(execution);
      await refreshDashboard();
      await refreshSuites(selectedSuiteId);
      const detailResponse = await fetchTestSuite(projectId, selectedSuiteId);
      setSuiteDetail(detailResponse.data);
      setMessage(
        `运行完成：${execution.passedSteps}/${execution.totalSteps} 步通过。`,
      );
    } catch (runError) {
      setError(
        runError instanceof Error
          ? runError.message
          : "执行测试套件失败。",
      );
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return (
      <ProjectConsoleLayout
        description=""
        projectId={projectId}
        title="测试套件"
      >
        <div className="rounded-[1.8rem] border border-border bg-card/72 p-8 text-center text-sm text-muted-foreground">
          正在加载测试套件工作台...
        </div>
      </ProjectConsoleLayout>
    );
  }

  return (
    <ProjectConsoleLayout
      description=""
      projectId={projectId}
      title="测试套件"
    >
      <div className="space-y-6">
        {error ? (
          <div className="rounded-[1.6rem] border border-destructive/20 bg-destructive/10 px-5 py-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="rounded-[1.6rem] border border-success/20 bg-success/10 px-5 py-4 text-sm text-success">
            {message}
          </div>
        ) : null}
        {dashboard ? (
          <Card className="overflow-hidden rounded-[2.2rem] border-border/80 bg-[radial-gradient(circle_at_top_left,rgba(202,138,4,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(28,25,23,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.9),rgba(250,250,249,0.78))] shadow-[0_32px_120px_rgba(28,25,23,0.14)]">
            <CardContent className="space-y-6 p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                    项目总览
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold text-foreground">
                    测试运行概览
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    在一个面板里查看整项目的执行健康度，快速发现不稳定套件，并定位到最近一次失败运行。
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-medium text-primary">
                  <Zap className="h-3.5 w-3.5" />
                  项目级实时信号
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-4">
                {dashboardMetrics.map((metric) => {
                  const Icon = metric.icon;
                  return (
                    <div
                      className="rounded-[1.6rem] border border-white/60 bg-white/70 p-4 backdrop-blur"
                      key={metric.label}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          {metric.label}
                        </p>
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <p className="mt-4 text-3xl font-semibold text-foreground">
                        {metric.value}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {metric.hint}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
                <div className="rounded-[1.8rem] border border-white/60 bg-white/72 p-5 backdrop-blur">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        最近执行
                      </p>
                      <p className="mt-2 text-lg font-semibold text-foreground">
                        全项目运行流
                      </p>
                    </div>
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="mb-4 flex flex-wrap gap-2">
                      {(
                        [
                          "all",
                          "manual",
                          "trigger",
                          "schedule",
                        ] as ExecutionSourceFilter[]
                      ).map((filter) => (
                        <button
                          className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-smooth ${projectExecutionFilter === filter ? "border-primary/30 bg-primary/10 text-primary" : "border-border/70 bg-background/60 text-muted-foreground hover:border-primary/20 hover:text-foreground"}`}
                          key={filter}
                          onClick={() => setProjectExecutionFilter(filter)}
                          type="button"
                        >
                          {filter === "all"
                            ? "全部"
                            : executionSourceLabel(filter)}
                        </button>
                      ))}
                    </div>
                    {filteredProjectExecutions.length ? (
                      filteredProjectExecutions.map((execution) => (
                        <button
                          className="w-full rounded-[1.3rem] border border-border/70 bg-background/70 px-4 py-3 text-left transition-smooth hover:border-primary/25 hover:bg-primary/5"
                          key={execution.executionId}
                          onClick={() => {
                            setSelectedSuiteId(execution.suiteId);
                            void fetchTestExecution(
                              projectId,
                              execution.executionId,
                            ).then((response) =>
                              setActiveExecution(response.data),
                            );
                          }}
                          type="button"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {execution.suiteName}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatTime(execution.executedAt)}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant={executionSourceVariant(
                                  execution.executionSource,
                                )}
                              >
                                {executionSourceLabel(execution.executionSource)}
                              </Badge>
                              <Badge variant={statusVariant(execution.status)}>
                                {statusLabel(execution.status)}
                              </Badge>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span>
                              {execution.passedSteps}/{execution.totalSteps}{" "}
                              通过
                            </span>
                            <span>{execution.durationMs} ms</span>
                            <span>套件 #{execution.suiteId}</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-[1.4rem] border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                        当前筛选条件下暂无执行记录。
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[1.8rem] border border-white/60 bg-white/72 p-5 backdrop-blur">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        套件健康度
                      </p>
                      <p className="mt-2 text-lg font-semibold text-foreground">
                        稳定性排行
                      </p>
                    </div>
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div className="mt-4 space-y-3">
                    {dashboard.suiteHealth.length ? (
                      dashboard.suiteHealth.map((suite) => (
                        <button
                          className="w-full rounded-[1.35rem] border border-border/70 bg-background/70 px-4 py-4 text-left transition-smooth hover:border-primary/25 hover:bg-primary/5"
                          key={suite.suiteId}
                          onClick={() => setSelectedSuiteId(suite.suiteId)}
                          type="button"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {suite.suiteName}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {suite.enabledSteps}/{suite.totalSteps} 已启用
                                · {suite.totalRuns} 次运行
                              </p>
                            </div>
                            <Badge
                              variant={statusVariant(suite.lastExecutionStatus)}
                            >
                              {statusLabel(suite.lastExecutionStatus)}
                            </Badge>
                          </div>
                          <div className="mt-4 h-2 overflow-hidden rounded-full bg-primary/10">
                            <div
                              className="h-full rounded-full bg-primary transition-[width] duration-500"
                              style={{
                                width: `${Math.max(suite.passRate, 6)}%`,
                              }}
                            />
                          </div>
                          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {formatPercent(suite.passRate)} 通过率
                            </span>
                            <span>{suite.averageDurationMs} ms 平均</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-[1.4rem] border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                        首次运行后会展示套件健康度。
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="rounded-[2rem] border-border/80 bg-card/84">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    套件列表
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-foreground">
                    {suites.length} 个套件
                  </h2>
                </div>
                <FlaskConical className="h-5 w-5 text-primary" />
              </div>
              <Input
                className="mt-4"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索套件"
                value={search}
              />
              <div className="mt-5 space-y-3">
                {visibleSuites.map((suite) => (
                  <button
                    className={`w-full rounded-[1.4rem] border px-4 py-4 text-left transition-smooth ${selectedSuiteId === suite.id ? "border-primary/30 bg-primary/10" : "border-border bg-surface/60 hover:border-primary/20"}`}
                    key={suite.id}
                    onClick={() => setSelectedSuiteId(suite.id)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {suite.name}
                        </p>
                        {suite.lastExecutionSource ? (
                          <div className="mt-2">
                            <Badge
                              variant={executionSourceVariant(
                                suite.lastExecutionSource,
                              )}
                            >
                              {executionSourceLabel(suite.lastExecutionSource)}
                            </Badge>
                          </div>
                        ) : null}
                      </div>
                      <Badge variant={statusVariant(suite.lastExecutionStatus)}>
                        {statusLabel(suite.lastExecutionStatus)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {suite.enabledSteps}/{suite.totalSteps} 已启用 ·{" "}
                      {formatTime(suite.lastExecutedAt)}
                    </p>
                  </button>
                ))}
              </div>
              {canEdit ? (
                <Button
                  className="mt-5 w-full"
                  disabled={saving}
                  onClick={() => void handleCreateSuite()}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  新建套件
                </Button>
              ) : null}
            </CardContent>
          </Card>
          <div className="space-y-6">
            {loadingDetail || !suiteDetail ? (
                <div className="rounded-[1.8rem] border border-border bg-card/72 p-8 text-center text-sm text-muted-foreground">
                  {loadingDetail
                    ? "正在加载套件详情..."
                    : "请先选择一个测试套件。"}
                </div>
            ) : (
              <>
                <Card className="gradient-hero-bg rounded-[2rem] border-border/80 bg-card/84">
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <Badge
                          variant={statusVariant(
                            activeExecution?.status ??
                              suiteDetail.recentExecutions[0]?.status,
                          )}
                        >
                          {statusLabel(
                            activeExecution?.status ??
                              suiteDetail.recentExecutions[0]?.status,
                          )}
                        </Badge>
                        <div className="mt-3">
                          <Badge
                            variant={executionSourceVariant(
                              activeExecution?.executionSource ??
                                suiteDetail.recentExecutions[0]?.executionSource,
                            )}
                          >
                            {executionSourceLabel(
                              activeExecution?.executionSource ??
                                suiteDetail.recentExecutions[0]?.executionSource,
                            )}
                          </Badge>
                        </div>
                        <h2 className="mt-4 text-3xl font-semibold text-foreground">
                          {suiteDraft.name || suiteDetail.name}
                        </h2>
                        <p className="mt-3 text-sm text-muted-foreground">
                          {suiteDraft.description ||
                            "说明这个测试套件负责验证什么。"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          disabled={!canRun || running}
                          onClick={() => void handleRunSuite()}
                          variant="premium"
                        >
                          <Play className="mr-1.5 h-3.5 w-3.5" />
                          {running ? "运行中..." : "运行套件"}
                        </Button>
                        {canEdit ? (
                          <Button
                            disabled={saving}
                            onClick={() => void handleSaveSuite()}
                            variant="outline"
                          >
                            <Save className="mr-1.5 h-3.5 w-3.5" />
                            保存
                          </Button>
                        ) : null}
                        {canEdit ? (
                          <Button
                            disabled={saving}
                            onClick={() => void handleDeleteSuite()}
                            variant="outline"
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            删除
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <div className="grid gap-4 lg:grid-cols-3">
                  <Card className="rounded-[1.6rem] border-border/80 bg-card/84">
                    <CardContent className="p-5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        通过
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {activeExecution?.passedSteps ?? 0}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-[1.6rem] border-border/80 bg-card/84">
                    <CardContent className="p-5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        失败
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {activeExecution?.failedSteps ?? 0}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-[1.6rem] border-border/80 bg-card/84">
                    <CardContent className="p-5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        耗时
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {activeExecution?.durationMs ?? 0} ms
                      </p>
                    </CardContent>
                  </Card>
                </div>
                <Card className="rounded-[2rem] border-border/80 bg-card/84">
                  <CardContent className="space-y-5 p-6">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          触发器控制台
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold text-foreground">
                          Webhook / CI 运行入口
                        </h3>
                        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                          为每个测试套件签发独立触发令牌，可用于 GitHub Actions、Jenkins 或其他 Webhook 调用方。令牌只会在创建时展示一次。
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-medium text-primary">
                        <KeyRound className="h-3.5 w-3.5" />
                        公开入口由密钥令牌保护
                      </div>
                    </div>

                    {createdTrigger ? (
                      <div className="rounded-[1.6rem] border border-primary/20 bg-[linear-gradient(180deg,rgba(202,138,4,0.12),rgba(202,138,4,0.04))] p-5">
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              已为 {createdTrigger.trigger.name} 签发新令牌
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              请立即复制。为保证安全，原始令牌在这条提示消失后不会再次展示。
                            </p>
                          </div>
                            <Button
                              onClick={() =>
                                void handleCopy(createdTrigger.token, "触发器令牌")
                              }
                            size="sm"
                            variant="outline"
                          >
                            <Copy className="mr-1.5 h-3.5 w-3.5" />
                            复制令牌
                          </Button>
                        </div>
                        <Input
                          className="mt-4 font-mono text-xs"
                          readOnly
                          value={createdTrigger.token}
                        />
                        <Textarea
                          className="mt-3 min-h-[92px] font-mono text-xs"
                          readOnly
                          value={createdTriggerCurl}
                        />
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              onClick={() =>
                                void handleCopy(createdTriggerCurl, "cURL 命令")
                              }
                            size="sm"
                            variant="outline"
                          >
                            <Copy className="mr-1.5 h-3.5 w-3.5" />
                            复制 cURL
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.84fr)_minmax(0,1.16fr)]">
                      <div className="rounded-[1.5rem] border border-border/70 bg-background/40 p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          签发新触发器
                        </p>
                        <Input
                          className="mt-3"
                          disabled={!canEdit || savingTrigger}
                          onChange={(event) =>
                            setTriggerDraft({ name: event.target.value })
                          }
                          placeholder="夜间回归"
                          value={triggerDraft.name}
                        />
                        <div className="mt-3 flex gap-2">
                          <Button
                            disabled={!canEdit || savingTrigger}
                            onClick={() => void handleCreateTrigger()}
                            size="sm"
                          >
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            {savingTrigger ? "签发中..." : "创建触发器"}
                          </Button>
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                          触发地址：{" "}
                          <span className="font-mono text-foreground">
                            POST /api/public/test-suite-triggers/execute
                          </span>
                        </p>
                      </div>

                      <div className="rounded-[1.5rem] border border-border/70 bg-background/40 p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          已激活触发器
                        </p>
                        <div className="mt-3 space-y-3">
                          {triggers.length ? (
                            triggers.map((trigger) => (
                              <div
                                className="rounded-[1.25rem] border border-border/70 bg-card/70 p-4"
                                key={trigger.id}
                              >
                                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-semibold text-foreground">
                                        {trigger.name}
                                      </p>
                                      <Badge variant="outline">
                                        {trigger.tokenPrefix}
                                      </Badge>
                                    </div>
                                    <p className="mt-2 text-xs text-muted-foreground">
                                      创建于 {formatTime(trigger.createdAt)} · 上次触发{" "}
                                      {formatTime(trigger.lastTriggeredAt)}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      最近执行：{" "}
                                      {trigger.lastExecutionStatus
                                        ? `${formatTime(trigger.lastExecutedAt)} · ${statusLabel(trigger.lastExecutionStatus)}`
                                        : "尚无执行记录"}
                                    </p>
                                  </div>
                                  {canEdit ? (
                                    <Button
                                      disabled={savingTrigger}
                                      onClick={() =>
                                        void handleDeleteTrigger(trigger.id)
                                      }
                                      size="sm"
                                      variant="outline"
                                    >
                                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                      吊销
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-[1.25rem] border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                              暂无触发器令牌。
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <div className="rounded-[1.6rem] border border-border/70 bg-[linear-gradient(180deg,rgba(30,64,175,0.08),rgba(255,255,255,0.02))] p-5">
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                              定时运行
                            </p>
                            <h4 className="mt-2 text-lg font-semibold text-foreground">
                              轮询式周期执行
                            </h4>
                            <p className="mt-2 text-sm text-muted-foreground">
                              让单个套件按固定频率执行，适合冒烟巡检、预发布监控或回归循环。
                            </p>
                          </div>
                          <Badge variant={schedule?.enabled ? "success" : "outline"}>
                            {schedule?.enabled
                              ? formatInterval(schedule.intervalMinutes)
                              : "已关闭"}
                          </Badge>
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                          <div className="rounded-[1.3rem] border border-white/60 bg-white/70 p-4">
                            <label className="flex items-center gap-3 text-sm font-medium text-foreground">
                              <input
                                checked={scheduleDraft.enabled}
                                className="h-4 w-4 rounded border-border accent-[hsl(var(--primary))]"
                                disabled={!canEdit || savingSchedule}
                                onChange={(event) =>
                                  setScheduleDraft((current) => ({
                                    ...current,
                                    enabled: event.target.checked,
                                  }))
                                }
                                type="checkbox"
                              />
                              启用周期调度
                            </label>

                            <div className="mt-4">
                              <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                间隔分钟
                              </p>
                              <Input
                                disabled={!canEdit || savingSchedule}
                                min={5}
                                onChange={(event) =>
                                  setScheduleDraft((current) => ({
                                    ...current,
                                    intervalMinutes: event.target.value,
                                  }))
                                }
                                step={5}
                                type="number"
                                value={scheduleDraft.intervalMinutes}
                              />
                            </div>

                            <Button
                              className="mt-4"
                              disabled={!canEdit || savingSchedule}
                              onClick={() => void handleSaveSchedule()}
                              size="sm"
                            >
                              <Save className="mr-1.5 h-3.5 w-3.5" />
                              {savingSchedule ? "保存中..." : "保存调度"}
                            </Button>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[1.3rem] border border-border/70 bg-background/60 p-4">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">下次运行</p>
                              <p className="mt-3 text-base font-semibold text-foreground">
                                {schedule?.enabled
                                  ? formatTime(schedule.nextRunAt)
                                  : "未安排"}
                              </p>
                              <p className="mt-2 text-xs text-muted-foreground">
                                当轮询器占用下一次执行槽位后，这里会自动更新。
                              </p>
                            </div>

                            <div className="rounded-[1.3rem] border border-border/70 bg-background/60 p-4">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                最近一次定时运行
                              </p>
                              <p className="mt-3 text-base font-semibold text-foreground">
                                {formatTime(schedule?.lastRunAt)}
                              </p>
                              <p className="mt-2 text-xs text-muted-foreground">
                                执行结果{" "}
                                {schedule?.lastExecutionStatus
                                  ? statusLabel(schedule.lastExecutionStatus)
                                  : "暂无"}
                                .
                              </p>
                            </div>

                            <div className="rounded-[1.3rem] border border-border/70 bg-background/60 p-4 sm:col-span-2">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                约束说明
                              </p>
                              <p className="mt-3 text-sm text-muted-foreground">
                                最小频率为 5 分钟。当前是应用内轻量轮询器，更适合持续冒烟检查，不替代完整的 Cron 编排。
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[1.6rem] border border-border/70 bg-[linear-gradient(180deg,rgba(245,158,11,0.12),rgba(255,255,255,0.02))] p-5">
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                              CI 接入片段
                            </p>
                            <h4 className="mt-2 text-lg font-semibold text-foreground">
                              GitHub Actions / Jenkins 示例
                            </h4>
                            <p className="mt-2 text-sm text-muted-foreground">
                              在流水线中调用公开触发地址即可。已有触发器默认只展示前缀，因此如果不是刚签发新令牌，示例里会使用占位值。
                            </p>
                          </div>
                          <Badge variant={createdTrigger ? "success" : "outline"}>
                            {createdTrigger ? "已绑定真实令牌" : "占位令牌"}
                          </Badge>
                        </div>

                        <div className="mt-5 space-y-4">
                          <div className="rounded-[1.3rem] border border-border/70 bg-background/60 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-foreground">
                                GitHub Actions
                              </p>
                              <Button
                                onClick={() =>
                                  void handleCopy(
                                    githubActionsSnippet,
                                    "GitHub Actions 片段",
                                  )
                                }
                                size="sm"
                                variant="outline"
                              >
                                <Copy className="mr-1.5 h-3.5 w-3.5" />
                                复制
                              </Button>
                            </div>
                            <Textarea
                              className="mt-3 min-h-[132px] font-mono text-xs"
                              readOnly
                              value={githubActionsSnippet}
                            />
                          </div>

                          <div className="rounded-[1.3rem] border border-border/70 bg-background/60 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-foreground">
                                  Jenkins 流水线
                                </p>
                              <Button
                                onClick={() =>
                                  void handleCopy(jenkinsSnippet, "Jenkins 片段")
                                }
                                size="sm"
                                variant="outline"
                              >
                                <Copy className="mr-1.5 h-3.5 w-3.5" />
                                复制
                              </Button>
                            </div>
                            <Textarea
                              className="mt-3 min-h-[132px] font-mono text-xs"
                              readOnly
                              value={jenkinsSnippet}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-[2rem] border-border/80 bg-card/84">
                  <CardContent className="space-y-4 p-6">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
                      <div>
                        <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          套件名称
                        </p>
                        <Input
                          disabled={!canEdit}
                          onChange={(event) =>
                            setSuiteDraft((current) => ({
                              ...current,
                              name: event.target.value,
                            }))
                          }
                          value={suiteDraft.name}
                        />
                      </div>
                      <div>
                        <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          描述
                        </p>
                        <Textarea
                          className="min-h-[96px]"
                          disabled={!canEdit}
                          onChange={(event) =>
                            setSuiteDraft((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                          value={suiteDraft.description}
                        />
                      </div>
                    </div>
                    {canEdit ? (
                      <Button
                        onClick={() =>
                          setStepsDraft((current) => [
                            ...current,
                            {
                              rowId: id(),
                              endpointId: defaultEndpointId,
                              environmentId: defaultEnvironmentId,
                              name: "",
                              enabled: true,
                              queryString: "",
                              headersText: "",
                              body: "{}",
                              assertionsText: "status_equals|200",
                              extractorsText: "",
                              preScript: "",
                              postScript: "",
                            },
                          ])
                        }
                        size="sm"
                        variant="outline"
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        添加步骤
                      </Button>
                    ) : null}
                    {canEdit ? (
                      <AiTestCasePanel
                        modules={modules}
                        environments={environments}
                        defaultEnvironmentId={defaultEnvironmentId}
                        onImportCases={appendSuggestedCases}
                      />
                    ) : null}
                    <div className="space-y-4">
                      {stepsDraft.map((step, index) => (
                        <div
                          className="rounded-[1.8rem] border border-border/80 bg-[radial-gradient(circle_at_top_left,rgba(202,138,4,0.12),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0))] p-5 shadow-[0_24px_80px_rgba(28,25,23,0.08)]"
                          key={step.rowId}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                {index + 1}
                              </div>
                              <div>
                                <Input
                                  className="w-[240px]"
                                  disabled={!canEdit}
                                  onChange={(event) =>
                                    updateStep(step.rowId, {
                                      name: event.target.value,
                                    })
                                  }
                                  placeholder={`步骤 ${index + 1}`}
                                  value={step.name}
                                />
                                <label className="mt-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                  <input
                                    checked={step.enabled}
                                    className="h-3.5 w-3.5 rounded border-border accent-[hsl(var(--primary))]"
                                    disabled={!canEdit}
                                    onChange={(event) =>
                                      updateStep(step.rowId, {
                                        enabled: event.target.checked,
                                      })
                                    }
                                    type="checkbox"
                                  />
                                  参与套件运行
                                </label>
                              </div>
                            </div>
                            {canEdit ? (
                              <div className="flex gap-2">
                                <Button
                                  disabled={index === 0}
                                  onClick={() => moveStep(step.rowId, -1)}
                                  size="icon-sm"
                                  variant="outline"
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  disabled={index === stepsDraft.length - 1}
                                  onClick={() => moveStep(step.rowId, 1)}
                                  size="icon-sm"
                                  variant="outline"
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  onClick={() =>
                                    setStepsDraft((current) =>
                                      current.filter(
                                        (item) => item.rowId !== step.rowId,
                                      ),
                                    )
                                  }
                                  size="icon-sm"
                                  variant="outline"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : null}
                          </div>
                          <div className="mt-4 grid gap-4 lg:grid-cols-2">
                            <Select
                              disabled={!canEdit}
                              onChange={(event) =>
                                updateStep(step.rowId, {
                                  endpointId:
                                    Number(event.target.value) || null,
                                })
                              }
                              value={step.endpointId ?? ""}
                            >
                              <option value="">选择接口</option>
                              {endpointEntries.map((entry) => (
                                <option
                                  key={entry.endpoint.id}
                                  value={entry.endpoint.id}
                                >
                                  {entry.endpoint.method} {entry.endpoint.path}
                                </option>
                              ))}
                            </Select>
                            <Select
                              disabled={!canEdit}
                              onChange={(event) =>
                                updateStep(step.rowId, {
                                  environmentId:
                                    Number(event.target.value) || null,
                                })
                              }
                              value={step.environmentId ?? ""}
                            >
                              <option value="">选择环境</option>
                              {environments.map((environment) => (
                                <option
                                  key={environment.id}
                                  value={environment.id}
                                >
                                  {environment.name}
                                </option>
                              ))}
                            </Select>
                          </div>
                          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)]">
                            <div className="space-y-3">
                              <div className="rounded-[1.5rem] border border-border/70 bg-background/40 p-3">
                                <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                  请求体
                                </p>
                                <Textarea
                                  className="min-h-[160px] border-0 bg-transparent p-0 font-mono text-xs shadow-none focus-visible:ring-0"
                                  disabled={!canEdit}
                                  onChange={(event) =>
                                    updateStep(step.rowId, {
                                      body: event.target.value,
                                    })
                                  }
                                  value={step.body}
                                />
                              </div>
                              <div className="rounded-[1.5rem] border border-border/70 bg-background/40 p-3">
                                <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                  请求头
                                </p>
                                <Textarea
                                  className="min-h-[112px] border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                                  disabled={!canEdit}
                                  onChange={(event) =>
                                    updateStep(step.rowId, {
                                      headersText: event.target.value,
                                    })
                                  }
                                  placeholder={
                                    "Authorization=Bearer {{token}}\nX-Trace-Id=suite-run"
                                  }
                                  value={step.headersText}
                                />
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div className="rounded-[1.5rem] border border-border/70 bg-background/40 p-3">
                                <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                  运行控制
                                </p>
                                <div className="space-y-3">
                                  <Input
                                    disabled={!canEdit}
                                    onChange={(event) =>
                                      updateStep(step.rowId, {
                                        queryString: event.target.value,
                                      })
                                    }
                                    placeholder="id=1001&tenant={{tenantId}}"
                                    value={step.queryString}
                                  />
                                  <Input
                                    disabled={!canEdit}
                                    onChange={(event) =>
                                      updateStep(step.rowId, {
                                        assertionsText: event.target.value,
                                      })
                                    }
                                    placeholder="期望状态码"
                                    value={step.assertionsText}
                                  />
                                  <Textarea
                                    className="min-h-[96px]"
                                    disabled={!canEdit}
                                    onChange={(event) =>
                                      updateStep(step.rowId, {
                                        assertionsText: event.target.value,
                                      })
                                    }
                                    placeholder="响应体包含内容..."
                                    value={step.assertionsText}
                                  />
                                </div>
                              </div>
                              <div className="rounded-[1.5rem] border border-border/70 bg-background/40 p-3">
                                <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                  前置脚本
                                </p>
                                <Textarea
                                  className="min-h-[120px] border-0 bg-transparent p-0 font-mono text-xs shadow-none focus-visible:ring-0"
                                  disabled={!canEdit}
                                  onChange={(event) =>
                                    updateStep(step.rowId, {
                                      preScript: event.target.value,
                                    })
                                  }
                                  placeholder={
                                    "vars.set('tenantId', '1001');\nrequest.setQueryString('id={{tenantId}}');\nrequest.getHeaders().put('X-Trace-Id', 'suite-run');"
                                  }
                                  value={step.preScript}
                                />
                              </div>
                              <div className="rounded-[1.5rem] border border-border/70 bg-background/40 p-3">
                                <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                  后置脚本
                                </p>
                                <Textarea
                                  className="min-h-[120px] border-0 bg-transparent p-0 font-mono text-xs shadow-none focus-visible:ring-0"
                                  disabled={!canEdit}
                                  onChange={(event) =>
                                    updateStep(step.rowId, {
                                      postScript: event.target.value,
                                    })
                                  }
                                  placeholder={
                                    "if (response && response.getStatusCode() === 200) {\n  vars.set('lastStatus', response.getStatusCode());\n}"
                                  }
                                  value={step.postScript}
                                />
                              </div>
                              <div className="overflow-hidden rounded-[1.5rem] border border-primary/20 bg-[linear-gradient(180deg,rgba(202,138,4,0.12),rgba(202,138,4,0.03))]">
                                <div className="flex items-center gap-2 border-b border-primary/15 px-4 py-3">
                                  <Sparkles className="h-4 w-4 text-primary" />
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">
                                      变量提取器
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                      每行一条规则，格式：
                                      variable|source|expression
                                    </p>
                                  </div>
                                </div>
                                <div className="p-4">
                                  <Textarea
                                    className="min-h-[132px] border-0 bg-transparent p-0 font-mono text-xs shadow-none focus-visible:ring-0"
                                    disabled={!canEdit}
                                    onChange={(event) =>
                                      updateStep(step.rowId, {
                                        extractorsText: event.target.value,
                                      })
                                    }
                                    placeholder={
                                      "token|body_json_path|$.data.token\ntraceId|response_header|X-Trace-Id\nstatus|response_status|status"
                                    }
                                    value={step.extractorsText}
                                  />
                                  <div className="mt-3 rounded-[1rem] border border-border/70 bg-background/55 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
                                    在后续步骤中可以使用{" "}
                                    <span className="font-mono text-foreground">
                                      {"{{token}}"}
                                    </span>{" "}
                                    这样的变量占位符，把当前步骤提取的数据串联到下一个请求。
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                  <Card className="rounded-[2rem] border-border/80 bg-card/84">
                    <CardContent className="p-5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        最近运行
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(
                          [
                            "all",
                            "manual",
                            "trigger",
                            "schedule",
                          ] as ExecutionSourceFilter[]
                        ).map((filter) => (
                          <button
                            className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-smooth ${suiteExecutionFilter === filter ? "border-primary/30 bg-primary/10 text-primary" : "border-border/70 bg-background/60 text-muted-foreground hover:border-primary/20 hover:text-foreground"}`}
                            key={filter}
                            onClick={() => setSuiteExecutionFilter(filter)}
                            type="button"
                          >
                            {filter === "all"
                              ? "全部"
                              : executionSourceLabel(filter)}
                          </button>
                        ))}
                      </div>
                      <div className="mt-4 space-y-3">
                        {filteredSuiteExecutions.length ? (
                          filteredSuiteExecutions.map((execution) => (
                          <button
                            className={`w-full rounded-[1.4rem] border px-4 py-4 text-left transition-smooth ${activeExecution?.id === execution.id ? "border-primary/30 bg-primary/10" : "border-border bg-surface/60 hover:border-primary/20"}`}
                            key={execution.id}
                            onClick={() =>
                              void fetchTestExecution(
                                projectId,
                                execution.id,
                              ).then((response) =>
                                setActiveExecution(response.data),
                              )
                            }
                            type="button"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={executionSourceVariant(
                                    execution.executionSource,
                                  )}
                                >
                                  {executionSourceLabel(
                                    execution.executionSource,
                                  )}
                                </Badge>
                                <Badge variant={statusVariant(execution.status)}>
                                  {statusLabel(execution.status)}
                                </Badge>
                              </div>
                              <span className="text-[11px] text-muted-foreground">
                                {formatTime(execution.executedAt)}
                              </span>
                            </div>
                            <p className="mt-3 text-sm font-semibold text-foreground">
                              {execution.passedSteps}/{execution.totalSteps}{" "}
                              通过
                            </p>
                          </button>
                          ))
                        ) : (
                          <div className="rounded-[1.25rem] border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                            当前筛选条件下暂无套件执行记录。
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="rounded-[2rem] border-border/80 bg-card/84">
                    <CardContent className="p-6">
                      {activeExecution ? (
                        <div className="space-y-4">
                          <div className="rounded-[1.5rem] border border-border bg-surface/50 px-5 py-4 text-sm text-muted-foreground">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant={executionSourceVariant(
                                  activeExecution.executionSource,
                                )}
                              >
                                {executionSourceLabel(
                                  activeExecution.executionSource,
                                )}
                              </Badge>
                              <span>
                                {formatTime(activeExecution.executedAt)} ·{" "}
                                {activeExecution.durationMs} ms
                              </span>
                            </div>
                          </div>
                          {activeExecution.steps.map((step) => (
                            <div
                              className={`rounded-[1.5rem] border p-5 ${step.status === "passed" ? "border-success/25 bg-success/10" : step.status === "failed" ? "border-destructive/20 bg-destructive/10" : "border-warning/25 bg-warning/10"}`}
                              key={`${activeExecution.id}-${step.stepOrder}`}
                            >
                              <div className="flex items-center gap-2">
                                <Badge variant={statusVariant(step.status)}>
                                  {statusLabel(step.status)}
                                </Badge>
                                <MethodBadge method={step.method} />
                                <span className="text-xs text-muted-foreground">
                                  {step.environmentName}
                                </span>
                              </div>
                              <p className="mt-3 text-lg font-semibold text-foreground">
                                {step.stepName}
                              </p>
                              {step.finalUrl ? (
                                <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                                  {step.finalUrl}
                                </p>
                              ) : null}
                              {step.responseStatusCode != null ? (
                                <p className="mt-3 text-sm text-foreground">
                                  HTTP {step.responseStatusCode}
                                </p>
                              ) : null}
                              {activeExecution?.durationMs ? (
                                <div className="mt-3 rounded-[1rem] border border-border/70 bg-background/55 p-3">
                                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span>步骤时间线</span>
                                    <span>{step.durationMs} ms</span>
                                  </div>
                                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary/10">
                                    <div
                                      className="h-full rounded-full bg-primary"
                                      style={{
                                        width: `${Math.max((step.durationMs / Math.max(activeExecution.durationMs, 1)) * 100, 4)}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              ) : null}
                              {(step.requestQueryString || step.requestHeaders.length || step.requestBody) ? (
                                <div className="mt-3 rounded-[1rem] border border-border/70 bg-background/55 p-3 text-xs text-muted-foreground">
                                  <p className="font-medium text-foreground">请求快照</p>
                                  {step.requestQueryString ? <p className="mt-2 font-mono">query: {step.requestQueryString}</p> : null}
                                  {step.requestHeaders.length ? (
                                    <p className="mt-1 font-mono">
                                      headers: {step.requestHeaders.map((header) => `${header.name}=${header.value}`).join("; ")}
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}
                              <pre className="mt-3 max-h-[220px] overflow-auto rounded-[1rem] bg-background/50 p-4 text-xs leading-6 text-foreground whitespace-pre-wrap">
                                {step.responseBody ||
                                  step.errorMessage ||
                                  "未捕获到响应内容。"}
                              </pre>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {step.assertions.map((assertion, index) => (
                                  <Badge
                                    key={`${assertion.type}-${index}`}
                                    variant={
                                      assertion.passed
                                        ? "success"
                                        : "destructive"
                                    }
                                  >
                                    {assertion.type}
                                  </Badge>
                                ))}
                              </div>
                              {(step.extractedVariables?.length ?? 0) ? (
                                <div className="mt-4 rounded-[1.25rem] border border-primary/20 bg-background/55 p-4">
                                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                    提取变量
                                  </p>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {(step.extractedVariables ?? []).map((variable) => (
                                      <div
                                        className="min-w-[180px] rounded-[1rem] border border-primary/15 bg-primary/10 px-3 py-2"
                                        key={`${step.stepOrder}-${variable.variableName}-${variable.expression}`}
                                      >
                                        <p className="font-mono text-xs text-foreground">
                                          {variable.variableName}
                                        </p>
                                        <p className="mt-1 text-[11px] text-muted-foreground">
                                          {variable.sourceType} 路{" "}
                                          {variable.expression}
                                        </p>
                                        <p className="mt-2 font-mono text-xs text-primary">
                                          {variable.value}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-[1.5rem] border border-dashed border-border px-6 py-14 text-center text-sm text-muted-foreground">
                          运行一次套件后，这里会展示详细报告。
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </ProjectConsoleLayout>
  );
}
