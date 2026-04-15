"use client";

import { useId, useRef, useState } from "react";
import {
  importHarToProject,
  importHarAsProject,
  importOpenApiAsProject,
  importOpenApiToProject,
  importPostmanAsProject,
  importPostmanToProject,
  importSmartDocAsProject,
  importSmartDocToProject,
  previewHarToProject,
  previewHarAsProject,
  previewOpenApiAsProject,
  previewOpenApiToProject,
  previewPostmanAsProject,
  previewPostmanToProject,
  previewSmartDocAsProject,
  previewSmartDocToProject,
  type ImportProjectPayload,
  type ImportPreview,
  type ImportResult,
  type ImportSpecPayload,
} from "@api-hub/api-sdk";
import { Eye, FileUp, Layers3, Link2, RefreshCcw, Rocket, ScanText, UploadCloud } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SourceType = "openapi" | "smartdoc" | "postman" | "har";
type Mode = "space-project" | "project-merge";
type InputMode = "content" | "url";

type Props = {
  mode: Mode;
  projectId?: number;
  spaceId?: number;
  canSubmit?: boolean;
  onImported?: (result: ImportResult) => void;
};

const SOURCE_OPTIONS: Array<{ key: SourceType; label: string; hint: string }> = [
  { key: "openapi", label: "OpenAPI / Swagger", hint: "支持 JSON 和 YAML，适合导入完整接口定义。" },
  { key: "smartdoc", label: "SmartDoc", hint: "支持 SmartDoc 原始 JSON，也支持 SmartDoc 导出的 OpenAPI。" },
  { key: "postman", label: "Postman Collection", hint: "支持 Postman Collection v2.1，会按文件夹层级映射模块和分组。" },
  { key: "har", label: "HAR Capture", hint: "支持 HAR 1.2 网络抓包，适合从浏览器或代理工具回放接口清单。" },
];

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function SpecImportPanel({ mode, projectId, spaceId, canSubmit = true, onImported }: Props) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sourceType, setSourceType] = useState<SourceType>("openapi");
  const [inputMode, setInputMode] = useState<InputMode>("content");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [content, setContent] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [description, setDescription] = useState("");
  const [createVersionSnapshot, setCreateVersionSnapshot] = useState(true);
  const [bootstrapEnvironments, setBootstrapEnvironments] = useState(true);
  const [enableMockByDefault, setEnableMockByDefault] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleFileSelect(file: File | null) {
    if (!file) {
      return;
    }
    const nextContent = await file.text();
    const basename = file.name.replace(/\.[^.]+$/, "");
    setContent(nextContent);
    if (!sourceName.trim()) {
      setSourceName(basename);
    }
    if (mode === "space-project") {
      if (!projectName.trim()) {
        setProjectName(basename);
      }
      if (!projectKey.trim()) {
        setProjectKey(slugify(basename));
      }
    }
  }

  const hasInput = inputMode === "content" ? !!content.trim() : !!sourceUrl.trim();
  const disabled = !canSubmit || submitting || !hasInput || (mode === "space-project" && (!projectName.trim() || !projectKey.trim()));

  async function handleSubmit() {
    if (!canSubmit || !hasInput) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      let response;
      if (mode === "space-project") {
        if (typeof spaceId !== "number") {
          throw new Error("缺少目标分组。");
        }
        const payload: ImportProjectPayload = {
          projectName: projectName.trim(),
          projectKey: projectKey.trim(),
          description: description.trim(),
          sourceName: sourceName.trim(),
          sourceUrl: inputMode === "url" ? sourceUrl.trim() : "",
          content: inputMode === "content" ? content.trim() : "",
          createVersionSnapshot,
          bootstrapEnvironments,
          enableMockByDefault,
        };
        response =
          sourceType === "openapi"
            ? await importOpenApiAsProject(spaceId, payload)
            : sourceType === "smartdoc"
              ? await importSmartDocAsProject(spaceId, payload)
              : sourceType === "postman"
                ? await importPostmanAsProject(spaceId, payload)
                : await importHarAsProject(spaceId, payload);
      } else {
        if (typeof projectId !== "number") {
          throw new Error("缺少目标项目。");
        }
        const payload: ImportSpecPayload = {
          sourceName: sourceName.trim(),
          sourceUrl: inputMode === "url" ? sourceUrl.trim() : "",
          content: inputMode === "content" ? content.trim() : "",
          createVersionSnapshot,
          bootstrapEnvironments,
          enableMockByDefault,
        };
        response =
          sourceType === "openapi"
            ? await importOpenApiToProject(projectId, payload)
            : sourceType === "smartdoc"
              ? await importSmartDocToProject(projectId, payload)
              : sourceType === "postman"
                ? await importPostmanToProject(projectId, payload)
                : await importHarToProject(projectId, payload);
      }

      setResult(response.data);
      onImported?.(response.data);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "导入失败。");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePreview() {
    if (!canSubmit || !hasInput) {
      return;
    }
    setPreviewing(true);
    setError(null);
    setPreview(null);
    try {
      let response;
      if (mode === "space-project") {
        if (typeof spaceId !== "number") {
          throw new Error("缺少目标分组。");
        }
        const payload: ImportProjectPayload = {
          projectName: projectName.trim(),
          projectKey: projectKey.trim(),
          description: description.trim(),
          sourceName: sourceName.trim(),
          sourceUrl: inputMode === "url" ? sourceUrl.trim() : "",
          content: inputMode === "content" ? content.trim() : "",
          createVersionSnapshot,
          bootstrapEnvironments,
          enableMockByDefault,
        };
        response =
          sourceType === "openapi"
            ? await previewOpenApiAsProject(spaceId, payload)
            : sourceType === "smartdoc"
              ? await previewSmartDocAsProject(spaceId, payload)
              : sourceType === "postman"
                ? await previewPostmanAsProject(spaceId, payload)
                : await previewHarAsProject(spaceId, payload);
      } else {
        if (typeof projectId !== "number") {
          throw new Error("缺少目标项目。");
        }
        const payload: ImportSpecPayload = {
          sourceName: sourceName.trim(),
          sourceUrl: inputMode === "url" ? sourceUrl.trim() : "",
          content: inputMode === "content" ? content.trim() : "",
          createVersionSnapshot,
          bootstrapEnvironments,
          enableMockByDefault,
        };
        response =
          sourceType === "openapi"
            ? await previewOpenApiToProject(projectId, payload)
            : sourceType === "smartdoc"
              ? await previewSmartDocToProject(projectId, payload)
              : sourceType === "postman"
                ? await previewPostmanToProject(projectId, payload)
                : await previewHarToProject(projectId, payload);
      }
      setPreview(response.data);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "预览失败。");
    } finally {
      setPreviewing(false);
    }
  }

  return (
    <Card className="overflow-hidden rounded-[2rem] border-border/80 bg-card/88">
      <CardContent className="p-0">
        <div className="border-b border-border bg-gradient-to-r from-card via-card to-primary/5 px-5 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <Badge className="mb-3">
                {mode === "space-project" ? <Rocket className="mr-1 h-3 w-3" /> : <RefreshCcw className="mr-1 h-3 w-3" />}
                {mode === "space-project" ? "从规格创建项目" : "导入到当前项目"}
              </Badge>
              <h3 className="text-2xl font-semibold text-foreground">
                {mode === "space-project" ? "通过规格文档快速初始化项目" : "将外部接口定义合并到当前项目"}
              </h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {mode === "space-project"
                  ? "支持粘贴或上传 OpenAPI / SmartDoc 文档，导入后会自动生成模块、分组、接口、版本和可选环境。"
                  : "系统会按 METHOD:path 对齐已有接口，已有路由会原位更新，缺失模块和分组会自动补齐。"}
              </p>
            </div>

            <Button onClick={() => fileInputRef.current?.click()} type="button" variant="outline">
              <UploadCloud className="mr-2 h-4 w-4" />
              选择文件
            </Button>
          </div>
        </div>

        <div className="grid gap-6 px-5 py-5 2xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="grid gap-3 2xl:grid-cols-2">
              {SOURCE_OPTIONS.map((option) => (
                <button
                  className={cn(
                    "cursor-pointer rounded-[1.4rem] border px-4 py-4 text-left transition-smooth",
                    sourceType === option.key ? "border-primary/30 bg-primary/10 shadow-card" : "border-border bg-surface/70 hover:border-primary/20",
                  )}
                  key={option.key}
                  onClick={() => setSourceType(option.key)}
                  type="button"
                >
                  <div className="flex min-h-[112px] flex-col justify-between gap-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{option.label}</p>
                      {option.key === "openapi" ? (
                        <Layers3 className="h-4 w-4 shrink-0 text-primary" />
                      ) : (
                        <ScanText className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </div>
                    <p className="text-xs leading-6 text-muted-foreground">{option.hint}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="grid gap-3 2xl:grid-cols-2">
              <button
                className={cn(
                  "cursor-pointer rounded-[1.2rem] border px-4 py-3 text-left transition-smooth",
                  inputMode === "content" ? "border-primary/30 bg-primary/10" : "border-border bg-surface/70 hover:border-primary/20",
                )}
                onClick={() => setInputMode("content")}
                type="button"
              >
                <div className="flex min-h-[96px] flex-col justify-between gap-4">
                  <p className="text-sm font-semibold text-foreground">粘贴或上传内容</p>
                  <p className="text-xs leading-6 text-muted-foreground">适合本地 JSON / YAML 文件，或直接粘贴规格文档文本。</p>
                </div>
              </button>
              <button
                className={cn(
                  "cursor-pointer rounded-[1.2rem] border px-4 py-3 text-left transition-smooth",
                  inputMode === "url" ? "border-primary/30 bg-primary/10" : "border-border bg-surface/70 hover:border-primary/20",
                )}
                onClick={() => setInputMode("url")}
                type="button"
              >
                <div className="flex min-h-[96px] flex-col justify-between gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">通过 URL 抓取</p>
                    <Link2 className="h-4 w-4 shrink-0 text-primary" />
                  </div>
                  <p className="text-xs leading-6 text-muted-foreground">由服务端拉取远程文档，适合共享 OpenAPI 地址或内部导出产物。</p>
                </div>
              </button>
            </div>

            {mode === "space-project" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <Input onChange={(event) => setProjectName(event.target.value)} placeholder="项目名称" value={projectName} />
                <Input onChange={(event) => setProjectKey(event.target.value)} placeholder="project-key" value={projectKey} />
                <div className="md:col-span-2">
                  <Textarea
                    className="min-h-[92px]"
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="简要说明这个导入项目的业务范围"
                    value={description}
                  />
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <Input onChange={(event) => setSourceName(event.target.value)} placeholder="来源标识，例如 petstore-openapi" value={sourceName} />
              {inputMode === "content" ? (
                <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-[1rem] border border-dashed border-border bg-surface/60 px-4 py-2 text-sm text-muted-foreground transition-smooth hover:border-primary/20">
                  <FileUp className="mr-2 h-4 w-4" />
                  上传 .json / .yaml / .yml
                  <input
                    accept=".json,.yaml,.yml,.txt"
                    className="hidden"
                    id={fileInputId}
                    onChange={(event) => void handleFileSelect(event.target.files?.[0] ?? null)}
                    ref={fileInputRef}
                    type="file"
                  />
                </label>
              ) : (
                <Input onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://example.com/openapi.json" value={sourceUrl} />
              )}
            </div>

            {inputMode === "content" ? (
              <Textarea
                className="min-h-[320px] font-mono text-xs leading-6"
                onChange={(event) => setContent(event.target.value)}
                placeholder="请在这里粘贴 OpenAPI / Swagger / SmartDoc 内容"
                value={content}
              />
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-border bg-surface/55 px-5 py-8">
                <p className="text-sm font-semibold text-foreground">远程来源模式</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  预览和导入时，API Hub 会主动拉取目标地址的规格文档。适合公开或内网可访问的文档链接。
                </p>
              </div>
            )}

            {error ? (
              <div className="rounded-[1.2rem] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}
            {result ? (
              <div className="rounded-[1.4rem] border border-success/20 bg-success/10 px-4 py-4 text-sm text-success">
                已导入到 <span className="font-semibold">{result.projectName}</span>。新增 {result.createdEndpoints} 个接口，更新{" "}
                {result.updatedEndpoints} 个接口，并创建 {result.createdVersions} 个版本快照。
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button disabled={disabled || previewing} onClick={() => void handlePreview()} type="button" variant="outline">
                <Eye className="mr-2 h-4 w-4" />
                {previewing ? "预览中..." : "预览导入结果"}
              </Button>
              <Button disabled={disabled} onClick={() => void handleSubmit()}>
                {mode === "space-project" ? <Rocket className="mr-2 h-4 w-4" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                {submitting ? "导入中..." : mode === "space-project" ? "根据规格创建项目" : "导入到当前项目"}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.6rem] border border-border bg-surface/72 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">导入开关</p>
              <div className="mt-4 space-y-3">
                <ToggleRow checked={createVersionSnapshot} description="为每个导入接口自动创建版本快照。" label="版本快照" onChange={setCreateVersionSnapshot} />
                <ToggleRow checked={bootstrapEnvironments} description="当规格中存在 servers 信息时，自动生成环境配置。" label="初始化环境" onChange={setBootstrapEnvironments} />
                <ToggleRow checked={enableMockByDefault} description="导入后默认启用接口 Mock。" label="默认启用 Mock" onChange={setEnableMockByDefault} />
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-border bg-surface/72 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">合并规则</p>
              <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                <p>
                  以 <span className="font-semibold text-foreground">METHOD:path</span> 作为路由识别键。
                </p>
                <p>已有接口会原位更新，不会自动删除。</p>
                <p>缺失的模块和分组会自动创建。</p>
                <p>SmartDoc 支持原始 JSON 和兼容 OpenAPI 的导出结构。</p>
              </div>
            </div>

            {preview ? (
              <div className="rounded-[1.6rem] border border-border bg-surface/72 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">预览摘要</p>
                <h4 className="mt-2 text-lg font-semibold text-foreground">{preview.resolvedName}</h4>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Metric label="接口" value={preview.totalEndpoints} />
                  <Metric label="模块" value={preview.createdModules || preview.modules.length} />
                  <Metric label="分组" value={preview.createdGroups || preview.groups.length} />
                  <Metric label="环境" value={preview.detectedEnvironments} />
                </div>
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <p>
                    预计新增 {preview.createdEndpoints} 个接口，更新 {preview.updatedEndpoints} 个接口。
                  </p>
                  <p>{preview.modules.slice(0, 4).join("、") || "未识别到模块"}</p>
                </div>
                <div className="mt-4 space-y-2">
                  {preview.routes.slice(0, 6).map((route) => (
                    <div className="rounded-lg border border-border bg-card/70 px-3 py-2 font-mono text-xs text-muted-foreground" key={route}>
                      {route}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {result?.warnings.length ? (
              <div className="rounded-[1.6rem] border border-border bg-surface/72 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">导入告警</p>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {result.warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ToggleRow({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  label: string;
  description: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[1.2rem] border border-border bg-card/70 px-3 py-3 transition-smooth hover:border-primary/20">
      <input checked={checked} className="mt-1 h-4 w-4 accent-primary" onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      <span>
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        <span className="mt-1 block text-xs leading-6 text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.1rem] border border-border bg-card/70 px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
