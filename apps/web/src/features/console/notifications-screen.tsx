"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createProjectWebhook,
  deleteProjectWebhook,
  fetchProjectWebhooks,
  fetchWebhookDeliveries,
  testProjectWebhook,
  updateProjectWebhook,
  type ProjectWebhookDetail,
  type ProjectWebhookEventType,
  type WebhookDeliveryDetail,
} from "@api-hub/api-sdk";
import { BellRing, Clock3, Link2, Radio, Send, ShieldCheck, Siren, Webhook } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";

import { ProjectConsoleLayout } from "./project-console-layout";

type Props = { projectId: number };

type WebhookFormState = {
  id: number | null;
  name: string;
  targetUrl: string;
  secret: string;
  enabled: boolean;
  eventTypes: ProjectWebhookEventType[];
};

const EVENT_OPTIONS: Array<{ value: ProjectWebhookEventType; label: string; hint: string }> = [
  { value: "version.released", label: "版本发布", hint: "接口版本发布后发送" },
  { value: "mock.released", label: "Mock 发布", hint: "Mock 规则发布后发送" },
  { value: "test_suite.failed", label: "测试失败", hint: "测试套件失败或执行异常时发送" },
];

const EMPTY_FORM: WebhookFormState = {
  id: null,
  name: "",
  targetUrl: "",
  secret: "",
  enabled: true,
  eventTypes: ["version.released", "mock.released"],
};

