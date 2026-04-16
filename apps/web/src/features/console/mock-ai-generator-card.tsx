"use client";

import { useMemo, useState } from "react";
import { generateEndpointMock, type ResponseDetail } from "@api-hub/api-sdk";
import { Bot, Copy, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";

type Props = {
  endpointId: number;
  endpoint: {
    name: string;
    method: string;
    path: string;
    description?: string;
  };
  responses: ResponseDetail[];
  onApplyGenerated: (body: string) => void;
};

export function MockAiGeneratorCard({ endpointId, endpoint, responses, onApplyGenerated }: Props) {
  const [instructions, setInstructions] = useState("");
  const [generatedBody, setGeneratedBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const draft = useMemo(
    () => ({
      name: endpoint.name,
      method: endpoint.method,
      path: endpoint.path,
      description: endpoint.description ?? "",
      parameters: [],
      responses: responses.map((item) => ({
        httpStatusCode: item.httpStatusCode,
        mediaType: item.mediaType,
        name: item.name ?? "",
        dataType: item.dataType,
        required: item.required,
        description: item.description ?? "",
        exampleValue: item.exampleValue ?? "",
      })),
    }),
    [endpoint.description, endpoint.method, endpoint.name, endpoint.path, responses],
  );

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const response = await generateEndpointMock(endpointId, { instructions, draft });
      setGeneratedBody(response.data.body);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "AI Mock 生成失败");
    } finally {
      setLoading(false);
    }
  }

  function copyText(value: string) {
    if (typeof navigator !== "undefined") {
      void navigator.clipboard.writeText(value);
    }
  }

  return (
    <Card className="overflow-hidden rounded-[2rem] border-border/80 bg-card/85">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              <Bot className="h-3.5 w-3.5" />
              AI Mock Assistant
            </div>
            <h3 className="text-lg font-semibold text-foreground">AI 智能 Mock</h3>
            <p className="text-sm leading-6 text-muted-foreground">基于当前接口响应结构生成更接近真实业务的 JSON 模板。</p>
          </div>
        </div>

        {error ? <div className="rounded-[1.2rem] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}

        <Textarea
          className="min-h-[108px]"
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          placeholder="补充要求，例如：返回更像电商订单、金额保留两位小数、手机号使用中国大陆格式。"
        />

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void handleGenerate()} disabled={loading || responses.length === 0}>
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            {loading ? "生成中..." : "生成 Mock JSON"}
          </Button>
          <Button variant="outline" disabled={!generatedBody.trim()} onClick={() => onApplyGenerated(generatedBody)}>
            应用到当前规则
          </Button>
          <Button variant="ghost" disabled={!generatedBody.trim()} onClick={() => copyText(generatedBody)}>
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            复制
          </Button>
        </div>

        <div className="rounded-[1.3rem] border border-border bg-background/70 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Generated Body</p>
            <p className="text-[11px] text-muted-foreground">{responses.length} 个响应字段</p>
          </div>
          <pre className="scrollbar-thin max-h-[340px] overflow-auto whitespace-pre-wrap break-words text-[11px] leading-6 text-foreground">
            {generatedBody || "点击生成后，这里会显示 AI 输出的 Mock JSON。"}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
