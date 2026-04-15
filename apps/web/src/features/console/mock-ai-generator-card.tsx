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
    <Card className="rounded-[2rem] border-border/80 bg-card/84">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">AI 智能 Mock</h3>
        </div>

        {error ? <div className="rounded-[1.2rem] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}

        <Textarea
          className="min-h-[92px]"
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

        <pre className="scrollbar-thin max-h-[340px] overflow-auto rounded-[1.3rem] bg-background/70 p-4 text-[11px] text-foreground">
          {generatedBody || "生成结果会显示在这里。AI 会根据当前接口响应结构直接输出一份可用的 JSON 数据。"}
        </pre>
      </CardContent>
    </Card>
  );
}