export function NotificationsScreen({ projectId }: Props) {
  const [webhooks, setWebhooks] = useState<ProjectWebhookDetail[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDeliveryDetail[]>([]);
  const [form, setForm] = useState<WebhookFormState>(EMPTY_FORM);
  const [selectedWebhookId, setSelectedWebhookId] = useState<number | null>(null);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh(options?: { keepSelection?: boolean }) {
    const keepSelection = options?.keepSelection ?? true;
    setLoading(true);
    setError(null);
    try {
      const [webhooksResponse, deliveriesResponse] = await Promise.all([
        fetchProjectWebhooks(projectId),
        fetchWebhookDeliveries(projectId, 80),
      ]);
      setWebhooks(webhooksResponse.data);
      setDeliveries(deliveriesResponse.data);

      const nextSelectedWebhookId = keepSelection
        ? (webhooksResponse.data.find((item) => item.id === selectedWebhookId)?.id ?? webhooksResponse.data[0]?.id ?? null)
        : (webhooksResponse.data[0]?.id ?? null);
      setSelectedWebhookId(nextSelectedWebhookId);
      if (nextSelectedWebhookId == null) {
        setForm(EMPTY_FORM);
      } else {
        const selectedWebhook = webhooksResponse.data.find((item) => item.id === nextSelectedWebhookId) ?? null;
        if (selectedWebhook) {
          setForm({
            id: selectedWebhook.id,
            name: selectedWebhook.name,
            targetUrl: selectedWebhook.targetUrl,
            secret: "",
            enabled: selectedWebhook.enabled,
            eventTypes: selectedWebhook.eventTypes,
          });
        }
      }
      setSelectedDeliveryId((current) => deliveriesResponse.data.find((item) => item.id === current)?.id ?? deliveriesResponse.data[0]?.id ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "通知中心加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh({ keepSelection: false });
  }, [projectId]);

  const selectedWebhook = useMemo(
    () => webhooks.find((item) => item.id === selectedWebhookId) ?? null,
    [selectedWebhookId, webhooks],
  );
  const selectedDelivery = useMemo(
    () => deliveries.find((item) => item.id === selectedDeliveryId) ?? null,
    [deliveries, selectedDeliveryId],
  );

  function resetForm() {
    setSelectedWebhookId(null);
    setForm(EMPTY_FORM);
    setFeedback(null);
  }

  function fillForm(webhook: ProjectWebhookDetail) {
    setSelectedWebhookId(webhook.id);
    setForm({
      id: webhook.id,
      name: webhook.name,
      targetUrl: webhook.targetUrl,
      secret: "",
      enabled: webhook.enabled,
      eventTypes: webhook.eventTypes,
    });
    setFeedback(null);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setFeedback(null);
    setError(null);
    try {
      const payload = {
        name: form.name,
        targetUrl: form.targetUrl,
        secret: form.secret,
        enabled: form.enabled,
        eventTypes: form.eventTypes,
      };
      if (form.id == null) {
        await createProjectWebhook(projectId, payload);
        setFeedback("Webhook 已创建");
      } else {
        await updateProjectWebhook(form.id, payload);
        setFeedback("Webhook 已更新");
      }
      await refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Webhook 保存失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (form.id == null) return;
    setSubmitting(true);
    setFeedback(null);
    setError(null);
    try {
      await deleteProjectWebhook(form.id);
      resetForm();
      await refresh({ keepSelection: false });
      setFeedback("Webhook 已删除");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Webhook 删除失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTest() {
    if (form.id == null) return;
    setSubmitting(true);
    setFeedback(null);
    setError(null);
    try {
      const response = await testProjectWebhook(projectId, form.id);
      setFeedback(`测试请求已发送，状态：${response.data.deliveryStatus}`);
      await refresh();
      setSelectedDeliveryId(response.data.id);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Webhook 测试失败");
    } finally {
      setSubmitting(false);
    }
  }

  function toggleEvent(value: ProjectWebhookEventType) {
    setForm((current) => ({
      ...current,
      eventTypes: current.eventTypes.includes(value)
        ? current.eventTypes.filter((item) => item !== value)
        : [...current.eventTypes, value],
    }));
  }

  return (
    <ProjectConsoleLayout projectId={projectId} title="通知中心">
      <div className="space-y-6">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_380px]">
          <Card className="rounded-[2rem] border-border/70 bg-card/86 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <CardContent className="flex flex-col gap-4 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <BellRing className="h-4 w-4 text-primary" />
                    <span>项目通知 Webhook</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">配置对外通知地址，用于版本发布、Mock 发布和测试失败提醒。</p>
                </div>
                <Button onClick={resetForm} size="sm" variant="outline">新建</Button>
              </div>

              {error ? <div className="rounded-[1.2rem] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
              {feedback ? <div className="rounded-[1.2rem] border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">{feedback}</div> : null}

              <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                <div className="space-y-3">
                  {loading ? (
                    <div className="rounded-[1.4rem] border border-border bg-surface/60 px-4 py-10 text-sm text-muted-foreground">正在加载 webhook...</div>
                  ) : webhooks.length ? (
                    webhooks.map((item) => (
                      <button
                        key={item.id}
                        className={`w-full rounded-[1.35rem] border p-4 text-left transition-smooth ${selectedWebhookId === item.id ? "border-primary/30 bg-primary/10" : "border-border bg-surface/58 hover:border-primary/20"}`}
                        onClick={() => fillForm(item)}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">{item.targetUrl}</p>
                          </div>
                          <Badge variant={item.enabled ? "success" : "outline"}>{item.enabled ? "启用" : "停用"}</Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.eventTypes.map((eventType) => (
                            <Badge key={eventType} variant="outline">{eventType}</Badge>
                          ))}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-[1.4rem] border border-dashed border-border bg-surface/40 px-4 py-10 text-sm text-muted-foreground">当前还没有通知地址，先创建一条 webhook。</div>
                  )}
                </div>

                <div className="rounded-[1.6rem] border border-border bg-surface/54 p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">名称</label>
                      <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="例如：版本发布提醒" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Target URL</label>
                      <Input value={form.targetUrl} onChange={(event) => setForm((current) => ({ ...current, targetUrl: event.target.value }))} placeholder="https://example.com/webhooks/apihub" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">签名 Secret</label>
                      <Input
                        type="password"
                        value={form.secret}
                        onChange={(event) => setForm((current) => ({ ...current, secret: event.target.value }))}
                        placeholder={selectedWebhook?.secretConfigured ? "留空表示保留原有 secret" : "可选，用于生成 X-ApiHub-Signature"}
                      />
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">事件类型</label>
                      <button
                        className={`rounded-full border px-3 py-1 text-xs transition-smooth ${form.enabled ? "border-primary/20 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                        onClick={() => setForm((current) => ({ ...current, enabled: !current.enabled }))}
                        type="button"
                      >
                        {form.enabled ? "已启用" : "已停用"}
                      </button>
                    </div>
                    <div className="grid gap-3">
                      {EVENT_OPTIONS.map((item) => {
                        const checked = form.eventTypes.includes(item.value);
                        return (
                          <button
                            key={item.value}
                            className={`flex items-start gap-3 rounded-[1.1rem] border px-4 py-3 text-left transition-smooth ${checked ? "border-primary/30 bg-primary/10" : "border-border bg-card/70 hover:border-primary/20"}`}
                            onClick={() => toggleEvent(item.value)}
                            type="button"
                          >
                            <div className={`mt-0.5 h-4 w-4 rounded-full border ${checked ? "border-primary bg-primary" : "border-border bg-transparent"}`} />
                            <div>
                              <p className="text-sm font-medium text-foreground">{item.label}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button disabled={submitting} onClick={handleSubmit}>
                      <Webhook className="mr-2 h-4 w-4" />
                      {form.id == null ? "创建 Webhook" : "保存修改"}
                    </Button>
                    <Button disabled={submitting || form.id == null} onClick={handleTest} variant="outline">
                      <Send className="mr-2 h-4 w-4" />
                      发送测试
                    </Button>
                    <Button disabled={submitting || form.id == null} onClick={handleDelete} variant="ghost">
                      删除
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-border/70 bg-card/84">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>投递规范</span>
              </div>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-[1.2rem] border border-border bg-surface/60 p-4">
                  <p className="font-medium text-foreground">请求头</p>
                  <p className="mt-2 font-mono text-xs">Content-Type: application/json</p>
                  <p className="mt-1 font-mono text-xs">X-ApiHub-Event: version.released</p>
                  <p className="mt-1 font-mono text-xs">X-ApiHub-Signature: sha256=...</p>
                </div>
                <div className="rounded-[1.2rem] border border-border bg-surface/60 p-4">
                  <p className="font-medium text-foreground">投递策略</p>
                  <p className="mt-2 text-xs leading-6">当前为直接投递并记录结果，2xx 视为成功，非 2xx 或网络异常视为失败。</p>
                </div>
                <div className="rounded-[1.2rem] border border-border bg-surface/60 p-4">
                  <p className="font-medium text-foreground">推荐接收方式</p>
                  <p className="mt-2 text-xs leading-6">先接一个你自己的中转服务或机器人代理，再按钉钉、飞书、企微格式二次转换。</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_420px]">
          <Card className="rounded-[2rem] border-border/70 bg-card/84">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Radio className="h-4 w-4 text-primary" />
                  <span>最近投递记录</span>
                </div>
                <Button onClick={() => refresh()} size="sm" variant="outline">刷新</Button>
              </div>

              <div className="space-y-3">
                {deliveries.length ? (
                  deliveries.map((item) => (
                    <button
                      key={item.id}
                      className={`w-full rounded-[1.25rem] border p-4 text-left transition-smooth ${selectedDeliveryId === item.id ? "border-primary/30 bg-primary/10" : "border-border bg-surface/58 hover:border-primary/20"}`}
                      onClick={() => setSelectedDeliveryId(item.id)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{item.webhookName}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{item.eventType}</p>
                        </div>
                        <Badge variant={item.deliveryStatus === "success" ? "success" : "warning"}>{item.deliveryStatus === "success" ? "成功" : "失败"}</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{item.durationMs} ms</span>
                        <span>{new Date(item.createdAt).toLocaleString("zh-CN")}</span>
                        {item.responseStatus != null ? <span>HTTP {item.responseStatus}</span> : null}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-[1.4rem] border border-dashed border-border bg-surface/40 px-4 py-10 text-sm text-muted-foreground">还没有投递记录，创建 webhook 后可以先发一条测试消息。</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-border/70 bg-card/84">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Link2 className="h-4 w-4 text-primary" />
                <span>投递详情</span>
              </div>
              {selectedDelivery ? (
                <>
                  <div className="rounded-[1.25rem] border border-border bg-surface/58 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={selectedDelivery.deliveryStatus === "success" ? "success" : "warning"}>
                        {selectedDelivery.deliveryStatus === "success" ? "投递成功" : "投递失败"}
                      </Badge>
                      <Badge variant="outline">{selectedDelivery.eventType}</Badge>
                    </div>
                    <p className="mt-3 text-sm font-medium text-foreground">{selectedDelivery.webhookName}</p>
                    <p className="mt-1 break-all text-xs text-muted-foreground">{selectedDelivery.targetUrl}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>{new Date(selectedDelivery.createdAt).toLocaleString("zh-CN")}</span>
                      <span>{selectedDelivery.durationMs} ms</span>
                      {selectedDelivery.responseStatus != null ? <span>HTTP {selectedDelivery.responseStatus}</span> : null}
                    </div>
                    {selectedDelivery.errorMessage ? (
                      <div className="mt-3 rounded-xl border border-warning/20 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
                        <div className="flex items-center gap-2 font-medium text-foreground">
                          <Siren className="h-3.5 w-3.5 text-warning" />
                          <span>错误信息</span>
                        </div>
                        <p className="mt-2 text-muted-foreground">{selectedDelivery.errorMessage}</p>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Payload JSON</label>
                    <Textarea className="min-h-[220px] font-mono text-xs" readOnly value={selectedDelivery.payloadJson} />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Response Body</label>
                    <Textarea className="min-h-[140px] font-mono text-xs" readOnly value={selectedDelivery.responseBody ?? ""} />
                  </div>
                </>
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-border bg-surface/40 px-4 py-10 text-sm text-muted-foreground">选择左侧一条投递记录查看请求体和响应结果。</div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </ProjectConsoleLayout>
  );
}
