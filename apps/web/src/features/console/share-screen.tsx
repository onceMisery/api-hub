"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Copy, ExternalLink, PauseCircle, PlayCircle, Share2 } from "lucide-react";
import Link from "next/link";

import {
  createProjectShareLink,
  fetchProjectShareLinks,
  updateProjectShareLink,
  type ShareLinkDetail
} from "@api-hub/api-sdk";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";

type ShareScreenProps = {
  projectId: number;
};

function formatTimestamp(value: string | null) {
  if (!value) {
    return "永不过期";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function resolveErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "请求失败";
}

function isExpired(link: ShareLinkDetail) {
  if (!link.expiresAt) {
    return false;
  }

  return new Date(link.expiresAt).getTime() < Date.now();
}

export function ShareScreen({ projectId }: ShareScreenProps) {
  const [links, setLinks] = useState<ShareLinkDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", expiresAt: "" });
  const [creating, setCreating] = useState(false);
  const [savingLinkId, setSavingLinkId] = useState<number | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<number | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  async function refreshShareLinks() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchProjectShareLinks(projectId);
      setLinks(response.data);
    } catch (fetchError) {
      setError(resolveErrorMessage(fetchError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setCopiedLinkId(null);
    void refreshShareLinks();
  }, [projectId]);

  const stats = useMemo(() => {
    const liveCount = links.filter((link) => link.enabled && !isExpired(link)).length;
    const pausedCount = links.filter((link) => !link.enabled).length;
    const expiredCount = links.filter((link) => isExpired(link)).length;

    return {
      total: links.length,
      liveCount,
      pausedCount,
      expiredCount
    };
  }, [links]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("请先填写分享名称。");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await createProjectShareLink(projectId, {
        name: form.name.trim(),
        description: form.description.trim(),
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null
      });

      setLinks((current) => [response.data, ...current]);
      setForm({ name: "", description: "", expiresAt: "" });
    } catch (createError) {
      setError(resolveErrorMessage(createError));
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleShare(link: ShareLinkDetail) {
    setSavingLinkId(link.id);
    setError(null);

    try {
      const response = await updateProjectShareLink(projectId, link.id, {
        enabled: !link.enabled
      });

      setLinks((current) => current.map((item) => (item.id === response.data.id ? response.data : item)));
    } catch (toggleError) {
      setError(resolveErrorMessage(toggleError));
    } finally {
      setSavingLinkId(null);
    }
  }

  async function handleCopyLink(link: ShareLinkDetail) {
    if (!origin) {
      return;
    }

    try {
      await navigator.clipboard.writeText(`${origin}/share/${link.shareCode}`);
      setCopiedLinkId(link.id);
      window.setTimeout(() => setCopiedLinkId(null), 1800);
    } catch {
      setCopiedLinkId(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-border bg-card/76 p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Share Center</p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">公开分享链接</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
              为合作方、评审或外部访客创建只读文档入口。你可以控制是否启用、是否过期，并随时复制公开地址。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-[1.4rem] border border-border/70 bg-surface/60 px-4 py-3 text-sm">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">总链接</p>
              <p className="mt-2 text-xl font-semibold text-foreground">{stats.total}</p>
            </div>
            <div className="rounded-[1.4rem] border border-border/70 bg-surface/60 px-4 py-3 text-sm">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">在线</p>
              <p className="mt-2 text-xl font-semibold text-foreground">{stats.liveCount}</p>
            </div>
            <div className="rounded-[1.4rem] border border-border/70 bg-surface/60 px-4 py-3 text-sm">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">已停用 / 过期</p>
              <p className="mt-2 text-xl font-semibold text-foreground">{stats.pausedCount + stats.expiredCount}</p>
            </div>
          </div>
        </div>

        <form className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]" onSubmit={handleCreate}>
          <div className="space-y-4 rounded-[1.8rem] border border-border bg-background/58 p-5">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">分享名称</label>
              <Input
                className="mt-2"
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="例如：合作方预览 / SDK 接入文档"
                value={form.name}
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">分享说明</label>
              <Textarea
                className="mt-2 min-h-[120px]"
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="这条分享会给谁使用、主要用于什么场景。"
                value={form.description}
              />
            </div>
          </div>

          <div className="space-y-4 rounded-[1.8rem] border border-border bg-background/58 p-5">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">过期时间</label>
              <Input
                className="mt-2"
                onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))}
                type="datetime-local"
                value={form.expiresAt}
              />
              <p className="mt-2 text-xs text-muted-foreground">留空则表示长期有效。</p>
            </div>

            <Button className="w-full" disabled={!form.name.trim() || creating} type="submit">
              <Share2 className="mr-1.5 h-4 w-4" />
              {creating ? "创建中..." : "生成分享链接"}
            </Button>
          </div>
        </form>

        {error ? <div className="mt-4 rounded-[1.4rem] border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
      </section>

      <section>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Link List</p>
            <h3 className="mt-2 text-lg font-semibold text-foreground">已创建的分享</h3>
          </div>
          <Badge variant={links.length > 0 ? "outline" : "warning"}>{links.length > 0 ? "可管理" : "空状态"}</Badge>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((slot) => (
              <div className="h-44 animate-pulse rounded-[1.8rem] border border-border/70 bg-surface/60" key={slot} />
            ))}
          </div>
        ) : links.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2">
            {links.map((link) => {
              const expired = isExpired(link);
              const publicUrl = origin ? `${origin}/share/${link.shareCode}` : `/share/${link.shareCode}`;

              return (
                <Card className="h-full rounded-[1.8rem] border-border/80 bg-card/90 hover:shadow-card-hover" key={link.id}>
                  <CardContent className="flex h-full flex-col p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-lg font-semibold text-foreground">{link.name}</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{link.description || "这条分享还没有填写说明。"}</p>
                      </div>
                      <Badge variant={link.enabled && !expired ? "success" : expired ? "warning" : "outline"}>
                        {expired ? "已过期" : link.enabled ? "已启用" : "已停用"}
                      </Badge>
                    </div>

                    <div className="mt-5 space-y-3 rounded-[1.4rem] bg-surface/70 px-4 py-4 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">分享码</span>
                        <span className="font-mono text-xs text-foreground">{link.shareCode}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">过期时间</span>
                        <span className="text-xs text-foreground">{formatTimestamp(link.expiresAt)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">最后更新</span>
                        <span className="text-xs text-foreground">{formatTimestamp(link.updatedAt)}</span>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[1.4rem] border border-border bg-background/50 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">公开地址</p>
                      <p className="mt-2 break-all font-mono text-xs text-foreground">{publicUrl}</p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button onClick={() => handleCopyLink(link)} size="sm" type="button" variant="outline">
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                        {copiedLinkId === link.id ? "已复制" : "复制链接"}
                      </Button>
                      <Link href={`/share/${link.shareCode}`} rel="noreferrer" target="_blank">
                        <Button size="sm" type="button" variant="outline">
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                          预览公开页
                        </Button>
                      </Link>
                      <Button disabled={savingLinkId === link.id} onClick={() => handleToggleShare(link)} size="sm" type="button" variant={link.enabled ? "destructive" : "secondary"}>
                        {link.enabled ? <PauseCircle className="mr-1.5 h-3.5 w-3.5" /> : <PlayCircle className="mr-1.5 h-3.5 w-3.5" />}
                        {link.enabled ? "停用" : "启用"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[1.8rem] border border-dashed border-border bg-card/64 p-8 text-center text-sm text-muted-foreground">
            当前项目还没有公开分享链接。创建第一条分享后，外部访客就可以通过公开地址查看只读文档。
          </div>
        )}
      </section>
    </div>
  );
}
