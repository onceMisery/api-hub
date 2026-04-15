"use client";

import { useEffect, useMemo, useState } from "react";
import {
  askProjectAiQuestion,
  fetchProjectTree,
  type AiReferenceItem,
  type ModuleTreeItem,
  type ProjectAiAnswerResult,
} from "@api-hub/api-sdk";
import { Bot, Sparkles, Workflow } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, Textarea } from "@/components/ui/input";
import { ProjectConsoleLayout } from "@/features/console/project-console-layout";
import { flattenProjectTree } from "@/features/console/tree-utils";

type Props = {
  projectId: number;
};

export function AiAssistantScreen({ projectId }: Props) {
  const [modules, setModules] = useState<ModuleTreeItem[]>([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [question, setQuestion] = useState("");
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>("");
  const [result, setResult] = useState<ProjectAiAnswerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoadingTree(true);
    fetchProjectTree(projectId)
      .then((response) => {
        if (!mounted) {
          return;
        }
        setModules(response.data.modules);
      })
      .catch((loadError) => {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "AI 助手页面加载失败");
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingTree(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [projectId]);

  const flattenedEndpoints = useMemo(() => flattenProjectTree(modules), [modules]);
  const selectedEndpoint = useMemo(
    () => flattenedEndpoints.find((item) => String(item.endpoint.id) === selectedEndpointId) ?? null,
    [flattenedEndpoints, selectedEndpointId],
  );

  async function handleAsk() {
    const normalizedQuestion = question.trim();
    if (!normalizedQuestion) {
      setError("请输入问题");
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const response = await askProjectAiQuestion(projectId, {
        question: normalizedQuestion,
        endpointId: selectedEndpoint ? selectedEndpoint.endpoint.id : null,
        scopeHint: selectedEndpoint
          ? `${selectedEndpoint.moduleName} / ${selectedEndpoint.groupName} / ${selectedEndpoint.endpoint.name}`
          : "当前项目",
      });
      setResult(response.data);
      setMessage(response.data.hasContext ? "已基于项目知识库生成回答" : "当前项目知识库上下文不足");
    } catch (askError) {
      setError(askError instanceof Error ? askError.message : "AI 问答失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ProjectConsoleLayout projectId={projectId} title="AI 助手">
      <div className="space-y-6">
        {error ? <Notice tone="error" text={error} /> : null}
        {message ? <Notice tone="success" text={message} /> : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
          <Card className="rounded-[1.9rem] border-border/80 bg-card/84 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <CardContent className="space-y-5 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-primary" />
                    <p className="text-lg font-semibold text-foreground">提问</p>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    基于当前项目的接口文档、参数定义和响应结构生成回答，回答会附带引用来源。
                  </p>
                </div>
                <Badge variant={selectedEndpoint ? "info" : "outline"}>
                  {selectedEndpoint ? "已选择接口范围" : "当前项目范围"}
                </Badge>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">当前范围</p>
                <Select
                  value={selectedEndpointId}
                  onChange={(event) => setSelectedEndpointId(event.target.value)}
                >
                  <option value="">当前项目</option>
                  {flattenedEndpoints.map((item) => (
                    <option key={item.endpoint.id} value={item.endpoint.id}>
                      {item.moduleName} / {item.groupName} / {item.endpoint.name}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-muted-foreground">
                  {selectedEndpoint
                    ? `${selectedEndpoint.moduleName} / ${selectedEndpoint.groupName} / ${selectedEndpoint.endpoint.name} · ${selectedEndpoint.endpoint.path}`
                    : "不限定单个接口时，会优先从整个项目知识库中检索相关文档。"}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">问题</p>
                <Textarea
                  className="min-h-[150px] text-sm leading-7"
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="例如：这个项目里有哪些接口需要登录态？订单创建接口的必填参数是什么？"
                  value={question}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button disabled={submitting || loadingTree} onClick={() => void handleAsk()}>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  {submitting ? "生成中..." : "提问 AI"}
                </Button>
                <Button
                  disabled={!question.trim()}
                  variant="outline"
                  onClick={() => {
                    setQuestion("");
                    setResult(null);
                    setError(null);
                    setMessage(null);
                  }}
                >
                  清空
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-[1.9rem] border-border/80 bg-card/84">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-2">
                  <Workflow className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">当前范围提示</p>
                </div>
                <p className="text-sm leading-7 text-muted-foreground">
                  {selectedEndpoint
                    ? "当前回答会优先参考所选接口的概览、参数和响应内容。"
                    : "当前回答会从项目内所有已索引接口文档中检索最相关的内容。"}
                </p>
                <div className="rounded-[1.2rem] border border-border bg-surface/60 px-4 py-3 text-xs leading-6 text-muted-foreground">
                  {selectedEndpoint
                    ? `${selectedEndpoint.moduleName} / ${selectedEndpoint.groupName} / ${selectedEndpoint.endpoint.name}`
                    : "项目全局知识库"}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.9rem] border-border/80 bg-card/84">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">检索状态</p>
                </div>
                {loadingTree ? (
                  <p className="text-sm text-muted-foreground">正在加载项目接口树...</p>
                ) : (
                  <p className="text-sm leading-7 text-muted-foreground">
                    {flattenedEndpoints.length > 0
                      ? `已索引 ${flattenedEndpoints.length} 个接口。`
                      : "当前项目还没有可索引的接口。"}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="rounded-[1.9rem] border-border/80 bg-card/84 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-foreground">回答</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {result ? "回答内容来自当前项目知识库检索结果。" : "提交问题后，回答会显示在这里。"}
                </p>
              </div>
              <Badge variant={result?.hasContext ? "success" : "outline"}>
                {result ? (result.hasContext ? "有上下文" : "上下文不足") : "等待提问"}
              </Badge>
            </div>

            <div className="rounded-[1.4rem] border border-border bg-surface/60 px-5 py-5">
              {result ? (
                <div className="space-y-4">
                  <p className="text-sm leading-7 whitespace-pre-wrap text-foreground">{result.answer}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{result.references.length} 条引用</Badge>
                    <Badge variant="outline">{result.matchedEndpointIds.length} 个命中接口</Badge>
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-7 text-muted-foreground">
                  这里会展示 AI 生成的回答。建议先选择一个具体接口，再问该接口的参数、响应、认证方式或相关调用方式。
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-foreground">引用</p>
              <p className="mt-1 text-sm text-muted-foreground">AI 回答时命中的接口文档片段。</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {result?.references?.length ? (
              result.references.map((reference) => (
                <ReferenceCard key={`${reference.endpointId}-${reference.sourceType}-${reference.title}`} projectId={projectId} reference={reference} />
              ))
            ) : (
              <Card className="rounded-[1.6rem] border-dashed border-border/80 bg-card/70 lg:col-span-2">
                <CardContent className="p-6 text-sm text-muted-foreground">
                  暂无引用。提交问题后，这里会展示命中的接口、路径和内容片段。
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ProjectConsoleLayout>
  );
}

function ReferenceCard({ projectId, reference }: { projectId: number; reference: AiReferenceItem }) {
  return (
    <Card className="rounded-[1.6rem] border-border/80 bg-card/84 transition-smooth hover:border-primary/20">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{reference.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {reference.method} · {reference.path}
            </p>
          </div>
          <Badge variant="outline">{sourceTypeLabel(reference.sourceType)}</Badge>
        </div>

        <p className="text-sm leading-7 text-muted-foreground">{reference.snippet}</p>

        <Link
          className="inline-flex items-center text-sm font-medium text-primary transition-fast hover:text-primary/80"
          href={`/console/projects/${projectId}/api?endpointId=${reference.endpointId}`}
        >
          打开接口
        </Link>
      </CardContent>
    </Card>
  );
}

function sourceTypeLabel(sourceType: string) {
  switch (sourceType) {
    case "endpoint_overview":
      return "接口概览";
    case "endpoint_parameters":
      return "请求参数";
    case "endpoint_responses":
      return "响应定义";
    default:
      return sourceType;
  }
}

function Notice({ text, tone }: { text: string; tone: "error" | "success" }) {
  return (
    <div
      className={`rounded-[1.4rem] px-4 py-3 text-sm ${
        tone === "error"
          ? "border border-destructive/20 bg-destructive/10 text-destructive"
          : "border border-success/20 bg-success/10 text-success"
      }`}
    >
      {text}
    </div>
  );
}
