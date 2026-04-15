"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAuditLogs, type AuditLogDetail } from "@api-hub/api-sdk";
import { Activity, FileJson2, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";

import { ProjectConsoleLayout } from "./project-console-layout";

type Props = { projectId: number };

export function AuditScreen({ projectId }: Props) {
  const [logs, setLogs] = useState<AuditLogDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AuditLogDetail | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchAuditLogs(projectId, 120)
      .then((response) => {
        if (!active) return;
        setLogs(response.data);
        setSelected(response.data[0] ?? null);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "审计日志加载失败");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  const filteredLogs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return logs;
    return logs.filter((item) =>
      `${item.actionType} ${item.resourceType} ${item.resourceName ?? ""} ${item.actorDisplayName}`.toLowerCase().includes(normalized),
    );
  }, [logs, query]);

  return (
    <ProjectConsoleLayout projectId={projectId} title="审计日志">
      <div className="space-y-6">
        {error ? <div className="rounded-[1.4rem] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
        <Card className="rounded-[1.8rem] border-border/80 bg-card/84">
          <CardContent className="flex items-center gap-3 p-5">
            <Activity className="h-4 w-4 text-primary" />
            <Input placeholder="搜索动作、资源、操作人" value={query} onChange={(event) => setQuery(event.target.value)} />
          </CardContent>
        </Card>

        {loading ? (
          <Card className="rounded-[1.8rem] border-border/80 bg-card/84">
            <CardContent className="p-8 text-sm text-muted-foreground">正在加载审计日志...</CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_420px]">
            <Card className="rounded-[1.8rem] border-border/80 bg-card/84">
              <CardContent className="space-y-3 p-5">
                {filteredLogs.length ? (
                  filteredLogs.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelected(item)}
                      className={`w-full rounded-[1.2rem] border p-4 text-left transition-smooth ${selected?.id === item.id ? "border-primary/30 bg-primary/5" : "border-border bg-surface/60 hover:border-primary/20"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{item.resourceName ?? item.resourceType}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{item.actionType}</p>
                        </div>
                        <Badge variant="outline">{item.resourceType}</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>{item.actorDisplayName}</span>
                        <span>{new Date(item.createdAt).toLocaleString("zh-CN")}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-[1rem] border border-dashed border-border px-4 py-10 text-sm text-muted-foreground">当前没有匹配的审计日志。</div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[1.8rem] border-border/80 bg-card/84">
              <CardContent className="space-y-4 p-5">
                {selected ? (
                  <>
                    <div className="flex items-center gap-2">
                      <FileJson2 className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold text-foreground">日志详情</p>
                    </div>
                    <div className="rounded-[1.2rem] border border-border bg-surface/60 p-4">
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <UserRound className="h-4 w-4 text-primary" />
                        <span>{selected.actorDisplayName}</span>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">{selected.actionType}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline">{selected.resourceType}</Badge>
                        {selected.resourceId ? <Badge variant="outline">ID {selected.resourceId}</Badge> : null}
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">{new Date(selected.createdAt).toLocaleString("zh-CN")}</p>
                    </div>
                    <Textarea className="min-h-[360px] font-mono text-xs" readOnly value={selected.detailJson} />
                  </>
                ) : (
                  <div className="rounded-[1rem] border border-dashed border-border px-4 py-10 text-sm text-muted-foreground">选择左侧一条日志查看详情。</div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ProjectConsoleLayout>
  );
}
