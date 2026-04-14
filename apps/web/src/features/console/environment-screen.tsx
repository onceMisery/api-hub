"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createEnvironment,
  deleteEnvironment,
  fetchEnvironments,
  updateEnvironment,
  type DebugTargetRule,
  type EnvironmentDetail,
  type EnvironmentEntry
} from "@api-hub/api-sdk";
import { Copy, Globe, Plus, Save, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";

import { ProjectConsoleLayout } from "./project-console-layout";

type EnvironmentScreenProps = {
  projectId: number;
};

const AUTH_MODES = ["none", "bearer", "api_key_header", "api_key_query", "basic"] as const;
const DEBUG_HOST_MODES = ["inherit", "append", "override"] as const;

const AUTH_MODE_LABELS: Record<(typeof AUTH_MODES)[number], string> = {
  none: "无认证",
  bearer: "Bearer Token",
  api_key_header: "Header API Key",
  api_key_query: "Query API Key",
  basic: "Basic Auth"
};

const DEBUG_HOST_MODE_LABELS: Record<(typeof DEBUG_HOST_MODES)[number], string> = {
  inherit: "继承基础地址",
  append: "拼接调试主机",
  override: "覆盖为调试主机"
};

type AuthMode = (typeof AUTH_MODES)[number];
type DebugHostMode = (typeof DEBUG_HOST_MODES)[number];

type EnvironmentDraft = {
  id: number | null;
  name: string;
  baseUrl: string;
  isDefault: boolean;
  authMode: AuthMode;
  authKey: string;
  authValue: string;
  debugHostMode: DebugHostMode;
  variablesText: string;
  defaultHeadersText: string;
  defaultQueryText: string;
  debugAllowedHostsText: string;
};

function stringifyEntries(entries: EnvironmentEntry[]) {
  return entries.map((entry) => `${entry.name}=${entry.value}`).join("\n");
}

function parseEntries(value: string): EnvironmentEntry[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const index = line.indexOf("=");
      if (index < 0) {
        return { name: line, value: "" };
      }

      return {
        name: line.slice(0, index).trim(),
        value: line.slice(index + 1).trim()
      };
    })
    .filter((entry) => entry.name);
}

function stringifyDebugRules(rules: DebugTargetRule[]) {
  return rules.map((rule) => `${rule.pattern}|${rule.allowPrivate ? "private" : "public"}`).join("\n");
}

function parseDebugRules(value: string): DebugTargetRule[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [pattern, scope] = line.split("|").map((item) => item.trim());
      return {
        pattern,
        allowPrivate: scope === "private"
      };
    })
    .filter((rule) => rule.pattern);
}

function createBlankDraft(): EnvironmentDraft {
  return {
    id: null,
    name: "新环境",
    baseUrl: "",
    isDefault: false,
    authMode: "none",
    authKey: "",
    authValue: "",
    debugHostMode: "inherit",
    variablesText: "",
    defaultHeadersText: "",
    defaultQueryText: "",
    debugAllowedHostsText: ""
  };
}

