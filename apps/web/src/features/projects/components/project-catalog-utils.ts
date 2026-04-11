import type { ProjectSummary } from "@api-hub/api-sdk";

export type ProjectCatalogFilter = "all" | "editable" | "review" | "manage";

export type ProjectCatalogGroup = {
  count: number;
  description: string;
  filter: ProjectCatalogFilter;
  label: string;
};

export type ProjectCreateDraft = {
  name: string;
  projectKey: string;
  description: string;
};

export type ProjectDraftErrors = Partial<Record<keyof ProjectCreateDraft, string>>;

type ProjectCatalogTranslator = (key: string) => string;

const PROJECT_CATALOG_GROUP_KEYS: Array<{
  descriptionKey: string;
  filter: ProjectCatalogFilter;
  labelKey: string;
}> = [
  {
    filter: "all",
    labelKey: "catalog.group.all",
    descriptionKey: "catalog.group.all.description"
  },
  {
    filter: "manage",
    labelKey: "catalog.group.manage",
    descriptionKey: "catalog.group.manage.description"
  },
  {
    filter: "editable",
    labelKey: "catalog.group.editable",
    descriptionKey: "catalog.group.editable.description"
  },
  {
    filter: "review",
    labelKey: "catalog.group.review",
    descriptionKey: "catalog.group.review.description"
  }
];

const DEFAULT_PROJECT_CATALOG_MESSAGES: Record<string, string> = {
  "catalog.group.all": "All projects",
  "catalog.group.all.description": "Browse every workspace you can access in this console.",
  "catalog.group.editable": "Editable",
  "catalog.group.editable.description": "Projects where you can shape APIs and runtime behavior.",
  "catalog.group.manage": "Manage members",
  "catalog.group.manage.description": "Projects where you can rebalance collaborators and ownership.",
  "catalog.group.review": "Review only",
  "catalog.group.review.description": "Read-only workspaces for review, browsing, and verification."
};

function translateProjectCatalogKey(key: string) {
  return DEFAULT_PROJECT_CATALOG_MESSAGES[key] ?? key;
}

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

export function buildProjectCatalogGroups(
  projects: ProjectSummary[],
  translate: ProjectCatalogTranslator = translateProjectCatalogKey
): ProjectCatalogGroup[] {
  return PROJECT_CATALOG_GROUP_KEYS.map(({ descriptionKey, filter, labelKey }) => ({
    filter,
    label: translate(labelKey),
    description: translate(descriptionKey),
    count: filterProjects(projects, "", filter).length
  }));
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
    errors.name = "catalog.createDrawer.error.nameRequired";
  }

  if (!draft.projectKey.trim()) {
    errors.projectKey = "catalog.createDrawer.error.keyRequired";
  } else if (!/^[a-z0-9-]+$/.test(draft.projectKey.trim())) {
    errors.projectKey = "catalog.createDrawer.error.keyFormat";
  }

  if (draft.description.trim().length > 280) {
    errors.description = "catalog.createDrawer.error.descriptionTooLong";
  }

  return errors;
}
