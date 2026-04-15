"use client";

import { useMemo, useState } from "react";
import {
  generateEndpointCodeSnippets,
  generateEndpointDescription,
  type ParameterUpsertItem,
  type ResponseUpsertItem,
  type AiCodeSnippet,
} from "@api-hub/api-sdk";
import { Bot, Copy, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";

type Props = {
  endpointId: number;
  draft: {
    name: string;
    method: string;
    path: string;
    description: string;
    parameters: ParameterUpsertItem[];
    responses: ResponseUpsertItem[];
  };
  onApplyDescription: (value: string) => void;
};

const LANGUAGE_OPTIONS = ["curl", "typescript", "python", "java"];

export function EndpointAiPanel({ endpointId, draft, onApplyDescription }: Props) {
  const [instructions, setInstructions] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(LANGUAGE_OPTIONS);
  const [description, setDescription] = useState("");
  const [snippets, setSnippets] = useState<AiCodeSnippet[]>([]);
  const [loadingDescription, setLoadingDescription] = useState(false);
  const [loadingSnippets, setLoadingSnippets] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedDraft = useMemo(
    () => ({
      name: draft.name,
      method: draft.method,
      path: draft.path,
      description: draft.description,
      parameters: draft.parameters.map((item) => ({
        sectionType: item.sectionType,
        name: item.name,
        dataType: item.dataType,
        required: item.required,
        description: item.description,
        exampleValue: item.exampleValue,
      })),
      responses: draft.responses.map((item) => ({
        httpStatusCode: item.httpStatusCode,
        mediaType: item.mediaType,
        name: item.name,
        dataType: item.dataType,
        required: item.required,
        description: item.description,
        exampleValue: item.exampleValue,
      })),
    }),
    [draft],
  );

  async function handleGenerateDescription() {
    setLoadingDescription(true);
    setError(null);
    try {
      const response = await generateEndpointDescription(endpointId, {
        instructions,
        draft: normalizedDraft,
      });
      setDescription(response.data.content);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "AI 描述生成失败");
    } finally {
      setLoadingDescription(false);
    }
  }

  async function handleGenerateSnippets() {
    setLoadingSnippets(true);
    setError(null);
    try {
      const response = await generateEndpointCodeSnippets(endpointId, {
        languages: selectedLanguages,
        instructions,
        draft: normalizedDraft,
      });
      setSnippets(response.data.snippets);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "AI 代码示例生成失败");
    } finally {
      setLoadingSnippets(false);
    }
  }

  function toggleLanguage(language: string) {
    setSelectedLanguages((current) =>
      current.includes(language) ? current.filter((item) => item !== language) : [...current, language],
    );
  }

  function copyText(value: string) {
    if (typeof navigator !== "undefined") {
      void navigator.clipboard.writeText(value);
    }
  }

  return (
    <Card className="rounded-[1.9rem] border-border/80 bg-card/88">
      <CardContent className="space-y-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <p className="text-lg font-semibold text-foreground">AI 辅助</p>
            </div>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              根据当前接口草稿生成描述文案和多语言调用示例。这里会直接读取你当前编辑中的方法、路径、参数和响应结构。
            </p>
          </div>
          <Badge variant="outline">Draft-aware</Badge>
        </div>

        {error ? <div className="rounded-[1.2rem] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}

        <Textarea
          className="min-h-[96px]"
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          placeholder="补充要求，例如：说明更偏业务侧，代码示例使用 Bearer Token，优先强调鉴权头。"
        />

        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3 rounded-[1.4rem] border border-border bg-surface/55 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">接口说明生成</p>
              <Button size="sm" onClick={() => void handleGenerateDescription()} disabled={loadingDescription}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                {loadingDescription ? "生成中..." : "生成描述"}
              </Button>
            </div>
            <Textarea
              className="min-h-[220px]"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="生成结果会显示在这里"
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled={!description.trim()} onClick={() => onApplyDescription(description)}>
                应用到描述字段
              </Button>
              <Button variant="ghost" size="sm" disabled={!description.trim()} onClick={() => copyText(description)}>
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                复制
              </Button>
            </div>
          </div>

          <div className="space-y-3 rounded-[1.4rem] border border-border bg-surface/55 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">多语言代码示例</p>
              <Button size="sm" onClick={() => void handleGenerateSnippets()} disabled={loadingSnippets}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                {loadingSnippets ? "生成中..." : "生成代码"}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((language) => (
                <button
                  key={language}
                  type="button"
                  onClick={() => toggleLanguage(language)}
                  className={`rounded-full px-3 py-1.5 text-xs transition-smooth ${
                    selectedLanguages.includes(language)
                      ? "bg-primary/12 text-primary"
                      : "bg-background text-muted-foreground"
                  }`}
                >
                  {language}
                </button>
              ))}
            </div>

            {snippets.length === 0 ? (
              <div className="rounded-[1.2rem] border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                生成后会在这里展示 cURL、TypeScript、Python、Java 等代码片段。
              </div>
            ) : (
              <div className="space-y-3">
                {snippets.map((snippet, index) => (
                  <div className="rounded-[1.2rem] border border-border bg-card/72" key={`${snippet.language}-${index}`}>
                    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{snippet.language}</Badge>
                        <p className="text-sm font-medium text-foreground">{snippet.title}</p>
                      </div>
                      <Button variant="ghost" size="icon-sm" onClick={() => copyText(snippet.code)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <pre className="overflow-x-auto px-4 py-4 text-xs text-foreground">{snippet.code}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
