"use client";

import { useEffect, useState } from "react";
import {
  fetchProjectAiSettings,
  testProjectAiSettings,
  updateProjectAiSettings,
  type UpdateProjectAiSettingsPayload,
} from "@api-hub/api-sdk";
import { Bot, CheckCircle2, KeyRound, Sparkles, Workflow } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";

import { ProjectConsoleLayout } from "./project-console-layout";

type Props = { projectId: number };

const DEFAULT_DRAFT: UpdateProjectAiSettingsPayload = {
  providerType: "openai_compatible",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  defaultModel: "gpt-4.1-mini",
  descriptionModel: "",
  mockModel: "",
  codeModel: "",
  timeoutMs: 30000,
  enabled: false,
};

export function AiSettingsScreen({ projectId }: Props) {
  const [draft, setDraft] = useState<UpdateProjectAiSettingsPayload>(DEFAULT_DRAFT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchProjectAiSettings(projectId)
      .then((response) => {
        if (!mounted) {
          return;
        }
        setDraft({
          providerType: "openai_compatible",
          baseUrl: response.data.baseUrl,
          apiKey: "",
          defaultModel: response.data.defaultModel,
          descriptionModel: response.data.descriptionModel ?? "",
          mockModel: response.data.mockModel ?? "",
          codeModel: response.data.codeModel ?? "",
          timeoutMs: response.data.timeoutMs,
          enabled: response.data.enabled,
        });
        setApiKeyConfigured(response.data.apiKeyConfigured);
      })
      .catch((loadError) => mounted && setError(loadError instanceof Error ? loadError.message : "AI 配置加载失败"))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [projectId]);

  function updateDraft(patch: Partial<UpdateProjectAiSettingsPayload>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await updateProjectAiSettings(projectId, draft);
      setApiKeyConfigured(response.data.apiKeyConfigured || draft.apiKey.trim().length > 0);
      setDraft((current) => ({ ...current, apiKey: "" }));
      setMessage("AI 配置已保存");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "AI 配置保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setError(null);
    setMessage(null);
    try {
      const response = await testProjectAiSettings(projectId, draft);
      setMessage(`${response.data.message} (${response.data.model})`);
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : "AI 连通性测试失败");
    } finally {
      setTesting(false);
    }
  }

  return (
    <ProjectConsoleLayout projectId={projectId} title="AI 配置">
      <div className="space-y-6">
        {error ? <Notice tone="error" text={error} /> : null}
        {message ? <Notice tone="success" text={message} /> : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
          <Card className="rounded-[2rem] border-border/80 bg-card/84">
            <CardContent className="space-y-6 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-primary" />
                    <p className="text-lg font-semibold text-foreground">项目级 AI Provider</p>
                  </div>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                    当前阶段统一按 OpenAI-compatible 协议接入。配置完成后，接口说明生成、智能 Mock 和多语言代码示例会共用这套模型设置。
                  </p>
                </div>
                <Badge variant={draft.enabled ? "success" : "outline"}>{draft.enabled ? "已启用" : "未启用"}</Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Provider">
                  <Select value={draft.providerType} onChange={(event) => updateDraft({ providerType: event.target.value as "openai_compatible" })}>
                    <option value="openai_compatible">OpenAI Compatible</option>
                  </Select>
                </Field>
                <Field label="超时（ms）">
                  <Input type="number" value={draft.timeoutMs} onChange={(event) => updateDraft({ timeoutMs: Number(event.target.value) || 30000 })} />
                </Field>
              </div>

              <Field label="Base URL">
                <Input value={draft.baseUrl} onChange={(event) => updateDraft({ baseUrl: event.target.value })} placeholder="https://api.openai.com/v1" />
              </Field>

              <Field
                label="API Key"
                hint={apiKeyConfigured ? "已存在密钥。留空表示继续沿用当前密钥。" : "尚未配置密钥。启用 AI 前必须填写。"}
              >
                <Input type="password" value={draft.apiKey} onChange={(event) => updateDraft({ apiKey: event.target.value })} placeholder="sk-..." />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="默认模型">
                  <Input value={draft.defaultModel} onChange={(event) => updateDraft({ defaultModel: event.target.value })} placeholder="gpt-4.1-mini" />
                </Field>
                <Field label="说明生成模型">
                  <Input value={draft.descriptionModel ?? ""} onChange={(event) => updateDraft({ descriptionModel: event.target.value })} placeholder="留空则复用默认模型" />
                </Field>
                <Field label="Mock 生成模型">
                  <Input value={draft.mockModel ?? ""} onChange={(event) => updateDraft({ mockModel: event.target.value })} placeholder="留空则复用默认模型" />
                </Field>
                <Field label="代码示例模型">
                  <Input value={draft.codeModel ?? ""} onChange={(event) => updateDraft({ codeModel: event.target.value })} placeholder="留空则复用默认模型" />
                </Field>
              </div>

              <label className="flex items-center gap-3 rounded-[1.2rem] border border-border bg-surface/60 px-4 py-4 text-sm text-foreground">
                <input
                  checked={draft.enabled}
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
                  type="checkbox"
                  onChange={(event) => updateDraft({ enabled: event.target.checked })}
                />
                启用当前项目的 AI 能力
              </label>

              <div className="flex flex-wrap gap-3">
                <Button disabled={saving} onClick={() => void handleSave()}>
                  {saving ? "保存中..." : "保存 AI 配置"}
                </Button>
                <Button disabled={testing} variant="outline" onClick={() => void handleTest()}>
                  {testing ? "测试中..." : "测试连通性"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <CapabilityCard
              icon={<Sparkles className="h-4 w-4 text-primary" />}
              title="接口说明生成"
              text="在接口工作台里根据路径、参数和响应结构自动补全文档说明，并可直接回填到描述字段。"
            />
            <CapabilityCard
              icon={<Workflow className="h-4 w-4 text-primary" />}
              title="智能 Mock"
              text="在 Mock 工作台里根据响应结构直接生成一份高保真 JSON 数据，用于规则体填充。"
            />
            <CapabilityCard
              icon={<KeyRound className="h-4 w-4 text-primary" />}
              title="多语言代码示例"
              text="自动输出 cURL、TypeScript、Python、Java 等语言片段，复用当前接口定义和默认环境 Base URL。"
            />
          </div>
        </div>

        {loading ? (
          <Card className="rounded-[1.8rem] border-border/80 bg-card/84">
            <CardContent className="p-8 text-sm text-muted-foreground">正在加载 AI 配置...</CardContent>
          </Card>
        ) : null}
      </div>
    </ProjectConsoleLayout>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

function CapabilityCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <Card className="rounded-[1.8rem] border-border/80 bg-card/84">
      <CardContent className="p-5">
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-sm font-semibold text-foreground">{title}</p>
        </div>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
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
      {tone === "success" ? <CheckCircle2 className="mr-2 inline h-4 w-4" /> : null}
      {text}
    </div>
  );
}
