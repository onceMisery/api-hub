"use client";

import { useState } from "react";
import { generateEndpointImpactAnalysis, type AiImpactAnalysisResult } from "@api-hub/api-sdk";
import { Bot, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";

type Props = {
  endpointId: number;
  baseVersionId: number | null;
  targetVersionId: number | null;
};

export function AiImpactAnalysisCard({ endpointId, baseVersionId, targetVersionId }: Props) {
  const [instructions, setInstructions] = useState("");
  const [report, setReport] = useState<AiImpactAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!baseVersionId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await generateEndpointImpactAnalysis(endpointId, {
        baseVersionId,
        targetVersionId,
        instructions,
      });
      setReport(response.data);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "AI 影响分析生成失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="rounded-[1.8rem] border-border/80 bg-card/84">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">AI 影响分析</p>
        </div>
        {error ? <div className="rounded-[1.2rem] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
        <Textarea
          className="min-h-[88px]"
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          placeholder="补充要求，例如：更强调前端兼容性、SDK 升级成本、灰度发布建议。"
        />
        <Button disabled={!baseVersionId || loading} onClick={() => void handleGenerate()}>
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          {loading ? "分析中..." : "生成 AI 报告"}
        </Button>

        {report ? (
          <div className="space-y-3">
            <div className="rounded-[1.2rem] border border-border bg-surface/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">影响等级</p>
                <Badge variant={report.level === "high" ? "destructive" : report.level === "medium" ? "warning" : "success"}>
                  {report.level}
                </Badge>
              </div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{report.summary}</p>
            </div>
            <ListCard title="风险点" items={report.risks} />
            <ListCard title="建议动作" items={report.recommendations} />
            <div className="rounded-[1.2rem] border border-border bg-surface/60 p-4">
              <p className="text-sm font-semibold text-foreground">兼容性建议</p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{report.compatibilityAdvice}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-[1.2rem] border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            生成后会输出破坏性判断、风险点和兼容性建议。
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[1.2rem] border border-border bg-surface/60 p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <div className="mt-3 space-y-2">
        {items.length ? (
          items.map((item, index) => (
            <div className="rounded-[0.9rem] border border-border/70 bg-background/40 px-3 py-2 text-xs text-muted-foreground" key={`${title}-${index}`}>
              {item}
            </div>
          ))
        ) : (
          <div className="text-xs text-muted-foreground">暂无</div>
        )}
      </div>
    </div>
  );
}
