"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createDictionaryGroup,
  createDictionaryItem,
  createErrorCode,
  deleteDictionaryGroup,
  deleteDictionaryItem,
  deleteErrorCode,
  fetchDictionaryGroups,
  fetchDictionaryItems,
  fetchErrorCodes,
  importDictionaryGroups,
  importErrorCodes,
  updateDictionaryGroup,
  updateDictionaryItem,
  updateErrorCode,
  type DictionaryGroupDetail,
  type DictionaryItemDetail,
  type ErrorCodeDetail,
  type ImportDictionaryPayload,
  type ImportErrorCodePayload,
} from "@api-hub/api-sdk";
import { AlertTriangle, BookMarked, FileJson2, ListTree, Plus, Save, Trash2, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";

import { ProjectConsoleLayout } from "./project-console-layout";

type Props = { projectId: number };
type TabKey = "dictionary" | "error-code";

const DICTIONARY_IMPORT_EXAMPLE = `{
  "groups": [
    {
      "name": "UserStatus",
      "description": "用户状态枚举",
      "items": [
        { "code": "ACTIVE", "value": "激活", "description": "可正常使用", "sortOrder": 0 },
        { "code": "DISABLED", "value": "禁用", "description": "已停用", "sortOrder": 10 }
      ]
    }
  ]
}`;

const ERROR_CODE_IMPORT_EXAMPLE = `{
  "items": [
    {
      "code": "USER_NOT_FOUND",
      "name": "用户不存在",
      "description": "根据用户 ID 未查询到记录",
      "solution": "检查用户 ID 是否正确",
      "httpStatus": 404
    }
  ]
}`;

export function DictionaryScreen({ projectId }: Props) {
  const [tab, setTab] = useState<TabKey>("dictionary");
  const [groups, setGroups] = useState<DictionaryGroupDetail[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [items, setItems] = useState<DictionaryItemDetail[]>([]);
  const [errorCodes, setErrorCodes] = useState<ErrorCodeDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [groupDraft, setGroupDraft] = useState({ name: "", description: "" });
  const [itemDraft, setItemDraft] = useState({ code: "", value: "", description: "", sortOrder: 0 });
  const [errorCodeDraft, setErrorCodeDraft] = useState<{ code: string; name: string; description: string; solution: string; httpStatus: number | null }>({
    code: "",
    name: "",
    description: "",
    solution: "",
    httpStatus: 400,
  });
  const [dictionaryImportText, setDictionaryImportText] = useState(DICTIONARY_IMPORT_EXAMPLE);
  const [errorCodeImportText, setErrorCodeImportText] = useState(ERROR_CODE_IMPORT_EXAMPLE);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );

  async function loadGroups() {
    const response = await fetchDictionaryGroups(projectId);
    setGroups(response.data);
    setSelectedGroupId((current) =>
      current && response.data.some((group) => group.id === current)
        ? current
        : (response.data[0]?.id ?? null),
    );
  }

  async function loadItems(groupId: number) {
    setLoadingItems(true);
    try {
      const response = await fetchDictionaryItems(groupId);
      setItems(response.data);
    } finally {
      setLoadingItems(false);
    }
  }

  async function loadErrorCodes() {
    const response = await fetchErrorCodes(projectId);
    setErrorCodes(response.data);
  }

  async function reloadDictionaryArea() {
    await loadGroups();
    if (selectedGroupId) {
      await loadItems(selectedGroupId);
    }
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([loadGroups(), loadErrorCodes()])
      .catch((loadError) => active && setError(loadError instanceof Error ? loadError.message : "字典中心加载失败"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [projectId]);

  useEffect(() => {
    if (!selectedGroupId) {
      setItems([]);
      return;
    }
    void loadItems(selectedGroupId).catch((loadError) =>
      setError(loadError instanceof Error ? loadError.message : "字典项加载失败"),
    );
  }, [selectedGroupId]);

  function resetNotice() {
    setError(null);
    setMessage(null);
  }

  function parseDictionaryImport(): ImportDictionaryPayload {
    const parsed = JSON.parse(dictionaryImportText) as ImportDictionaryPayload;
    if (!parsed || !Array.isArray(parsed.groups)) {
      throw new Error("字典导入 JSON 必须包含 groups 数组");
    }
    return parsed;
  }

  function parseErrorCodeImport(): ImportErrorCodePayload {
    const parsed = JSON.parse(errorCodeImportText) as ImportErrorCodePayload;
    if (!parsed || !Array.isArray(parsed.items)) {
      throw new Error("错误码导入 JSON 必须包含 items 数组");
    }
    return parsed;
  }

  async function handleCreateGroup() {
    setBusyKey("create-group");
    resetNotice();
    try {
      const response = await createDictionaryGroup(projectId, {
        name: groupDraft.name.trim(),
        description: groupDraft.description.trim(),
      });
      setGroupDraft({ name: "", description: "" });
      setSelectedGroupId(response.data.id);
      setMessage("字典分组已创建");
      await loadGroups();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "字典分组创建失败");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleImportDictionary() {
    setBusyKey("import-dictionary");
    resetNotice();
    try {
      const payload = parseDictionaryImport();
      const response = await importDictionaryGroups(projectId, payload);
      await reloadDictionaryArea();
      setMessage(`字典导入完成，新增分组 ${response.data.createdGroups} 个，更新分组 ${response.data.updatedGroups} 个，新增枚举 ${response.data.createdItems} 项，更新枚举 ${response.data.updatedItems} 项`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "字典导入失败");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleSaveGroup(group: DictionaryGroupDetail) {
    setBusyKey(`group-${group.id}`);
    resetNotice();
    try {
      await updateDictionaryGroup(group.id, {
        name: group.name,
        description: group.description ?? "",
      });
      setMessage("字典分组已更新");
      await loadGroups();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "字典分组更新失败");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDeleteGroup(groupId: number) {
    setBusyKey(`delete-group-${groupId}`);
    resetNotice();
    try {
      await deleteDictionaryGroup(groupId);
      setMessage("字典分组已删除");
      await loadGroups();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "字典分组删除失败");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleCreateItem() {
    if (!selectedGroupId) return;
    setBusyKey("create-item");
    resetNotice();
    try {
      await createDictionaryItem(selectedGroupId, itemDraft);
      setItemDraft({ code: "", value: "", description: "", sortOrder: 0 });
      setMessage("字典项已创建");
      await loadGroups();
      await loadItems(selectedGroupId);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "字典项创建失败");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleSaveItem(item: DictionaryItemDetail) {
    setBusyKey(`item-${item.id}`);
    resetNotice();
    try {
      await updateDictionaryItem(item.id, {
        code: item.code,
        value: item.value,
        description: item.description ?? "",
        sortOrder: item.sortOrder,
      });
      setMessage("字典项已更新");
      if (selectedGroupId) {
        await loadItems(selectedGroupId);
        await loadGroups();
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "字典项更新失败");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDeleteItem(itemId: number) {
    setBusyKey(`delete-item-${itemId}`);
    resetNotice();
    try {
      await deleteDictionaryItem(itemId);
      setMessage("字典项已删除");
      if (selectedGroupId) {
        await loadItems(selectedGroupId);
        await loadGroups();
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "字典项删除失败");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleCreateErrorCode() {
    setBusyKey("create-error-code");
    resetNotice();
    try {
      await createErrorCode(projectId, errorCodeDraft);
      setErrorCodeDraft({ code: "", name: "", description: "", solution: "", httpStatus: 400 });
      setMessage("错误码已创建");
      await loadErrorCodes();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "错误码创建失败");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleImportErrorCodes() {
    setBusyKey("import-error-codes");
    resetNotice();
    try {
      const payload = parseErrorCodeImport();
      const response = await importErrorCodes(projectId, payload);
      await loadErrorCodes();
      setMessage(`错误码导入完成，新增 ${response.data.createdCount} 条，更新 ${response.data.updatedCount} 条`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "错误码导入失败");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleSaveErrorCode(item: ErrorCodeDetail) {
    setBusyKey(`error-code-${item.id}`);
    resetNotice();
    try {
      await updateErrorCode(item.id, {
        code: item.code,
        name: item.name,
        description: item.description ?? "",
        solution: item.solution ?? "",
        httpStatus: item.httpStatus ?? null,
      });
      setMessage("错误码已更新");
      await loadErrorCodes();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "错误码更新失败");
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDeleteErrorCode(id: number) {
    setBusyKey(`delete-error-code-${id}`);
    resetNotice();
    try {
      await deleteErrorCode(id);
      setMessage("错误码已删除");
      await loadErrorCodes();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "错误码删除失败");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <ProjectConsoleLayout projectId={projectId} title="字典中心">
      <div className="space-y-6">
        {error ? (
          <div className="rounded-[1.4rem] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="rounded-[1.4rem] border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
            {message}
          </div>
        ) : null}

        <Card className="rounded-[1.8rem] border-border/80 bg-card/84">
          <CardContent className="flex flex-wrap items-center gap-3 p-5">
            <button
              className={`rounded-full px-4 py-2 text-sm ${tab === "dictionary" ? "bg-primary/10 text-primary" : "bg-surface/60 text-muted-foreground"}`}
              onClick={() => setTab("dictionary")}
              type="button"
            >
              数据字典
            </button>
            <button
              className={`rounded-full px-4 py-2 text-sm ${tab === "error-code" ? "bg-primary/10 text-primary" : "bg-surface/60 text-muted-foreground"}`}
              onClick={() => setTab("error-code")}
              type="button"
            >
              错误码
            </button>
          </CardContent>
        </Card>

        {loading ? (
          <Card className="rounded-[1.8rem] border-border/80 bg-card/84">
            <CardContent className="p-8 text-sm text-muted-foreground">正在加载字典中心...</CardContent>
          </Card>
        ) : tab === "dictionary" ? (
          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="space-y-6">
              <Card className="rounded-[1.8rem] border-border/80 bg-card/84">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center gap-2">
                    <BookMarked className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">字典分组</p>
                  </div>
                  <Input
                    placeholder="分组名称，例如 UserStatus"
                    value={groupDraft.name}
                    onChange={(event) => setGroupDraft((current) => ({ ...current, name: event.target.value }))}
                  />
                  <Textarea
                    placeholder="分组说明"
                    value={groupDraft.description}
                    onChange={(event) => setGroupDraft((current) => ({ ...current, description: event.target.value }))}
                  />
                  <Button disabled={!groupDraft.name.trim() || busyKey === "create-group"} onClick={() => void handleCreateGroup()}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    {busyKey === "create-group" ? "创建中..." : "创建分组"}
                  </Button>
                  <div className="space-y-3">
                    {groups.map((group) => (
                      <div
                        className={`rounded-[1.2rem] border p-4 ${selectedGroupId === group.id ? "border-primary/30 bg-primary/5" : "border-border bg-surface/60"}`}
                        key={group.id}
                      >
                        <button className="w-full text-left" onClick={() => setSelectedGroupId(group.id)} type="button">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">{group.name}</p>
                            <Badge variant="outline">{group.itemCount}</Badge>
                          </div>
                        </button>
                        <Input
                          className="mt-3"
                          value={group.name}
                          onChange={(event) =>
                            setGroups((current) =>
                              current.map((item) => (item.id === group.id ? { ...item, name: event.target.value } : item)),
                            )
                          }
                        />
                        <Textarea
                          className="mt-3"
                          value={group.description ?? ""}
                          onChange={(event) =>
                            setGroups((current) =>
                              current.map((item) => (item.id === group.id ? { ...item, description: event.target.value } : item)),
                            )
                          }
                        />
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" variant="outline" disabled={busyKey === `group-${group.id}`} onClick={() => void handleSaveGroup(group)}>
                            <Save className="mr-1.5 h-3.5 w-3.5" />
                            保存
                          </Button>
                          <Button size="sm" variant="ghost" disabled={busyKey === `delete-group-${group.id}`} onClick={() => void handleDeleteGroup(group.id)}>
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            删除
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[1.8rem] border-border/80 bg-card/84">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center gap-2">
                    <FileJson2 className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">批量导入</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    支持 JSON 粘贴导入。按分组名幂等更新，同分组下按 code 更新枚举项。
                  </p>
                  <Textarea
                    className="min-h-[280px] font-mono text-xs"
                    value={dictionaryImportText}
                    onChange={(event) => setDictionaryImportText(event.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setDictionaryImportText(DICTIONARY_IMPORT_EXAMPLE)}>
                      使用示例
                    </Button>
                    <Button disabled={busyKey === "import-dictionary"} onClick={() => void handleImportDictionary()}>
                      <Upload className="mr-1.5 h-4 w-4" />
                      {busyKey === "import-dictionary" ? "导入中..." : "导入字典"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-[1.8rem] border-border/80 bg-card/84">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-2">
                  <ListTree className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">{selectedGroup ? `${selectedGroup.name} 枚举项` : "枚举项"}</p>
                </div>
                {selectedGroup ? (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input placeholder="Code" value={itemDraft.code} onChange={(event) => setItemDraft((current) => ({ ...current, code: event.target.value }))} />
                      <Input placeholder="Value" value={itemDraft.value} onChange={(event) => setItemDraft((current) => ({ ...current, value: event.target.value }))} />
                    </div>
                    <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)]">
                      <Input type="number" placeholder="排序" value={itemDraft.sortOrder} onChange={(event) => setItemDraft((current) => ({ ...current, sortOrder: Number(event.target.value) || 0 }))} />
                      <Input placeholder="描述" value={itemDraft.description} onChange={(event) => setItemDraft((current) => ({ ...current, description: event.target.value }))} />
                    </div>
                    <Button disabled={!itemDraft.code.trim() || !itemDraft.value.trim() || busyKey === "create-item"} onClick={() => void handleCreateItem()}>
                      <Plus className="mr-1.5 h-4 w-4" />
                      {busyKey === "create-item" ? "创建中..." : "新增枚举项"}
                    </Button>
                    <div className="space-y-3">
                      {loadingItems ? <div className="rounded-[1rem] border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">正在加载枚举项...</div> : null}
                      {items.map((item) => (
                        <div className="rounded-[1.2rem] border border-border bg-surface/60 p-4" key={item.id}>
                          <div className="grid gap-3 md:grid-cols-2">
                            <Input value={item.code} onChange={(event) => setItems((current) => current.map((row) => (row.id === item.id ? { ...row, code: event.target.value } : row)))} />
                            <Input value={item.value} onChange={(event) => setItems((current) => current.map((row) => (row.id === item.id ? { ...row, value: event.target.value } : row)))} />
                          </div>
                          <div className="mt-3 grid gap-3 md:grid-cols-[140px_minmax(0,1fr)]">
                            <Input type="number" value={item.sortOrder} onChange={(event) => setItems((current) => current.map((row) => (row.id === item.id ? { ...row, sortOrder: Number(event.target.value) || 0 } : row)))} />
                            <Input value={item.description ?? ""} onChange={(event) => setItems((current) => current.map((row) => (row.id === item.id ? { ...row, description: event.target.value } : row)))} />
                          </div>
                          <div className="mt-3 flex gap-2">
                            <Button size="sm" variant="outline" disabled={busyKey === `item-${item.id}`} onClick={() => void handleSaveItem(item)}>
                              保存
                            </Button>
                            <Button size="sm" variant="ghost" disabled={busyKey === `delete-item-${item.id}`} onClick={() => void handleDeleteItem(item.id)}>
                              删除
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="rounded-[1rem] border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
                    先在左侧选择或创建一个字典分组。
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_400px]">
            <Card className="rounded-[1.8rem] border-border/80 bg-card/84">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">错误码中心</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input placeholder="错误码，例如 USER_NOT_FOUND" value={errorCodeDraft.code} onChange={(event) => setErrorCodeDraft((current) => ({ ...current, code: event.target.value }))} />
                  <Input placeholder="名称" value={errorCodeDraft.name} onChange={(event) => setErrorCodeDraft((current) => ({ ...current, name: event.target.value }))} />
                </div>
                <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)]">
                  <Input type="number" placeholder="HTTP 状态码" value={errorCodeDraft.httpStatus ?? ""} onChange={(event) => setErrorCodeDraft((current) => ({ ...current, httpStatus: Number(event.target.value) || null }))} />
                  <Input placeholder="处理建议" value={errorCodeDraft.solution} onChange={(event) => setErrorCodeDraft((current) => ({ ...current, solution: event.target.value }))} />
                </div>
                <Textarea placeholder="错误描述" value={errorCodeDraft.description} onChange={(event) => setErrorCodeDraft((current) => ({ ...current, description: event.target.value }))} />
                <Button disabled={!errorCodeDraft.code.trim() || !errorCodeDraft.name.trim() || busyKey === "create-error-code"} onClick={() => void handleCreateErrorCode()}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  {busyKey === "create-error-code" ? "创建中..." : "新增错误码"}
                </Button>
                <div className="space-y-3">
                  {errorCodes.map((item) => (
                    <div className="rounded-[1.2rem] border border-border bg-surface/60 p-4" key={item.id}>
                      <div className="grid gap-3 md:grid-cols-2">
                        <Input value={item.code} onChange={(event) => setErrorCodes((current) => current.map((row) => (row.id === item.id ? { ...row, code: event.target.value } : row)))} />
                        <Input value={item.name} onChange={(event) => setErrorCodes((current) => current.map((row) => (row.id === item.id ? { ...row, name: event.target.value } : row)))} />
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-[140px_minmax(0,1fr)]">
                        <Input type="number" value={item.httpStatus ?? ""} onChange={(event) => setErrorCodes((current) => current.map((row) => (row.id === item.id ? { ...row, httpStatus: Number(event.target.value) || null } : row)))} />
                        <Input value={item.solution ?? ""} onChange={(event) => setErrorCodes((current) => current.map((row) => (row.id === item.id ? { ...row, solution: event.target.value } : row)))} />
                      </div>
                      <Textarea className="mt-3" value={item.description ?? ""} onChange={(event) => setErrorCodes((current) => current.map((row) => (row.id === item.id ? { ...row, description: event.target.value } : row)))} />
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" disabled={busyKey === `error-code-${item.id}`} onClick={() => void handleSaveErrorCode(item)}>
                          保存
                        </Button>
                        <Button size="sm" variant="ghost" disabled={busyKey === `delete-error-code-${item.id}`} onClick={() => void handleDeleteErrorCode(item.id)}>
                          删除
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.8rem] border-border/80 bg-card/84">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-2">
                  <FileJson2 className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">批量导入</p>
                </div>
                <p className="text-sm text-muted-foreground">按错误码 code 幂等更新，不会清空未出现在导入包中的旧记录。</p>
                <Textarea
                  className="min-h-[320px] font-mono text-xs"
                  value={errorCodeImportText}
                  onChange={(event) => setErrorCodeImportText(event.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setErrorCodeImportText(ERROR_CODE_IMPORT_EXAMPLE)}>
                    使用示例
                  </Button>
                  <Button disabled={busyKey === "import-error-codes"} onClick={() => void handleImportErrorCodes()}>
                    <Upload className="mr-1.5 h-4 w-4" />
                    {busyKey === "import-error-codes" ? "导入中..." : "导入错误码"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ProjectConsoleLayout>
  );
}
