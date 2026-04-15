"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  fetchDictionaryGroups,
  fetchDictionaryItems,
  fetchEnvironments,
  fetchErrorCodes,
  fetchModuleVersionTags,
  fetchProjectTree,
  fetchTestSuites,
  type DictionaryGroupDetail,
  type DictionaryItemDetail,
  type EnvironmentDetail,
  type ErrorCodeDetail,
  type ModuleVersionTagDetail,
  type ProjectTree,
  type TestSuiteSummary,
} from "@api-hub/api-sdk";
import { AlertCircle, Boxes, Database, FlaskConical, Globe, Layers3, Link2, Search, Tag, Workflow } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { ProjectConsoleLayout } from "./project-console-layout";
import { flattenProjectTree } from "./tree-utils";

type Props = {
  projectId: number;
};

type SearchKind =
  | "endpoint"
  | "module"
  | "group"
  | "environment"
  | "dictionaryGroup"
  | "dictionaryItem"
  | "errorCode"
  | "testSuite"
  | "moduleVersionTag";

type SearchResult = {
  kind: SearchKind;
  title: string;
  subtitle: string;
  detail: string;
  href: string;
  tags: string[];
};

type SearchBucket = {
  kind: SearchKind;
  label: string;
  icon: React.ReactNode;
  results: SearchResult[];
};

const KIND_META: Record<SearchKind, { label: string; icon: React.ReactNode }> = {
  endpoint: { label: "接口", icon: <Link2 className="h-4 w-4" /> },
  module: { label: "模块", icon: <Boxes className="h-4 w-4" /> },
  group: { label: "分组", icon: <Layers3 className="h-4 w-4" /> },
  environment: { label: "环境", icon: <Globe className="h-4 w-4" /> },
  dictionaryGroup: { label: "字典分组", icon: <Database className="h-4 w-4" /> },
  dictionaryItem: { label: "字典项", icon: <Database className="h-4 w-4" /> },
  errorCode: { label: "错误码", icon: <AlertCircle className="h-4 w-4" /> },
  testSuite: { label: "测试套件", icon: <FlaskConical className="h-4 w-4" /> },
  moduleVersionTag: { label: "版本 Tag", icon: <Tag className="h-4 w-4" /> },
};

const KIND_ORDER: SearchKind[] = [
  "endpoint",
  "module",
  "group",
  "environment",
  "dictionaryGroup",
  "dictionaryItem",
  "errorCode",
  "testSuite",
  "moduleVersionTag",
];

const QUERY_HINTS = [
  "用户",
  "登录",
  "错误码",
  "mock",
  "环境变量",
  "v2.0.0-release",
];

