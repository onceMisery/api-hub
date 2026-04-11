"use client";

import {
  clearDebugHistory,
  createEndpoint,
  executeDebug,
  createEnvironment,
  createGroup,
  createModule,
  createVersion,
  deleteProjectMember,
  deleteEndpoint,
  deleteEnvironment,
  deleteGroup,
  deleteModule,
  fetchEndpoint,
  fetchEndpointMockRules,
  fetchEndpointMockReleases,
  fetchEnvironments,
  fetchProjectMembers,
  fetchProject,
  fetchDebugHistory,
  fetchEndpointParameters,
  fetchEndpointResponses,
  fetchEndpointVersions,
  fetchProjectTree,
  isApiRequestError,
  replaceEndpointParameters,
  replaceEndpointMockRules,
  replaceEndpointResponses,
  publishEndpointMockRelease,
  saveProjectMember,
  simulateEndpointMock,
  updateEndpoint,
  updateEnvironment,
  updateGroup,
  updateModule,
  updateProject,
  type DebugTargetRule,
  type EnvironmentDetail,
  type CreateEnvironmentPayload,
  type DebugExecutionResult,
  type DebugHistoryItem,
  type EndpointDetail,
  type ModuleTreeItem,
  type MockRuleDetail,
  type MockReleaseDetail,
  type MockSimulationPayload,
  type MockSimulationResult,
  type MockRuleUpsertItem,
  type ParameterDetail,
  type ParameterUpsertItem,
  type ProjectDetail,
  type ProjectMemberDetail,
  type ResponseDetail,
  type ResponseUpsertItem,
  type UpsertProjectMemberPayload,
  type UpdateEndpointPayload,
  type UpdateEnvironmentPayload,
  type VersionDetail
} from "@api-hub/api-sdk";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { SessionBar } from "../../auth/components/session-bar";
import { ProjectAccessDrawer } from "./project-access-drawer";
import { ProjectAccessSummaryCard } from "./project-access-summary-card";
import { EndpointEditor } from "./endpoint-editor";
import {
  buildEndpointRestorePayload,
  buildParameterRestorePayload,
  buildResponseRestorePayload,
  type SnapshotShape
} from "./endpoint-editor-utils";
import { DebugConsole } from "./debug-console";
import { EnvironmentPanel } from "./environment-panel";
import { ProjectSidebar } from "./project-sidebar";
import { WorkbenchNotificationCenter, useWorkbenchNotifications } from "./workbench-notification-center";

type ProjectShellProps = {
  projectId: number;
};

