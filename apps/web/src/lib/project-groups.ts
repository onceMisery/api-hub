import type { ProjectSummary } from "@api-hub/api-sdk";

export type ProjectGroup = {
  description: string;
  id: string;
  label: string;
  projects: ProjectSummary[];
};

export function buildProjectGroups(projects: ProjectSummary[]): ProjectGroup[] {
  const groups: ProjectGroup[] = [
    {
      id: "managed",
      label: "我管理的组",
      description: "你拥有成员管理权或项目管理员权限的项目。",
      projects: projects.filter((project) => project.currentUserRole === "project_admin" || project.canManageMembers)
    },
    {
      id: "editable",
      label: "可编辑组",
      description: "你可以直接维护接口、环境和 Mock 的项目。",
      projects: projects.filter((project) => project.canWrite)
    },
    {
      id: "readonly",
      label: "只读协作组",
      description: "当前账号只能浏览、调试或审阅的项目。",
      projects: projects.filter((project) => !project.canWrite)
    },
    {
      id: "all",
      label: "全部项目",
      description: "当前账号可访问的全部项目集合。",
      projects
    }
  ];

  return groups.filter((group, index) => group.projects.length > 0 || index === groups.length - 1);
}

export function formatRoleLabel(role: string | null | undefined) {
  switch (role) {
    case "project_admin":
      return "项目管理员";
    case "editor":
      return "编辑者";
    case "tester":
      return "测试者";
    case "viewer":
      return "只读成员";
    default:
      return "项目成员";
  }
}
