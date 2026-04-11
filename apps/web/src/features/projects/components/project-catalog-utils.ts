import type { ProjectSummary } from "@api-hub/api-sdk";

export type ProjectCatalogFilter = "all" | "editable" | "review" | "manage";

export type ProjectCreateDraft = {
  name: string;
  projectKey: string;
  description: string;
};

export type ProjectDraftErrors = Partial<Record<keyof ProjectCreateDraft, string>>;

export function normalizeProjectKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 64);
}

export function filterProjects(projects: ProjectSummary[], search: string, filter: ProjectCatalogFilter) {
  const query = search.trim().toLowerCase();

  return projects.filter((project) => {
    const matchesQuery =
      !query ||
      `${project.name} ${project.projectKey} ${project.description ?? ""}`.toLowerCase().includes(query);

    if (!matchesQuery) {
      return false;
    }

    switch (filter) {
      case "editable":
        return project.canWrite;
      case "review":
        return !project.canWrite;
      case "manage":
        return project.canManageMembers;
      default:
        return true;
    }
  });
}

export function formatProjectAccess(role: string | null | undefined) {
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

export function formatDebugRuleCount(ruleCount: number) {
  return `${ruleCount} debug rule${ruleCount === 1 ? "" : "s"}`;
}

export function validateProjectDraft(draft: ProjectCreateDraft): ProjectDraftErrors {
  const errors: ProjectDraftErrors = {};

  if (!draft.name.trim()) {
    errors.name = "Project name is required.";
  }

  if (!draft.projectKey.trim()) {
    errors.projectKey = "Project key is required.";
  } else if (!/^[a-z0-9-]+$/.test(draft.projectKey.trim())) {
    errors.projectKey = "Use lowercase letters, digits, and hyphens only.";
  }

  if (draft.description.trim().length > 280) {
    errors.description = "Keep the description within 280 characters.";
  }

  return errors;
}