export function ProjectShell({ projectId }: ProjectShellProps) {
  const router = useRouter();
  const [modules, setModules] = useState<ModuleTreeItem[]>([]);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMemberDetail[]>([]);
  const [environments, setEnvironments] = useState<EnvironmentDetail[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<number | null>(null);
  const [selectedEndpointId, setSelectedEndpointId] = useState<number | null>(null);
  const [endpoint, setEndpoint] = useState<EndpointDetail | null>(null);
  const [debugHistory, setDebugHistory] = useState<DebugHistoryItem[]>([]);
  const [historyFilters, setHistoryFilters] = useState<{
    environmentId: number | null;
    statusCode: number | null;
    createdFrom: string;
    createdTo: string;
  }>({
    environmentId: null,
    statusCode: null,
    createdFrom: "",
    createdTo: ""
  });
  const [replayDraft, setReplayDraft] = useState<{
    historyId: number;
    queryString: string;
    headersText: string;
    body: string;
  } | null>(null);
  const [parameters, setParameters] = useState<ParameterDetail[]>([]);
  const [responses, setResponses] = useState<ResponseDetail[]>([]);
  const [mockRules, setMockRules] = useState<MockRuleDetail[]>([]);
  const [mockReleases, setMockReleases] = useState<MockReleaseDetail[]>([]);
  const [versions, setVersions] = useState<VersionDetail[]>([]);
  const [isLoadingTree, setIsLoadingTree] = useState(true);
  const [isLoadingEndpoint, setIsLoadingEndpoint] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isAccessDrawerOpen, setIsAccessDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notifications, notify, dismissNotification } = useWorkbenchNotifications();

  useEffect(() => {
    void reloadProject();
  }, [projectId]);

  useEffect(() => {
    void reloadTree();
  }, [projectId]);

  useEffect(() => {
    void reloadEnvironments();
  }, [projectId]);

  useEffect(() => {
    void reloadProjectMembers();
  }, [projectId]);

  useEffect(() => {
    setIsAccessDrawerOpen(false);
  }, [projectId]);

  useEffect(() => {
    if (!selectedEndpointId) {
      setEndpoint(null);
      setDebugHistory([]);
      setReplayDraft(null);
      setParameters([]);
      setResponses([]);
      setMockRules([]);
      setMockReleases([]);
      setVersions([]);
      return;
    }

    const endpointId = selectedEndpointId;
    let isMounted = true;

    async function loadEndpoint() {
      setIsLoadingEndpoint(true);
      setError(null);

      try {
        const [endpointResponse, parameterResponse, responseResponse, mockRuleResponse, mockReleaseResponse, versionsResponse] = await Promise.all([
          fetchEndpoint(endpointId),
          fetchEndpointParameters(endpointId),
          fetchEndpointResponses(endpointId),
          fetchEndpointMockRules(endpointId),
          fetchEndpointMockReleases(endpointId),
          fetchEndpointVersions(endpointId)
        ]);

        if (!isMounted) {
          return;
        }

        setEndpoint(endpointResponse.data);
        setParameters(parameterResponse.data);
        setResponses(responseResponse.data);
        setMockRules(mockRuleResponse.data);
        setMockReleases(mockReleaseResponse.data);
        setVersions(versionsResponse.data);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        if (handleUnauthorized(loadError)) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Failed to load endpoint");
      } finally {
        if (isMounted) {
          setIsLoadingEndpoint(false);
        }
      }
    }

    void loadEndpoint();

    return () => {
      isMounted = false;
    };
  }, [selectedEndpointId]);

  useEffect(() => {
    if (!selectedEndpointId) {
      setDebugHistory([]);
      return;
    }

    let isMounted = true;
    setIsLoadingHistory(true);

    void fetchDebugHistory(projectId, buildDebugHistoryFilters(selectedEndpointId, historyFilters))
      .then((response) => {
        if (isMounted) {
          setDebugHistory(response.data);
        }
      })
      .catch((loadError) => {
        if (!isMounted) {
          return;
        }

        if (handleUnauthorized(loadError)) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Failed to load debug history");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingHistory(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [historyFilters, projectId, selectedEndpointId]);

  const treeStats = useMemo(() => {
    const groupCount = modules.reduce((count, module) => count + module.groups.length, 0);
    const endpointCount = modules.reduce(
      (count, module) => count + module.groups.reduce((groupTotal, group) => groupTotal + group.endpoints.length, 0),
      0
    );

    return {
      endpointCount,
      groupCount,
      moduleCount: modules.length
    };
  }, [modules]);
  const filteredModules = useMemo(() => filterModules(modules, searchQuery), [modules, searchQuery]);
  const canWrite = project?.canWrite ?? false;
  const canManageMembers = project?.canManageMembers ?? false;
  const accessLabel = formatProjectAccess(project?.currentUserRole);
  const projectAdminCount = useMemo(
    () => projectMembers.filter((member) => member.owner || member.roleCode === "project_admin").length,
    [projectMembers]
  );
  const selectedEnvironment = useMemo(
    () => environments.find((environment) => environment.id === selectedEnvironmentId) ?? null,
    [environments, selectedEnvironmentId]
  );
  const filteredStats = useMemo(() => {
    const groupCount = filteredModules.reduce((count, module) => count + module.groups.length, 0);
    const endpointCount = filteredModules.reduce(
      (count, module) => count + module.groups.reduce((groupTotal, group) => groupTotal + group.endpoints.length, 0),
      0
    );

    return {
      endpointCount,
      groupCount,
      moduleCount: filteredModules.length
    };
  }, [filteredModules]);

  function pushSuccess(title: string, detail: string) {
    notify({
      detail,
      title,
      tone: "success"
    });
  }

  function pushError(title: string, detail: string) {
    notify({
      detail,
      title,
      tone: "error"
    });
  }

  useEffect(() => {
    if (!searchQuery.trim()) {
      return;
    }

    const visibleEndpointId = findExistingEndpointId(filteredModules, selectedEndpointId) ?? findFirstEndpointId(filteredModules);
    if (visibleEndpointId !== selectedEndpointId) {
      setSelectedEndpointId(visibleEndpointId);
    }
  }, [filteredModules, searchQuery, selectedEndpointId]);

  return (
    <main className="mx-auto flex min-h-screen max-w-[1400px] flex-col gap-6 p-6 text-slate-900">
      <WorkbenchNotificationCenter notifications={notifications} onDismiss={dismissNotification} />
      <SessionBar />
      <section className="rounded-[2.4rem] border border-white/60 bg-white/65 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.10)] backdrop-blur">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Project Workbench</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Project #{projectId}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Card-based workspace for modules, grouped endpoints, and version snapshots backed by the phase 1 MySQL data model.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                {accessLabel}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                  canWrite ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {canWrite ? "Writable" : "Read-only"}
              </span>
            </div>
            <label className="mt-5 block max-w-md space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Search tree</span>
              <input
                aria-label="Search tree"
                className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search modules, groups, endpoints, or paths"
                value={searchQuery}
              />
            </label>
          </div>
          <div className="grid gap-3 lg:w-[460px]">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="Modules" value={searchQuery.trim() ? filteredStats.moduleCount : treeStats.moduleCount} />
              <StatCard label="Groups" value={searchQuery.trim() ? filteredStats.groupCount : treeStats.groupCount} />
              <StatCard label="Endpoints" value={searchQuery.trim() ? filteredStats.endpointCount : treeStats.endpointCount} />
            </div>
            <ProjectAccessSummaryCard
              canManageMembers={canManageMembers}
              canWrite={canWrite}
              currentUserRole={project?.currentUserRole ?? null}
              memberCount={projectMembers.length}
              onOpen={() => setIsAccessDrawerOpen(true)}
              projectAdminCount={projectAdminCount}
            />
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-[2rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        {isLoadingTree ? (
          <aside className="rounded-[2rem] border border-white/60 bg-white/75 p-5 text-sm text-slate-500 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
            Loading project tree...
          </aside>
        ) : (
          <ProjectSidebar
            canWrite={canWrite}
            emptyStateMessage={searchQuery.trim() ? "No matching nodes." : null}
            modules={filteredModules}
            onCreateEndpoint={handleCreateEndpoint}
            onCreateGroup={handleCreateGroup}
            onCreateModule={handleCreateModule}
            onDeleteEndpoint={handleDeleteEndpointFromTree}
            onDeleteGroup={handleDeleteGroup}
            onDeleteModule={handleDeleteModule}
            onRenameEndpoint={handleRenameEndpoint}
            onRenameGroup={handleRenameGroup}
            onRenameModule={handleRenameModule}
            onSelectEndpoint={setSelectedEndpointId}
            selectedEndpointId={selectedEndpointId}
          />
        )}
        <div className="space-y-6">
          <EnvironmentPanel
            canWrite={canWrite}
            environments={environments}
            projectDebugAllowedHosts={project?.debugAllowedHosts ?? []}
            onCreateEnvironment={handleCreateEnvironment}
            onDeleteEnvironment={handleDeleteEnvironment}
            onSelectEnvironment={setSelectedEnvironmentId}
            onUpdateProjectDebugPolicy={handleUpdateProjectPolicy}
            onUpdateEnvironment={handleUpdateEnvironment}
            selectedEnvironmentId={selectedEnvironmentId}
          />
          <DebugConsole
            canClearHistory={canWrite}
            endpoint={endpoint}
            environment={selectedEnvironment}
            environmentOptions={environments}
            history={debugHistory}
            historyFilters={historyFilters}
            isLoadingHistory={isLoadingHistory}
            onChangeHistoryFilters={setHistoryFilters}
            onClearHistory={handleClearHistory}
            onExecute={handleExecuteDebug}
            onReplayHistory={handleReplayHistory}
            onRunHistory={handleRunHistory}
            projectDebugAllowedHosts={project?.debugAllowedHosts ?? []}
            replayDraft={replayDraft}
          />
          <EndpointEditor
            canWrite={canWrite}
            endpoint={endpoint}
            isLoading={isLoadingEndpoint}
            onDelete={handleDeleteEndpoint}
            onPublishMockRelease={handlePublishMockRelease}
            onRestoreVersion={handleRestoreVersion}
            onSave={handleSaveEndpoint}
            onSaveMockRules={handleSaveMockRules}
            onSaveParameters={handleSaveParameters}
            onSaveResponses={handleSaveResponses}
            onSimulateMock={handleSimulateMock}
            onSaveVersion={handleSaveVersion}
            mockReleases={mockReleases}
            mockRules={mockRules}
            parameters={parameters}
            projectId={projectId}
            responses={responses}
            versions={versions}
          />
        </div>
      </section>
      <ProjectAccessDrawer
        canManageMembers={canManageMembers}
        canWrite={canWrite}
        currentUserRole={project?.currentUserRole ?? null}
        isOpen={isAccessDrawerOpen}
        memberCount={projectMembers.length}
        members={projectMembers}
        onClose={() => setIsAccessDrawerOpen(false)}
        onDeleteMember={handleDeleteProjectMember}
        onSaveMember={handleSaveProjectMember}
        projectAdminCount={projectAdminCount}
      />
    </main>
  );

  async function reloadTree(preferredEndpointId?: number | null) {
    setIsLoadingTree(true);
    setError(null);

    try {
      const response = await fetchProjectTree(projectId);
      setModules(response.data.modules);

      const availableEndpointId = preferredEndpointId ?? selectedEndpointId;
      const nextEndpointId = findExistingEndpointId(response.data.modules, availableEndpointId) ?? findFirstEndpointId(response.data.modules);
      setSelectedEndpointId(nextEndpointId);
    } catch (loadError) {
      if (handleUnauthorized(loadError)) {
        return;
      }

      setError(loadError instanceof Error ? loadError.message : "Failed to load project tree");
    } finally {
      setIsLoadingTree(false);
    }
  }

  async function reloadProject() {
    setError(null);

    try {
      const response = await fetchProject(projectId);
      setProject(response.data);
    } catch (loadError) {
      if (handleUnauthorized(loadError)) {
        return;
      }

      setError(loadError instanceof Error ? loadError.message : "Failed to load project detail");
    }
  }

  async function reloadEnvironments(preferredEnvironmentId?: number | null) {
    try {
      const response = await fetchEnvironments(projectId);
      setEnvironments(response.data);
      const nextEnvironmentId =
        preferredEnvironmentId ??
        response.data.find((environment) => environment.isDefault)?.id ??
        response.data[0]?.id ??
        null;
      setSelectedEnvironmentId(nextEnvironmentId);
    } catch (loadError) {
      if (handleUnauthorized(loadError)) {
        return;
      }

      setError(loadError instanceof Error ? loadError.message : "Failed to load environments");
    }
  }

  async function reloadProjectMembers() {
    try {
      const response = await fetchProjectMembers(projectId);
      setProjectMembers(response.data);
    } catch (loadError) {
      if (handleUnauthorized(loadError)) {
        return;
      }

      setError(loadError instanceof Error ? loadError.message : "Failed to load project members");
    }
  }

  async function handleCreateModule(payload: { name: string }) {
    setError(null);

    try {
      await createModule(projectId, payload);
      await reloadTree();
      pushSuccess("Module created", `${payload.name} was added to the project tree.`);
    } catch (creationError) {
      if (handleUnauthorized(creationError)) {
        return;
      }

      const message = getErrorMessage(creationError, "Failed to create module");
      setError(message);
      pushError("Module create failed", message);
    }
  }

  async function handleCreateEnvironment(payload: CreateEnvironmentPayload) {
    setError(null);

    try {
      const response = await createEnvironment(projectId, payload);
      await reloadEnvironments(response.data.id);
      pushSuccess("Environment created", `${response.data.name} is now available in the workbench.`);
    } catch (creationError) {
      if (handleUnauthorized(creationError)) {
        return;
      }

      const message = getErrorMessage(creationError, "Failed to create environment");
      setError(message);
      pushError("Environment create failed", message);
    }
  }

  async function handleUpdateEnvironment(environmentId: number, payload: UpdateEnvironmentPayload) {
    setError(null);

    try {
      const response = await updateEnvironment(environmentId, payload);
      await reloadEnvironments(response.data.id);
      pushSuccess("Environment saved", `${response.data.name} is ready for debug runs.`);
    } catch (updateError) {
      if (handleUnauthorized(updateError)) {
        return;
      }

      const message = getErrorMessage(updateError, "Failed to update environment");
      setError(message);
      pushError("Environment update failed", message);
    }
  }

  async function handleUpdateProjectPolicy(debugAllowedHosts: DebugTargetRule[]) {
    if (!project) {
      return;
    }

    setError(null);

    try {
      const response = await updateProject(projectId, {
        debugAllowedHosts,
        description: project.description ?? "",
        name: project.name
      });
      setProject(response.data);
      pushSuccess("Project policy saved", "Debug target guardrails were updated.");
    } catch (updateError) {
      if (handleUnauthorized(updateError)) {
        return;
      }

      const message = getErrorMessage(updateError, "Failed to update project debug policy");
      setError(message);
      pushError("Policy update failed", message);
    }
  }

  async function handleSaveProjectMember(payload: UpsertProjectMemberPayload) {
    setError(null);

    try {
      await saveProjectMember(projectId, payload);
      await reloadProjectMembers();
      await reloadProject();
      pushSuccess("Member access saved", `${payload.username} now has ${formatRoleCode(payload.roleCode)} access.`);
    } catch (saveError) {
      if (handleUnauthorized(saveError)) {
        return;
      }

      const message = getErrorMessage(saveError, "Failed to save project member");
      setError(message);
      pushError("Member update failed", message);
      throw saveError;
    }
  }

  async function handleDeleteProjectMember(memberUserId: number) {
    setError(null);
    const memberName = projectMembers.find((member) => member.userId === memberUserId)?.username;

    try {
      await deleteProjectMember(projectId, memberUserId);
      await reloadProjectMembers();
      await reloadProject();
      pushSuccess(
        "Member removed",
        memberName ? `${memberName} was removed from project access.` : "The member was removed from project access."
      );
    } catch (deleteError) {
      if (handleUnauthorized(deleteError)) {
        return;
      }

      const message = getErrorMessage(deleteError, "Failed to delete project member");
      setError(message);
      pushError("Member removal failed", message);
      throw deleteError;
    }
  }

  async function handleDeleteEnvironment(environmentId: number) {
    setError(null);
    const environmentName = environments.find((environment) => environment.id === environmentId)?.name;

    try {
      await deleteEnvironment(environmentId);
      await reloadEnvironments(selectedEnvironmentId === environmentId ? null : selectedEnvironmentId);
      pushSuccess(
        "Environment deleted",
        environmentName ? `${environmentName} was removed from the workbench.` : "The environment was removed from the workbench."
      );
    } catch (deleteError) {
      if (handleUnauthorized(deleteError)) {
        return;
      }

      const message = getErrorMessage(deleteError, "Failed to delete environment");
      setError(message);
      pushError("Environment delete failed", message);
    }
  }

  async function handleRenameModule(moduleId: number, payload: { name: string }) {
    setError(null);

    try {
      await updateModule(moduleId, payload);
      await reloadTree(selectedEndpointId);
      pushSuccess("Module renamed", `${payload.name} is now live in the workbench tree.`);
    } catch (updateError) {
      if (handleUnauthorized(updateError)) {
        return;
      }

      const message = getErrorMessage(updateError, "Failed to rename module");
      setError(message);
      pushError("Module update failed", message);
    }
  }

  async function handleDeleteModule(moduleId: number) {
    setError(null);
    const moduleName = modules.find((module) => module.id === moduleId)?.name;

    try {
      await deleteModule(moduleId);
      await reloadTree();
      pushSuccess(
        "Module deleted",
        moduleName ? `${moduleName} and its groups were removed.` : "The module and its groups were removed."
      );
    } catch (deleteError) {
      if (handleUnauthorized(deleteError)) {
        return;
      }

      const message = getErrorMessage(deleteError, "Failed to delete module");
      setError(message);
      pushError("Module delete failed", message);
    }
  }

  async function handleCreateGroup(moduleId: number, payload: { name: string }) {
    setError(null);

    try {
      await createGroup(moduleId, payload);
      await reloadTree(selectedEndpointId);
      pushSuccess("Group created", `${payload.name} was added to the workbench tree.`);
    } catch (creationError) {
      if (handleUnauthorized(creationError)) {
        return;
      }

      const message = getErrorMessage(creationError, "Failed to create group");
      setError(message);
      pushError("Group create failed", message);
    }
  }

  async function handleRenameGroup(groupId: number, payload: { name: string }) {
    setError(null);

    try {
      await updateGroup(groupId, payload);
      await reloadTree(selectedEndpointId);
      pushSuccess("Group renamed", `${payload.name} is now live in the workbench tree.`);
    } catch (updateError) {
      if (handleUnauthorized(updateError)) {
        return;
      }

      const message = getErrorMessage(updateError, "Failed to rename group");
      setError(message);
      pushError("Group update failed", message);
    }
  }

  async function handleDeleteGroup(groupId: number) {
    setError(null);
    const groupName = findGroupName(modules, groupId);

    try {
      await deleteGroup(groupId);
      await reloadTree();
      pushSuccess(
        "Group deleted",
        groupName ? `${groupName} and its endpoints were removed.` : "The group and its endpoints were removed."
      );
    } catch (deleteError) {
      if (handleUnauthorized(deleteError)) {
        return;
      }

      const message = getErrorMessage(deleteError, "Failed to delete group");
      setError(message);
      pushError("Group delete failed", message);
    }
  }

  async function handleCreateEndpoint(
    groupId: number,
    payload: { name: string; method: string; path: string; description: string }
  ) {
    setError(null);

    try {
      const response = await createEndpoint(groupId, { ...payload, mockEnabled: false });
      await reloadTree(response.data.id);
      pushSuccess("Endpoint created", `${response.data.name} is ready for editing.`);
    } catch (creationError) {
      if (handleUnauthorized(creationError)) {
        return;
      }

      const message = getErrorMessage(creationError, "Failed to create endpoint");
      setError(message);
      pushError("Endpoint create failed", message);
    }
  }

  async function handleSaveEndpoint(payload: UpdateEndpointPayload) {
    if (!selectedEndpointId) {
      return;
    }

    setError(null);

    try {
      const response = await updateEndpoint(selectedEndpointId, payload);
      setEndpoint(response.data);
      await reloadTree(response.data.id);
      pushSuccess("Endpoint saved", `${response.data.method} ${response.data.path} was updated.`);
    } catch (saveError) {
      if (handleUnauthorized(saveError)) {
        return;
      }

      const message = getErrorMessage(saveError, "Failed to save endpoint");
      setError(message);
      pushError("Endpoint save failed", message);
      throw saveError;
    }
  }

  async function handleRenameEndpoint(endpointId: number, payload: UpdateEndpointPayload) {
    setError(null);

    try {
      const description = endpointId === selectedEndpointId ? endpoint?.description ?? payload.description : payload.description;
      const response = await updateEndpoint(endpointId, {
        ...payload,
        description: description ?? "",
        ...(endpointId === selectedEndpointId && endpoint ? { mockEnabled: endpoint.mockEnabled } : {})
      });
      await reloadTree(endpointId);
      pushSuccess("Endpoint renamed", `${response.data.name} is now live in the workbench tree.`);
    } catch (updateError) {
      if (handleUnauthorized(updateError)) {
        return;
      }

      const message = getErrorMessage(updateError, "Failed to rename endpoint");
      setError(message);
      pushError("Endpoint update failed", message);
    }
  }

  async function handleDeleteEndpoint() {
    if (!selectedEndpointId) {
      return;
    }

    setError(null);
    const endpointName = endpoint?.name;

    try {
      await deleteEndpoint(selectedEndpointId);
      await reloadTree();
      pushSuccess(
        "Endpoint deleted",
        endpointName ? `${endpointName} was removed from the workspace.` : "The endpoint was removed from the workspace."
      );
    } catch (deleteError) {
      if (handleUnauthorized(deleteError)) {
        return;
      }

      const message = getErrorMessage(deleteError, "Failed to delete endpoint");
      setError(message);
      pushError("Endpoint delete failed", message);
      throw deleteError;
    }
  }

  async function handleDeleteEndpointFromTree(endpointId: number) {
    setError(null);
    const endpointName = findEndpointName(modules, endpointId);

    try {
      await deleteEndpoint(endpointId);
      if (endpointId === selectedEndpointId) {
        await reloadTree();
      } else {
        await reloadTree(selectedEndpointId);
      }
      pushSuccess(
        "Endpoint deleted",
        endpointName ? `${endpointName} was removed from the workspace.` : "The endpoint was removed from the workspace."
      );
    } catch (deleteError) {
      if (handleUnauthorized(deleteError)) {
        return;
      }

      const message = getErrorMessage(deleteError, "Failed to delete endpoint");
      setError(message);
      pushError("Endpoint delete failed", message);
    }
  }

  async function handleSaveParameters(payload: ParameterUpsertItem[]) {
    if (!selectedEndpointId) {
      return;
    }

    setError(null);

    try {
      await replaceEndpointParameters(selectedEndpointId, payload);
      const response = await fetchEndpointParameters(selectedEndpointId);
      setParameters(response.data);
      pushSuccess("Parameters saved", `${endpoint?.name ?? "Endpoint"} request fields were updated.`);
    } catch (saveError) {
      if (handleUnauthorized(saveError)) {
        return;
      }

      const message = getErrorMessage(saveError, "Failed to save parameters");
      setError(message);
      pushError("Parameter save failed", message);
      throw saveError;
    }
  }

  async function handleSaveResponses(payload: ResponseUpsertItem[]) {
    if (!selectedEndpointId) {
      return;
    }

    setError(null);

    try {
      await replaceEndpointResponses(selectedEndpointId, payload);
      const response = await fetchEndpointResponses(selectedEndpointId);
      setResponses(response.data);
      pushSuccess("Responses saved", `${endpoint?.name ?? "Endpoint"} response drafts were updated.`);
    } catch (saveError) {
      if (handleUnauthorized(saveError)) {
        return;
      }

      const message = getErrorMessage(saveError, "Failed to save responses");
      setError(message);
      pushError("Response save failed", message);
      throw saveError;
    }
  }

  async function handleSaveMockRules(payload: MockRuleUpsertItem[]) {
    if (!selectedEndpointId) {
      return;
    }

    setError(null);

    try {
      await replaceEndpointMockRules(selectedEndpointId, payload);
      const response = await fetchEndpointMockRules(selectedEndpointId);
      setMockRules(response.data);
      pushSuccess("Mock rules saved", `${endpoint?.name ?? "Endpoint"} mock rules are ready for publish.`);
    } catch (saveError) {
      if (handleUnauthorized(saveError)) {
        return;
      }

      const message = getErrorMessage(saveError, "Failed to save mock rules");
      setError(message);
      pushError("Mock rule save failed", message);
      throw saveError;
    }
  }

  async function handlePublishMockRelease() {
    if (!selectedEndpointId) {
      return;
    }

    setError(null);

    try {
      const releaseResponse = await publishEndpointMockRelease(selectedEndpointId);
      const response = await fetchEndpointMockReleases(selectedEndpointId);
      setMockReleases(response.data);
      pushSuccess(
        "Mock release published",
        `Release #${releaseResponse.data.releaseNo} is now available for inspection.`
      );
    } catch (publishError) {
      if (handleUnauthorized(publishError)) {
        return;
      }

      const message = getErrorMessage(publishError, "Failed to publish mock release");
      setError(message);
      pushError("Mock publish failed", message);
      throw publishError;
    }
  }

  async function handleSimulateMock(payload: MockSimulationPayload): Promise<MockSimulationResult> {
    if (!selectedEndpointId) {
      throw new Error("No endpoint selected");
    }

    setError(null);

    try {
      const response = await simulateEndpointMock(selectedEndpointId, payload);
      return response.data;
    } catch (simulationError) {
      if (handleUnauthorized(simulationError)) {
        throw simulationError;
      }

      setError(simulationError instanceof Error ? simulationError.message : "Failed to simulate mock");
      throw simulationError;
    }
  }

  async function handleSaveVersion(payload: { version: string; changeSummary: string }) {
    if (!selectedEndpointId) {
      return;
    }

    setError(null);

    try {
      const createVersionResponse = await createVersion(selectedEndpointId, {
        changeSummary: payload.changeSummary,
        snapshotJson: JSON.stringify(
          {
            endpoint,
            parameters,
            responses
          },
          null,
          2
        ),
        version: payload.version
      });
      const response = await fetchEndpointVersions(selectedEndpointId);
      setVersions(response.data);
      pushSuccess(
        "Version snapshot saved",
        `${createVersionResponse.data.version} was captured from the current draft.`
      );
    } catch (saveError) {
      if (handleUnauthorized(saveError)) {
        return;
      }

      const message = getErrorMessage(saveError, "Failed to save version snapshot");
      setError(message);
      pushError("Version save failed", message);
      throw saveError;
    }
  }

  async function handleRestoreVersion(version: VersionDetail, snapshot: SnapshotShape) {
    if (!selectedEndpointId || !endpoint) {
      return;
    }

    setError(null);

    try {
      await updateEndpoint(selectedEndpointId, buildEndpointRestorePayload(snapshot, endpoint.mockEnabled));
      await replaceEndpointParameters(selectedEndpointId, buildParameterRestorePayload(snapshot));
      await replaceEndpointResponses(selectedEndpointId, buildResponseRestorePayload(snapshot));

      const [endpointResponse, parameterResponse, responseResponse] = await Promise.all([
        fetchEndpoint(selectedEndpointId),
        fetchEndpointParameters(selectedEndpointId),
        fetchEndpointResponses(selectedEndpointId)
      ]);

      setEndpoint(endpointResponse.data);
      setParameters(parameterResponse.data);
      setResponses(responseResponse.data);
      await reloadTree(selectedEndpointId);
      pushSuccess("Version restored", `Draft content now matches ${version.version}.`);
    } catch (restoreError) {
      if (handleUnauthorized(restoreError)) {
        return;
      }

      const message = getErrorMessage(restoreError, `Failed to restore version snapshot ${version.version}`);
      setError(message);
      pushError("Version restore failed", message);
      throw restoreError;
    }
  }

  async function handleExecuteDebug(payload: {
    environmentId: number;
    endpointId: number;
    queryString: string;
    headers: { name: string; value: string }[];
    body: string;
  }): Promise<DebugExecutionResult> {
    setError(null);

    try {
      const response = await executeDebug(payload);
      if (selectedEndpointId) {
        const historyResponse = await fetchDebugHistory(projectId, buildDebugHistoryFilters(selectedEndpointId, historyFilters));
        setDebugHistory(historyResponse.data);
      }
      return response.data;
    } catch (executionError) {
      if (handleUnauthorized(executionError)) {
        throw executionError;
      }

      setError(executionError instanceof Error ? executionError.message : "Failed to execute debug request");
      throw executionError;
    }
  }

  function handleRunHistory(historyItem: DebugHistoryItem) {
    setSelectedEnvironmentId(historyItem.environmentId);
    setReplayDraft({
      body: historyItem.requestBody ?? "",
      headersText: formatHeaderText(historyItem.requestHeaders),
      historyId: historyItem.id,
      queryString: extractQueryString(historyItem.finalUrl)
    });

    return handleExecuteDebug({
      body: historyItem.requestBody ?? "",
      endpointId: historyItem.endpointId,
      environmentId: historyItem.environmentId,
      headers: historyItem.requestHeaders,
      queryString: extractQueryString(historyItem.finalUrl)
    });
  }

  function handleReplayHistory(historyItem: DebugHistoryItem) {
    setSelectedEnvironmentId(historyItem.environmentId);
    setReplayDraft({
      body: historyItem.requestBody ?? "",
      headersText: formatHeaderText(historyItem.requestHeaders),
      historyId: historyItem.id,
      queryString: extractQueryString(historyItem.finalUrl)
    });
  }

  async function handleClearHistory() {
    if (!selectedEndpointId) {
      return;
    }

    setError(null);

    try {
      const response = await clearDebugHistory(projectId, buildDebugHistoryFilters(selectedEndpointId, historyFilters, false));
      const historyResponse = await fetchDebugHistory(projectId, buildDebugHistoryFilters(selectedEndpointId, historyFilters));
      setDebugHistory(historyResponse.data);
      pushSuccess(
        "Debug history cleared",
        response.data.deletedCount === 1 ? "1 request record was removed." : `${response.data.deletedCount} request records were removed.`
      );
    } catch (clearError) {
      if (handleUnauthorized(clearError)) {
        return;
      }

      const message = getErrorMessage(clearError, "Failed to clear debug history");
      setError(message);
      pushError("Debug history clear failed", message);
    }
  }

  function handleUnauthorized(loadError: unknown) {
    if (isApiRequestError(loadError) && loadError.status === 401) {
      router.replace("/login");
      return true;
    }

    return false;
  }
}

function formatProjectAccess(role: string | null | undefined) {
  switch (role) {
    case "project_admin":
      return "Project admin access";
    case "editor":
      return "Editor access";
    case "tester":
      return "Tester access";
    case "viewer":
      return "Viewer access";
    default:
      return "Project access";
  }
}

function formatRoleCode(roleCode: ProjectMemberDetail["roleCode"]) {
  switch (roleCode) {
    case "project_admin":
      return "project admin";
    case "editor":
      return "editor";
    case "tester":
      return "tester";
    case "viewer":
      return "viewer";
    default:
      return "member";
  }
}

function getErrorMessage(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback;
}

function extractQueryString(finalUrl: string) {
  try {
    const url = new URL(finalUrl);
    return url.search.replace(/^\?/, "");
  } catch {
    const questionMarkIndex = finalUrl.indexOf("?");
    return questionMarkIndex === -1 ? "" : finalUrl.slice(questionMarkIndex + 1);
  }
}

function formatHeaderText(headers: { name: string; value: string }[]) {
  return headers.map((header) => `${header.name}: ${header.value}`.trimEnd()).join("\n");
}

function findGroupName(modules: ModuleTreeItem[], groupId: number) {
  for (const module of modules) {
    for (const group of module.groups) {
      if (group.id === groupId) {
        return group.name;
      }
    }
  }

  return null;
}

function findEndpointName(modules: ModuleTreeItem[], endpointId: number) {
  for (const module of modules) {
    for (const group of module.groups) {
      for (const endpoint of group.endpoints) {
        if (endpoint.id === endpointId) {
          return endpoint.name;
        }
      }
    }
  }

  return null;
}

function buildDebugHistoryFilters(
  endpointId: number,
  filters: {
    environmentId: number | null;
    statusCode: number | null;
    createdFrom: string;
    createdTo: string;
  },
  includeLimit = true
) {
  return {
    endpointId,
    environmentId: filters.environmentId ?? undefined,
    statusCode: filters.statusCode ?? undefined,
    createdFrom: toInstantString(filters.createdFrom),
    createdTo: toInstantString(filters.createdTo),
    ...(includeLimit ? { limit: 10 } : {})
  };
}

function toInstantString(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function findFirstEndpointId(modules: ModuleTreeItem[]) {
  for (const module of modules) {
    for (const group of module.groups) {
      if (group.endpoints.length > 0) {
        return group.endpoints[0].id;
      }
    }
  }

  return null;
}

function findExistingEndpointId(modules: ModuleTreeItem[], endpointId?: number | null) {
  if (!endpointId) {
    return null;
  }

  for (const module of modules) {
    for (const group of module.groups) {
      if (group.endpoints.some((endpoint) => endpoint.id === endpointId)) {
        return endpointId;
      }
    }
  }

  return null;
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.5rem] border border-white/60 bg-slate-950 px-5 py-4 text-white shadow-[0_18px_40px_rgba(15,23,42,0.20)]">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function filterModules(modules: ModuleTreeItem[], rawQuery: string) {
  const query = rawQuery.trim().toLowerCase();
  if (!query) {
    return modules;
  }

  return modules
    .map((module) => {
      const moduleMatches = module.name.toLowerCase().includes(query);
      if (moduleMatches) {
        return module;
      }

      const filteredGroups = module.groups
        .map((group) => {
          const groupMatches = group.name.toLowerCase().includes(query);
          if (groupMatches) {
            return group;
          }

          const filteredEndpoints = group.endpoints.filter((endpoint) =>
            `${endpoint.name} ${endpoint.method} ${endpoint.path}`.toLowerCase().includes(query)
          );

          if (filteredEndpoints.length === 0) {
            return null;
          }

          return {
            ...group,
            endpoints: filteredEndpoints
          };
        })
        .filter((group): group is ModuleTreeItem["groups"][number] => group !== null);

      if (filteredGroups.length === 0) {
        return null;
      }

      return {
        ...module,
        groups: filteredGroups
      };
    })
    .filter((module): module is ModuleTreeItem => module !== null);
}