export function EnvironmentScreen({ projectId }: EnvironmentScreenProps) {
  const [environments, setEnvironments] = useState<EnvironmentDetail[]>([]);
  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<EnvironmentDraft>(createBlankDraft());

  async function loadEnvironments(preferredId?: number | "new" | null) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchEnvironments(projectId);
      setEnvironments(response.data);

      const nextSelectedId =
        preferredId === "new"
          ? "new"
          : response.data.find((item) => item.id === preferredId)?.id ??
            response.data.find((item) => item.isDefault)?.id ??
            response.data[0]?.id ??
            null;

      setSelectedId(nextSelectedId);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载环境列表失败。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEnvironments();
  }, [projectId]);

  const filteredEnvironments = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) {
      return environments;
    }

    return environments.filter((item) => `${item.name} ${item.baseUrl}`.toLowerCase().includes(normalized));
  }, [environments, search]);

  const selectedEnvironment = useMemo(
    () => environments.find((item) => item.id === selectedId) ?? null,
    [environments, selectedId]
  );

  useEffect(() => {
    if (selectedId === "new") {
      setDraft(createBlankDraft());
      return;
    }

    if (!selectedEnvironment) {
      return;
    }

    setDraft({
      id: selectedEnvironment.id,
      name: selectedEnvironment.name,
      baseUrl: selectedEnvironment.baseUrl,
      isDefault: selectedEnvironment.isDefault,
      authMode: selectedEnvironment.authMode,
      authKey: selectedEnvironment.authKey,
      authValue: selectedEnvironment.authValue,
      debugHostMode: selectedEnvironment.debugHostMode,
      variablesText: stringifyEntries(selectedEnvironment.variables),
      defaultHeadersText: stringifyEntries(selectedEnvironment.defaultHeaders),
      defaultQueryText: stringifyEntries(selectedEnvironment.defaultQuery),
      debugAllowedHostsText: stringifyDebugRules(selectedEnvironment.debugAllowedHosts)
    });
  }, [selectedEnvironment, selectedId]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setMessage(null);

    const payload = {
      name: draft.name.trim(),
      baseUrl: draft.baseUrl.trim(),
      isDefault: draft.isDefault,
      variables: parseEntries(draft.variablesText),
      defaultHeaders: parseEntries(draft.defaultHeadersText),
      defaultQuery: parseEntries(draft.defaultQueryText),
      authMode: draft.authMode,
      authKey: draft.authKey.trim(),
      authValue: draft.authValue.trim(),
      debugHostMode: draft.debugHostMode,
      debugAllowedHosts: parseDebugRules(draft.debugAllowedHostsText)
    };

    try {
      if (draft.id == null) {
        const response = await createEnvironment(projectId, payload);
        setMessage("环境已创建。");
        await loadEnvironments(response.data.id);
      } else {
        await updateEnvironment(draft.id, payload);
        setMessage("环境已更新。");
        await loadEnvironments(draft.id);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存环境失败。");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (draft.id == null) {
      setSelectedId(environments[0]?.id ?? null);
      return;
    }

    setDeleting(true);
    setError(null);
    setMessage(null);

    try {
      await deleteEnvironment(draft.id);
      setMessage("环境已删除。");
      await loadEnvironments();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除环境失败。");
    } finally {
      setDeleting(false);
    }
  }

  async function handleCopyBaseUrl() {
    if (!draft.baseUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(draft.baseUrl);
      setMessage("基础 URL 已复制。");
    } catch {
      setError("复制 URL 失败。");
    }
  }

  if (loading) {
    return (
      <ProjectConsoleLayout description="" projectId={projectId} title="环境">
        <div className="rounded-[1.8rem] border border-border bg-card/72 p-8 text-center text-sm text-muted-foreground">正在加载环境工作台...</div>
      </ProjectConsoleLayout>
    );
  }

  return (
    <ProjectConsoleLayout description="" projectId={projectId} title="环境">
      <div className="space-y-6">
        {error ? <div className="rounded-[1.4rem] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
        {message ? <div className="rounded-[1.4rem] border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">{message}</div> : null}

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside>
            <Card className="rounded-[1.8rem] border-border/80 bg-card/84">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">环境列表</p>
                    <h2 className="mt-2 text-xl font-semibold text-foreground">{environments.length} 个环境</h2>
                  </div>

                  <Button onClick={() => setSelectedId("new")} size="sm" variant="outline">
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    新建
                  </Button>
                </div>

                <Input className="mt-4" onChange={(event) => setSearch(event.target.value)} placeholder="搜索环境" value={search} />

                <div className="scrollbar-thin mt-5 max-h-[520px] space-y-3 overflow-y-auto">
                  {filteredEnvironments.map((environment) => (
                    <button
                      className={`w-full rounded-[1.4rem] border px-4 py-4 text-left transition-smooth ${
                        selectedId === environment.id ? "border-primary/30 bg-primary/10" : "border-border bg-surface/60 hover:border-primary/20"
                      }`}
                      key={environment.id}
                      onClick={() => setSelectedId(environment.id)}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{environment.name}</p>
                          <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{environment.baseUrl}</p>
                        </div>
                        {environment.isDefault ? <Badge variant="success">默认</Badge> : null}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>

          <section className="space-y-6">
            <Card className="rounded-[1.8rem] border-border/80 bg-card/84">
              <CardContent className="space-y-5 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">环境编辑器</p>
                    <h2 className="mt-2 text-3xl font-semibold text-foreground">{draft.id == null ? "新环境" : draft.name}</h2>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {draft.baseUrl ? (
                      <Button onClick={() => void handleCopyBaseUrl()} size="sm" variant="outline">
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                        复制 URL
                      </Button>
                    ) : null}

                    <Button disabled={saving} onClick={() => void handleSave()} size="sm">
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                      {saving ? "保存中..." : "保存"}
                    </Button>

                    <Button disabled={deleting} onClick={() => void handleDelete()} size="sm" variant="outline">
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      {deleting ? "删除中..." : draft.id == null ? "取消" : "删除"}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">名称</p>
                    <Input onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} value={draft.name} />
                  </div>

                  <div>
                    <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">基础 URL</p>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input className="pl-10" onChange={(event) => setDraft((current) => ({ ...current, baseUrl: event.target.value }))} value={draft.baseUrl} />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">认证方式</p>
                    <Select onChange={(event) => setDraft((current) => ({ ...current, authMode: event.target.value as AuthMode }))} value={draft.authMode}>
                      {AUTH_MODES.map((mode) => (
                        <option key={mode} value={mode}>
                          {AUTH_MODE_LABELS[mode]}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">认证 Key</p>
                    <Input onChange={(event) => setDraft((current) => ({ ...current, authKey: event.target.value }))} value={draft.authKey} />
                  </div>

                  <div>
                    <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">认证值</p>
                    <Input onChange={(event) => setDraft((current) => ({ ...current, authValue: event.target.value }))} value={draft.authValue} />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[240px_1fr]">
                  <div>
                    <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">调试主机模式</p>
                    <Select onChange={(event) => setDraft((current) => ({ ...current, debugHostMode: event.target.value as DebugHostMode }))} value={draft.debugHostMode}>
                      {DEBUG_HOST_MODES.map((mode) => (
                        <option key={mode} value={mode}>
                          {DEBUG_HOST_MODE_LABELS[mode]}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="flex items-center gap-2 rounded-[1rem] border border-border bg-surface/60 px-4 py-3">
                    <input checked={draft.isDefault} className="h-4 w-4 accent-primary" onChange={(event) => setDraft((current) => ({ ...current, isDefault: event.target.checked }))} type="checkbox" />
                    <span className="text-sm text-foreground">设为默认环境</span>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <EntryBlock
                    label="变量"
                    onChange={(value) => setDraft((current) => ({ ...current, variablesText: value }))}
                    placeholder="API_HOST=https://dev.example.com"
                    value={draft.variablesText}
                  />
                  <EntryBlock
                    label="默认请求头"
                    onChange={(value) => setDraft((current) => ({ ...current, defaultHeadersText: value }))}
                    placeholder="Authorization=Bearer {{token}}"
                    value={draft.defaultHeadersText}
                  />
                  <EntryBlock
                    label="默认查询参数"
                    onChange={(value) => setDraft((current) => ({ ...current, defaultQueryText: value }))}
                    placeholder="locale=zh-CN"
                    value={draft.defaultQueryText}
                  />
                  <EntryBlock
                    label="调试允许主机"
                    onChange={(value) => setDraft((current) => ({ ...current, debugAllowedHostsText: value }))}
                    placeholder={"api.example.com|public\nlocalhost|private"}
                    value={draft.debugAllowedHostsText}
                  />
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </ProjectConsoleLayout>
  );
}

function EntryBlock({
  label,
  value,
  placeholder,
  onChange
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <Textarea className="min-h-[180px] font-mono text-xs" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} />
    </div>
  );
}
