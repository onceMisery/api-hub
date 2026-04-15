"use client";

import { useMemo, useState } from "react";
import {
  generateEndpointTestCases,
  type EnvironmentDetail,
  type ModuleTreeItem,
  type TestStepUpsertItem,
} from "@api-hub/api-sdk";
import { Bot, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, Textarea } from "@/components/ui/input";

import { flattenProjectTree } from "./tree-utils";

type Props = {
  modules: ModuleTreeItem[];
  environments: EnvironmentDetail[];
  defaultEnvironmentId: number | null;
  onImportCases: (cases: TestStepUpsertItem[]) => void;
};

const CATEGORY_OPTIONS = ["happy_path", "boundary", "invalid", "auth"];

export function AiTestCasePanel({ modules, environments, defaultEnvironmentId, onImportCases }: Props) {
  const endpointEntries = useMemo(() => flattenProjectTree(modules), [modules]);
  const [endpointId, setEndpointId] = useState<number | null>(endpointEntries[0]?.endpoint.id ?? null);
  const [categories, setCategories] = useState<string[]>(CATEGORY_OPTIONS);
  const [instructions, setInstructions] = useState("");
  const [cases, setCases] = useState<TestStepUpsertItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!endpointId || !defaultEnvironmentId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await generateEndpointTestCases(endpointId, {
        categories,
        instructions,
      });
      setCases(
        response.data.cases.map((item) => ({
          endpointId,
          environmentId: defaultEnvironmentId,
          name: item.name,
          enabled: true,
          queryString: item.queryString ?? "",
          headers: item.headers.map((header) => ({ name: header.name, value: header.value })),
          body: item.body ?? "",
          preScript: "",
          postScript: "",
          assertions: item.assertions.map((assertion) => ({
            type: assertion.type as TestStepUpsertItem["assertions"][number]["type"],
            expression: assertion.expression,
            expectedValue: assertion.expectedValue,
          })),
          extractors: item.extractors.map((extractor) => ({
            variableName: extractor.variableName,
            sourceType: extractor.sourceType as TestStepUpsertItem["extractors"][number]["sourceType"],
            expression: extractor.expression,
          })),
        })),
      );
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "AI 测试建议生成失败");
    } finally {
      setLoading(false);
    }
  }

  function toggleCategory(category: string) {
    setCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category],
    );
  }

  return (
    <Card className="rounded-[1.8rem] border-border/80 bg-card/84">
      <CardContent className="space-y-5 p-5">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">AI 用例建议</p>
        </div>
        <p className="text-sm leading-7 text-muted-foreground">
          选择一个接口后，AI 会基于接口定义生成可直接导入到当前套件的步骤建议，默认绑定当前项目的默认环境。
        </p>

        {error ? <div className="rounded-[1.2rem] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}

        <Select value={endpointId ? String(endpointId) : ""} onChange={(event) => setEndpointId(Number(event.target.value) || null)}>
          {endpointEntries.map((item) => (
            <option key={item.endpoint.id} value={item.endpoint.id}>
              {item.endpoint.name} · {item.endpoint.method} {item.endpoint.path}
            </option>
          ))}
        </Select>

        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => toggleCategory(category)}
              className={`rounded-full px-3 py-1.5 text-xs transition-smooth ${categories.includes(category) ? "bg-primary/12 text-primary" : "bg-surface text-muted-foreground"}`}
            >
              {category}
            </button>
          ))}
        </div>

        <Textarea
          className="min-h-[88px]"
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          placeholder="补充要求，例如：优先覆盖登录态缺失、字段边界值、响应时间断言不超过 800ms。"
        />

        <div className="flex flex-wrap gap-2">
          <Button disabled={loading || !endpointId || !defaultEnvironmentId} onClick={() => void handleGenerate()}>
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            {loading ? "生成中..." : "生成建议"}
          </Button>
          <Button variant="outline" disabled={cases.length === 0} onClick={() => onImportCases(cases)}>
            导入到当前套件
          </Button>
        </div>

        {cases.length === 0 ? (
          <div className="rounded-[1.2rem] border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            生成后会在这里显示推荐步骤，并支持一键追加到当前套件。
          </div>
        ) : (
          <div className="space-y-3">
            {cases.map((item, index) => (
              <div className="rounded-[1.2rem] border border-border bg-surface/60 p-4" key={`${item.name}-${index}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{item.name}</p>
                  <Badge variant="outline">{item.assertions.length} 条断言</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Query: {item.queryString || "-"}</p>
                <p className="mt-2 text-xs text-muted-foreground">Body: {item.body || "-"}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