export function ProjectSearchScreen({ projectId }: Props) {
  const [projectTree, setProjectTree] = useState<ProjectTree>({ modules: [] });
  const [environments, setEnvironments] = useState<EnvironmentDetail[]>([]);
  const [dictionaryGroups, setDictionaryGroups] = useState<DictionaryGroupDetail[]>([]);
  const [dictionaryItemsByGroup, setDictionaryItemsByGroup] = useState<Record<number, DictionaryItemDetail[]>>({});
  const [errorCodes, setErrorCodes] = useState<ErrorCodeDetail[]>([]);
  const [suites, setSuites] = useState<TestSuiteSummary[]>([]);
  const [versionTagsByModule, setVersionTagsByModule] = useState<Record<number, ModuleVersionTagDetail[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("登录");
  const [kindFilter, setKindFilter] = useState<SearchKind | "all">("all");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      setLoading(true);
      setLoadError(null);
      try {
        const [treeResponse, envResponse, groupResponse, errorResponse, suiteResponse] = await Promise.all([
          fetchProjectTree(projectId),
          fetchEnvironments(projectId),
          fetchDictionaryGroups(projectId),
          fetchErrorCodes(projectId),
          fetchTestSuites(projectId),
        ]);

        if (!mounted) {
          return;
        }

        setProjectTree(treeResponse.data);
        setEnvironments(envResponse.data);
        setDictionaryGroups(groupResponse.data);
        setErrorCodes(errorResponse.data);
        setSuites(suiteResponse.data);

        const groupItemEntries = await Promise.all(
          groupResponse.data.map(async (group) => [group.id, (await fetchDictionaryItems(group.id)).data] as const),
        );
        const tagEntries = await Promise.all(
          treeResponse.data.modules.map(async (module) => [module.id, (await fetchModuleVersionTags(module.id)).data] as const),
        );

        if (!mounted) {
          return;
        }

        setDictionaryItemsByGroup(Object.fromEntries(groupItemEntries));
        setVersionTagsByModule(Object.fromEntries(tagEntries));
      } catch (fetchError) {
        if (mounted) {
          setLoadError(fetchError instanceof Error ? fetchError.message : "搜索中心加载失败");
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

  const buckets = useMemo(() => buildBuckets({
    projectTree,
    environments,
    dictionaryGroups,
    dictionaryItemsByGroup,
    errorCodes,
    suites,
    versionTagsByModule,
    projectId,
  }, deferredQuery, kindFilter), [
    deferredQuery,
    dictionaryGroups,
    dictionaryItemsByGroup,
    environments,
    errorCodes,
    kindFilter,
    projectId,
    projectTree,
    suites,
    versionTagsByModule,
  ]);

  const visibleBuckets = buckets.filter((bucket) => bucket.results.length > 0);
  const totalResults = visibleBuckets.reduce((sum, bucket) => sum + bucket.results.length, 0);
  const topModules = projectTree.modules.length;
  const endpointCount = flattenProjectTree(projectTree.modules).length;

  return (
    <ProjectConsoleLayout projectId={projectId} title="搜索中心">
      <div className="space-y-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_320px]">
          <Card className="rounded-[2rem] border-border/80 bg-card/84">
            <CardContent className="space-y-5 p-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary" />
                  <p className="text-lg font-semibold text-foreground">项目搜索中心</p>
                </div>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                  把当前项目里的接口、环境、字典、错误码、测试套件和版本 Tag 聚合到一处，快速定位相关配置和入口。
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-12 rounded-[1.3rem] border-border/80 bg-background/60 pl-11 text-sm"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="搜索接口、路径、环境、字典、错误码、测试套件、版本 Tag"
                    value={query}
                  />
                </div>
                <div className="flex items-center gap-2 rounded-[1.3rem] border border-border/80 bg-surface/70 px-4 py-2 text-xs text-muted-foreground">
                  <span>搜索范围</span>
                  <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]">
                    当前项目
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <ScopeChip active={kindFilter === "all"} label="全部" onClick={() => setKindFilter("all")} />
                {KIND_ORDER.map((kind) => (
                  <ScopeChip
                    active={kindFilter === kind}
                    key={kind}
                    label={KIND_META[kind].label}
                    onClick={() => setKindFilter(kind)}
                  />
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {QUERY_HINTS.map((hint) => (
                  <button
                    className="rounded-full border border-border bg-surface/70 px-3 py-2 text-xs text-muted-foreground transition-fast hover:border-primary/30 hover:text-foreground"
                    key={hint}
                    onClick={() => setQuery(hint)}
                    type="button"
                  >
                    {hint}
                  </button>
                ))}
              </div>

              {loadError ? (
                <div className="rounded-[1.2rem] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {loadError}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Metric label="命中结果" value={totalResults} />
            <Metric label="接口总数" value={endpointCount} />
            <Metric label="模块总数" value={topModules} />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
          <Card className="rounded-[2rem] border-border/80 bg-card/84">
            <CardContent className="space-y-5 p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">搜索结果</p>
                </div>
                <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em]">
                  {loading ? "加载中" : `${totalResults} 条`}
                </Badge>
              </div>

              {loading ? (
                <div className="rounded-[1.4rem] border border-dashed border-border/70 px-6 py-10 text-sm leading-7 text-muted-foreground">
                  正在聚合项目数据...
                </div>
              ) : visibleBuckets.length > 0 ? (
                <div className="space-y-6">
                  {visibleBuckets.map((bucket) => (
                    <section key={bucket.kind}>
                      <div className="mb-3 flex items-center gap-2">
                        <div className="text-primary">{bucket.icon}</div>
                        <p className="text-sm font-semibold text-foreground">{bucket.label}</p>
                        <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px]">
                          {bucket.results.length}
                        </Badge>
                      </div>
                      <div className="grid gap-3">
                        {bucket.results.map((item, index) => (
                          <SearchResultCard item={item} key={`${item.kind}-${item.title}-${index}`} />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-border/70 px-6 py-10 text-sm leading-7 text-muted-foreground">
                  没有找到匹配内容，尝试切换搜索词或范围筛选。
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-border/80 bg-card/84">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-2">
                <Workflow className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">搜索说明</p>
              </div>
              <div className="space-y-3 text-sm leading-7 text-muted-foreground">
                <p>搜索中心会同时扫描接口树、环境、字典、错误码、测试套件和模块版本 Tag。</p>
                <p>如果要进一步缩小范围，可以先点上方的类型筛选，再输入更具体的关键词。</p>
                <p>接口结果会直接跳转到接口编辑页，其他结果会打开对应的项目控制台页面。</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProjectConsoleLayout>
  );
}

function buildBuckets(
  data: {
    projectTree: ProjectTree;
    environments: EnvironmentDetail[];
    dictionaryGroups: DictionaryGroupDetail[];
    dictionaryItemsByGroup: Record<number, DictionaryItemDetail[]>;
    errorCodes: ErrorCodeDetail[];
    suites: TestSuiteSummary[];
    versionTagsByModule: Record<number, ModuleVersionTagDetail[]>;
    projectId: number;
  },
  query: string,
  kindFilter: SearchKind | "all",
): SearchBucket[] {
  const normalized = normalize(query);
  const endpoints = flattenProjectTree(data.projectTree.modules);

  const buckets: SearchBucket[] = [
    {
      kind: "endpoint",
      label: KIND_META.endpoint.label,
      icon: KIND_META.endpoint.icon,
      results: data.projectTree.modules.flatMap((module) =>
        module.groups.flatMap((group) =>
          group.endpoints
            .map((endpoint) => ({
              kind: "endpoint" as const,
              title: endpoint.name,
              subtitle: `${module.name} / ${group.name}`,
              detail: `${endpoint.method} ${endpoint.path}`,
              href: `/console/projects/${data.projectId}/api?endpointId=${endpoint.id}`,
              tags: [module.name, group.name, endpoint.method, endpoint.path, endpoint.name],
            }))
            .filter((item) => matches(item, normalized)),
        ),
      ),
    },
    {
      kind: "module",
      label: KIND_META.module.label,
      icon: KIND_META.module.icon,
      results: data.projectTree.modules
        .map((module) => ({
          kind: "module" as const,
          title: module.name,
          subtitle: "模块",
          detail: `包含 ${module.groups.length} 个分组，${module.groups.reduce((sum, group) => sum + group.endpoints.length, 0)} 个接口`,
          href: `/console/projects/${data.projectId}/api`,
          tags: [module.name],
        }))
        .filter((item) => matches(item, normalized)),
    },
    {
      kind: "group",
      label: KIND_META.group.label,
      icon: KIND_META.group.icon,
      results: data.projectTree.modules.flatMap((module) =>
        module.groups
          .map((group) => ({
            kind: "group" as const,
            title: group.name,
            subtitle: module.name,
            detail: `${group.endpoints.length} 个接口`,
            href: `/console/projects/${data.projectId}/api`,
            tags: [module.name, group.name, ...group.endpoints.map((endpoint) => endpoint.name)],
          }))
          .filter((item) => matches(item, normalized)),
      ),
    },
    {
      kind: "environment",
      label: KIND_META.environment.label,
      icon: KIND_META.environment.icon,
      results: data.environments
        .map((environment) => ({
          kind: "environment" as const,
          title: environment.name,
          subtitle: environment.isDefault ? "默认环境" : "项目环境",
          detail: environment.baseUrl,
          href: `/console/projects/${data.projectId}/environments`,
          tags: [environment.name, environment.baseUrl, environment.authMode, ...environment.variables.map((entry) => entry.name)],
        }))
        .filter((item) => matches(item, normalized)),
    },
    {
      kind: "dictionaryGroup",
      label: KIND_META.dictionaryGroup.label,
      icon: KIND_META.dictionaryGroup.icon,
      results: data.dictionaryGroups
        .map((group) => ({
          kind: "dictionaryGroup" as const,
          title: group.name,
          subtitle: "数据字典",
          detail: group.description || `${group.itemCount} 个字典项`,
          href: `/console/projects/${data.projectId}/dictionary`,
          tags: [group.name, group.description ?? ""],
        }))
        .filter((item) => matches(item, normalized)),
    },
    {
      kind: "dictionaryItem",
      label: KIND_META.dictionaryItem.label,
      icon: KIND_META.dictionaryItem.icon,
      results: data.dictionaryGroups.flatMap((group) =>
        (data.dictionaryItemsByGroup[group.id] ?? [])
          .map((item) => ({
            kind: "dictionaryItem" as const,
            title: `${group.name} / ${item.code}`,
            subtitle: item.value,
            detail: item.description || `排序 ${item.sortOrder}`,
            href: `/console/projects/${data.projectId}/dictionary`,
            tags: [group.name, item.code, item.value, item.description ?? ""],
          }))
          .filter((item) => matches(item, normalized)),
      ),
    },
    {
      kind: "errorCode",
      label: KIND_META.errorCode.label,
      icon: KIND_META.errorCode.icon,
      results: data.errorCodes
        .map((errorCode) => ({
          kind: "errorCode" as const,
          title: `${errorCode.code} · ${errorCode.name}`,
          subtitle: errorCode.httpStatus ? `HTTP ${errorCode.httpStatus}` : "项目错误码",
          detail: errorCode.description || errorCode.solution || "",
          href: `/console/projects/${data.projectId}/dictionary`,
          tags: [errorCode.code, errorCode.name, errorCode.description ?? "", errorCode.solution ?? ""],
        }))
        .filter((item) => matches(item, normalized)),
    },
    {
      kind: "testSuite",
      label: KIND_META.testSuite.label,
      icon: KIND_META.testSuite.icon,
      results: data.suites
        .map((suite) => ({
          kind: "testSuite" as const,
          title: suite.name,
          subtitle: suite.lastExecutionStatus ? `最近执行：${suite.lastExecutionStatus}` : "测试套件",
          detail: suite.description || `${suite.totalSteps} 个步骤`,
          href: `/console/projects/${data.projectId}/test-suites`,
          tags: [suite.name, suite.description ?? "", suite.lastExecutionStatus ?? "", suite.lastExecutionSource ?? ""],
        }))
        .filter((item) => matches(item, normalized)),
    },
    {
      kind: "moduleVersionTag",
      label: KIND_META.moduleVersionTag.label,
      icon: KIND_META.moduleVersionTag.icon,
      results: data.projectTree.modules.flatMap((module) =>
        (data.versionTagsByModule[module.id] ?? [])
          .map((tag) => ({
            kind: "moduleVersionTag" as const,
            title: `${module.name} / ${tag.tagName}`,
            subtitle: tag.description || `${tag.endpointCount} 个接口已冻结`,
            detail: tag.createdAt,
            href: `/console/projects/${data.projectId}/versions`,
            tags: [module.name, tag.tagName, tag.description ?? "", ...tag.endpoints.map((endpoint) => endpoint.endpointName)],
          }))
          .filter((item) => matches(item, normalized)),
      ),
    },
  ];

  return buckets
    .map((bucket) => ({
      ...bucket,
      results: kindFilter === "all" || bucket.kind === kindFilter ? bucket.results : [],
    }))
    .filter((bucket) => bucket.results.length > 0);
}

function matches(item: SearchResult, query: string) {
  if (!query) {
    return true;
  }
  const normalized = normalize([item.title, item.subtitle, item.detail, ...item.tags].join(" "));
  return normalized.includes(query);
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function ScopeChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      className={[
        "rounded-full border px-3 py-2 text-xs transition-fast",
        active ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-surface/70 text-muted-foreground hover:border-primary/20 hover:text-foreground",
      ].join(" ")}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="rounded-[1.5rem] border-border/80 bg-card/84">
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function SearchResultCard({ item }: { item: SearchResult }) {
  return (
    <Link className="block rounded-[1.4rem] border border-border/70 bg-surface/70 p-4 transition-fast hover:border-primary/30 hover:bg-primary/5" href={item.href}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{item.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.subtitle}</p>
        </div>
        <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
          {KIND_META[item.kind].label}
        </Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.detail || "无补充说明"}</p>
    </Link>
  );
}
