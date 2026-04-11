import type { MockReleaseDetail, ModuleTreeItem, ParameterDetail, ResponseDetail, VersionDetail } from "@api-hub/api-sdk";

export type TreeCounts = {
  moduleCount: number;
  groupCount: number;
  endpointCount: number;
};

export type ParameterSection = {
  id: string;
  label: string;
  items: ParameterDetail[];
};

export type ResponseSection = {
  id: string;
  label: string;
  items: ResponseDetail[];
};

const PARAMETER_SECTION_LABELS: Record<string, string> = {
  body: "Body parameters",
  cookie: "Cookie parameters",
  header: "Header parameters",
  path: "Path parameters",
  query: "Query parameters"
};

export function countTreeNodes(modules: ModuleTreeItem[]): TreeCounts {
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
}

export function filterProjectTree(modules: ModuleTreeItem[], rawQuery: string) {
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

      const groups = module.groups
        .map((group) => {
          const groupMatches = group.name.toLowerCase().includes(query);
          if (groupMatches) {
            return group;
          }

          const endpoints = group.endpoints.filter((endpoint) =>
            `${endpoint.name} ${endpoint.method} ${endpoint.path}`.toLowerCase().includes(query)
          );

          if (endpoints.length === 0) {
            return null;
          }

          return {
            ...group,
            endpoints
          };
        })
        .filter((group): group is ModuleTreeItem["groups"][number] => group !== null);

      if (groups.length === 0) {
        return null;
      }

      return {
        ...module,
        groups
      };
    })
    .filter((module): module is ModuleTreeItem => module !== null);
}

export function findFirstEndpointId(modules: ModuleTreeItem[]) {
  for (const module of modules) {
    for (const group of module.groups) {
      if (group.endpoints.length > 0) {
        return group.endpoints[0].id;
      }
    }
  }

  return null;
}

export function findExistingEndpointId(modules: ModuleTreeItem[], endpointId?: number | null) {
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

export function groupParameters(parameters: ParameterDetail[]): ParameterSection[] {
  const sections = new Map<string, ParameterDetail[]>();

  for (const parameter of parameters) {
    const sectionKey = parameter.sectionType || "other";
    const currentItems = sections.get(sectionKey) ?? [];
    currentItems.push(parameter);
    sections.set(sectionKey, currentItems);
  }

  return Array.from(sections.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, items]) => ({
      id,
      label: PARAMETER_SECTION_LABELS[id] ?? `${capitalize(id)} parameters`,
      items: [...items].sort((left, right) => left.sortOrder - right.sortOrder)
    }));
}

export function groupResponses(responses: ResponseDetail[]): ResponseSection[] {
  const sections = new Map<number, ResponseDetail[]>();

  for (const response of responses) {
    const currentItems = sections.get(response.httpStatusCode) ?? [];
    currentItems.push(response);
    sections.set(response.httpStatusCode, currentItems);
  }

  return Array.from(sections.entries())
    .sort(([left], [right]) => left - right)
    .map(([statusCode, items]) => ({
      id: String(statusCode),
      label: `HTTP ${statusCode}`,
      items: [...items].sort((left, right) => left.sortOrder - right.sortOrder)
    }));
}

export function findLatestMockRelease(mockReleases: MockReleaseDetail[]) {
  return [...mockReleases].sort((left, right) => {
    if (right.releaseNo !== left.releaseNo) {
      return right.releaseNo - left.releaseNo;
    }

    return (right.createdAt ?? "").localeCompare(left.createdAt ?? "");
  })[0] ?? null;
}

export function findLiveVersion(versions: VersionDetail[], releasedVersionId?: number | null) {
  return (
    versions.find((version) => version.released) ??
    versions.find((version) => version.id === releasedVersionId) ??
    null
  );
}

export function formatEndpointStatus(status: string | null | undefined) {
  switch (status) {
    case "released":
      return "Released";
    case "review":
      return "In review";
    case "deprecated":
      return "Deprecated";
    case "archived":
      return "Archived";
    default:
      return "Draft lane";
  }
}

export function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric"
  }).format(date);
}

function capitalize(value: string) {
  if (!value) {
    return value;
  }

  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
