"use client";

import { useEffect, useMemo, useState } from "react";
import {
  deleteProjectResourcePermission,
  fetchProject,
  fetchProjectMembers,
  fetchProjectResourcePermissions,
  fetchProjectTree,
  saveProjectResourcePermission,
  searchUsers,
  type ProjectDetail,
  type ProjectMemberDetail,
  type ProjectResourcePermissionDetail,
  type ProjectTree,
  type UpsertProjectResourcePermissionPayload,
  type UserSearchResult,
} from "@api-hub/api-sdk";
import { CheckCircle2, ChevronRight, FolderTree, Search, ShieldCheck, Trash2, Users, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";

import { ProjectConsoleLayout } from "./project-console-layout";

type Props = { projectId: number };

type PermissionScope = "project" | "group";
type PermissionLevel = "preview" | "manage";

export function ProjectPermissionsScreen({ projectId }: Props) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [tree, setTree] = useState<ProjectTree | null>(null);
  const [members, setMembers] = useState<ProjectMemberDetail[]>([]);
  const [permissions, setPermissions] = useState<ProjectResourcePermissionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [username, setUsername] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [scope, setScope] = useState<PermissionScope>("project");
  const [level, setLevel] = useState<PermissionLevel>("preview");
  const [moduleId, setModuleId] = useState<number | null>(null);
  const [groupId, setGroupId] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    async function bootstrap() {
      try {
        const projectResponse = await fetchProject(projectId);
        if (!mounted) {
          return;
        }
        setProject(projectResponse.data);
        setCanManage(projectResponse.data.canManageMembers);

        const [treeResponse, membersResponse] = await Promise.all([fetchProjectTree(projectId), fetchProjectMembers(projectId)]);
        if (!mounted) {
          return;
        }
        setTree(treeResponse.data);
        setMembers(membersResponse.data);

        if (projectResponse.data.canManageMembers) {
          const permissionsResponse = await fetchProjectResourcePermissions(projectId);
          if (!mounted) {
            return;
          }
          setPermissions(permissionsResponse.data);
        } else {
          setPermissions([]);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "权限页面加载失败");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, [projectId]);

  const modules = tree?.modules ?? [];
  const selectedModule = useMemo(
    () => modules.find((item) => item.id === moduleId) ?? modules[0] ?? null,
    [moduleId, modules],
  );
  const visibleGroups = selectedModule?.groups ?? [];
  const selectedGroup = useMemo(
    () => visibleGroups.find((item) => item.id === groupId) ?? visibleGroups[0] ?? null,
    [groupId, visibleGroups],
  );

  useEffect(() => {
    if (scope !== "group") {
      return;
    }
    if (!moduleId && modules[0]) {
      setModuleId(modules[0].id);
      return;
    }
    if (moduleId && !selectedModule && modules[0]) {
      setModuleId(modules[0].id);
    }
  }, [moduleId, modules, scope, selectedModule]);

  useEffect(() => {
    if (scope !== "group") {
      return;
    }
    if (!selectedModule) {
      return;
    }
    if (!groupId && selectedModule.groups[0]) {
      setGroupId(selectedModule.groups[0].id);
      return;
    }
    if (groupId && !selectedGroup && selectedModule.groups[0]) {
      setGroupId(selectedModule.groups[0].id);
    }
  }, [groupId, scope, selectedGroup, selectedModule]);

  useEffect(() => {
    if (!canManage) {
      setUserResults([]);
      setUserSearchLoading(false);
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      setUserSearchLoading(true);
      void searchUsers(userQuery, 8)
        .then((response) => {
          if (active) {
            setUserResults(response.data);
          }
        })
        .catch(() => {
          if (active) {
            setUserResults([]);
          }
        })
        .finally(() => {
          if (active) {
            setUserSearchLoading(false);
          }
        });
    }, 180);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [canManage, userQuery]);

  const permissionStats = useMemo(() => {
    const projectGrants = permissions.filter((item) => item.resourceType === "project").length;
    const groupGrants = permissions.length - projectGrants;
    return { projectGrants, groupGrants };
  }, [permissions]);

  function selectUser(user: UserSearchResult) {
    setSelectedUser(user);
    setUsername(user.username);
    setUserQuery(user.username);
    setUserPickerOpen(false);
  }

  function clearUser() {
    setSelectedUser(null);
    setUsername("");
    setUserQuery("");
    setUserPickerOpen(false);
  }

  async function handleSave() {
    if (!canManage || !selectedUser) {
      return;
    }
    const payload: UpsertProjectResourcePermissionPayload = {
      resourceType: scope,
      resourceId: scope === "project" ? projectId : groupId,
      username,
      permissionLevel: level,
    };
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await saveProjectResourcePermission(projectId, payload);
      const response = await fetchProjectResourcePermissions(projectId);
      setPermissions(response.data);
      setMessage("资源权限已保存");
      clearUser();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "资源权限保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(permissionId: number) {
    if (!canManage) {
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await deleteProjectResourcePermission(projectId, permissionId);
      const response = await fetchProjectResourcePermissions(projectId);
      setPermissions(response.data);
      setMessage("资源权限已删除");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "资源权限删除失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProjectConsoleLayout projectId={projectId} title="权限管理">
      <div className="space-y-6">
        {error ? <Notice tone="error" text={error} /> : null}
        {message ? <Notice tone="success" text={message} /> : null}

        {!canManage && !loading ? (
          <Card className="rounded-[1.6rem] border-border/80 bg-card/84">
            <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              只有项目管理员可以管理项目或分组授权。当前页面仅可查看资源范围。
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
          <Card className="rounded-[2rem] border-border/80 bg-card/84">
            <CardContent className="space-y-6 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <p className="text-lg font-semibold text-foreground">资源授权</p>
                  </div>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                    给某个用户分配项目级或分组级的预览、管理权限。项目级权限覆盖整个项目，分组级权限只影响当前分组及其接口。
                  </p>
                </div>
                <Badge variant={canManage ? "success" : "outline"}>{canManage ? "可管理" : "只读"}</Badge>
              </div>

              <Field label="授权用户" hint="支持用户名、姓名、邮箱搜索">
                <UserSearchPicker
                  canManage={canManage}
                  loading={userSearchLoading}
                  open={userPickerOpen}
                  onClear={clearUser}
                  onClose={() => setUserPickerOpen(false)}
                  onOpen={() => setUserPickerOpen(true)}
                  onQueryChange={(nextQuery) => {
                    setUserQuery(nextQuery);
                    setUserPickerOpen(true);
                  }}
                  onSelect={selectUser}
                  query={userQuery}
                  results={userResults}
                  selectedUser={selectedUser}
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="权限级别">
                  <div className="grid grid-cols-2 gap-2">
                    <ChoiceButton active={level === "preview"} disabled={!canManage} onClick={() => setLevel("preview")}>
                      预览
                    </ChoiceButton>
                    <ChoiceButton active={level === "manage"} disabled={!canManage} onClick={() => setLevel("manage")}>
                      管理
                    </ChoiceButton>
                  </div>
                </Field>

                <Field label="授权范围">
                  <div className="grid grid-cols-2 gap-2">
                    <ChoiceButton active={scope === "project"} disabled={!canManage} onClick={() => setScope("project")}>
                      项目级
                    </ChoiceButton>
                    <ChoiceButton active={scope === "group"} disabled={!canManage} onClick={() => setScope("group")}>
                      分组级
                    </ChoiceButton>
                  </div>
                </Field>
              </div>

              {scope === "group" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="所属模块">
                    <Select
                      disabled={!canManage}
                      value={moduleId?.toString() ?? ""}
                      onChange={(event) => {
                        const nextModuleId = Number(event.target.value) || null;
                        setModuleId(nextModuleId);
                        const nextModule = modules.find((item) => item.id === nextModuleId) ?? null;
                        setGroupId(nextModule?.groups[0]?.id ?? null);
                      }}
                    >
                      {modules.map((module) => (
                        <option key={module.id} value={module.id}>
                          {module.name}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="目标分组">
                    <Select
                      disabled={!canManage || visibleGroups.length === 0}
                      value={groupId?.toString() ?? ""}
                      onChange={(event) => setGroupId(Number(event.target.value) || null)}
                    >
                      {visibleGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              ) : null}

              <div className="rounded-[1.4rem] border border-border bg-surface/60 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">当前授权预览</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-foreground">
                  <Badge variant="outline">{scope === "project" ? "项目级" : "分组级"}</Badge>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium">{selectedUser ? selectedUser.displayName || selectedUser.username : "未选择用户"}</span>
                  <span className="text-muted-foreground">·</span>
                  <span>{level === "manage" ? "管理" : "预览"}</span>
                  {scope === "group" ? (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span>
                        {selectedModule?.name ?? "未选模块"} / {selectedGroup?.name ?? "未选分组"}
                      </span>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button disabled={!canManage || saving || !selectedUser || (scope === "group" && !groupId)} onClick={() => void handleSave()}>
                  {saving ? "保存中..." : "保存授权"}
                </Button>
                <Button
                  disabled={!canManage || !project}
                  variant="outline"
                  onClick={() => {
                    setScope("project");
                    setLevel("preview");
                    clearUser();
                  }}
                >
                  重置
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-[2rem] border-border/80 bg-card/84">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">成员快捷选择</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {members.slice(0, 8).map((member) => (
                    <button
                      className="rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5"
                      key={member.userId}
                      type="button"
                      onClick={() =>
                        selectUser({
                          id: member.userId,
                          username: member.username,
                          displayName: member.displayName,
                          email: member.email,
                        })
                      }
                    >
                      {member.displayName || member.username}
                    </button>
                  ))}
                  {members.length === 0 ? <p className="text-sm text-muted-foreground">当前项目还没有可快捷选择的成员。</p> : null}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-border/80 bg-card/84">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FolderTree className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">范围概览</p>
                  </div>
                  <Badge variant="outline">
                    {permissionStats.projectGrants} 项目 · {permissionStats.groupGrants} 分组
                  </Badge>
                </div>

                <div className="space-y-3">
                  <StatRow label="项目授权" value={permissionStats.projectGrants} />
                  <StatRow label="分组授权" value={permissionStats.groupGrants} />
                  <StatRow label="模块数量" value={modules.length} />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-border/80 bg-card/84">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">现有授权</p>
                    <p className="mt-1 text-xs text-muted-foreground">项目级授权覆盖整个项目，分组级授权只影响单个分组。</p>
                  </div>
                  <Badge variant="outline">{permissions.length}</Badge>
                </div>

                <div className="space-y-3">
                  {permissions.map((permission) => (
                    <div className="rounded-[1.3rem] border border-border/80 bg-surface/60 px-4 py-4" key={permission.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{permission.displayName || permission.username}</p>
                            <Badge variant={permission.permissionLevel === "manage" ? "success" : "outline"}>
                              {permission.permissionLevel === "manage" ? "管理" : "预览"}
                            </Badge>
                            <Badge variant="outline">{permission.resourceType === "project" ? "项目级" : "分组级"}</Badge>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {permission.username} · {permission.resourceName}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            授权时间 {new Date(permission.createdAt).toLocaleString("zh-CN")}
                          </p>
                        </div>

                        {canManage ? (
                          <Button disabled={saving} size="sm" variant="ghost" onClick={() => void handleDelete(permission.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}

                  {!loading && permissions.length === 0 ? (
                    <div className="rounded-[1.3rem] border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                      还没有任何项目或分组授权记录。
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProjectConsoleLayout>
  );
}

function UserSearchPicker({
  canManage,
  loading,
  open,
  onClear,
  onClose,
  onOpen,
  onQueryChange,
  onSelect,
  query,
  results,
  selectedUser,
}: {
  canManage: boolean;
  loading: boolean;
  open: boolean;
  onClear: () => void;
  onClose: () => void;
  onOpen: () => void;
  onQueryChange: (query: string) => void;
  onSelect: (user: UserSearchResult) => void;
  query: string;
  results: UserSearchResult[];
  selectedUser: UserSearchResult | null;
}) {
  return (
    <div className="space-y-3">
      {selectedUser ? (
        <div className="rounded-[1.3rem] border border-border/80 bg-surface/60 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{selectedUser.displayName || selectedUser.username}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedUser.username}
                {selectedUser.email ? ` · ${selectedUser.email}` : ""}
              </p>
            </div>
            {canManage ? (
              <Button size="sm" variant="ghost" onClick={onClear}>
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-[1.3rem] border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          还未选择用户。
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          disabled={!canManage}
          onBlur={() => window.setTimeout(onClose, 120)}
          onChange={(event) => {
            onQueryChange(event.target.value);
            onOpen();
          }}
          onFocus={onOpen}
          placeholder="搜索用户名、姓名或邮箱"
          className="pl-10"
          value={query}
        />

        {open ? (
          <div className="absolute z-20 mt-2 max-h-72 w-full overflow-hidden rounded-[1.3rem] border border-border bg-card shadow-[0_20px_40px_rgba(0,0,0,0.24)]">
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3 text-xs text-muted-foreground">
              <span>搜索结果</span>
              <span>{loading ? "搜索中..." : `${results.length} 条`}</span>
            </div>
            <div className="max-h-60 overflow-auto p-2">
              {results.length > 0 ? (
                results.map((item) => (
                  <button
                    className="flex w-full items-start justify-between gap-3 rounded-[1rem] px-3 py-3 text-left transition-colors hover:bg-primary/5"
                    key={item.id}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      onSelect(item);
                    }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.displayName || item.username}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.username}
                        {item.email ? ` · ${item.email}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline">选择</Badge>
                  </button>
                ))
              ) : (
                <div className="rounded-[1rem] border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                  {loading ? "正在加载用户..." : "没有匹配的用户"}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
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

function ChoiceButton({
  active,
  children,
  disabled,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex items-center justify-between rounded-[1.1rem] border px-4 py-3 text-sm transition-colors ${
        active ? "border-primary/40 bg-primary/10 text-foreground" : "border-border bg-surface/60 text-muted-foreground hover:border-primary/20 hover:text-foreground"
      } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {children}
      <ChevronRight className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
    </button>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-[1rem] border border-border/70 bg-surface/50 px-4 py-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
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
