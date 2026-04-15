import type { EndpointTreeItem, ModuleTreeItem } from "@api-hub/api-sdk";

export type FlattenedEndpoint = {
  endpoint: EndpointTreeItem;
  moduleId: number;
  groupName: string;
  moduleName: string;
};

export function flattenProjectTree(modules: ModuleTreeItem[]): FlattenedEndpoint[] {
  return modules.flatMap((module) =>
    module.groups.flatMap((group) =>
      group.endpoints.map((endpoint) => ({
        endpoint,
        moduleId: module.id,
        groupName: group.name,
        moduleName: module.name
      }))
    )
  );
}

export function filterModules(modules: ModuleTreeItem[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return modules;
  }

  return modules
    .map((module) => {
      const nextGroups = module.groups
        .map((group) => {
          const endpoints = group.endpoints.filter((endpoint) =>
            `${module.name} ${group.name} ${endpoint.name} ${endpoint.method} ${endpoint.path}`.toLowerCase().includes(normalized)
          );

          if (endpoints.length === 0 && !group.name.toLowerCase().includes(normalized)) {
            return null;
          }

          return {
            ...group,
            endpoints: endpoints.length > 0 ? endpoints : group.endpoints
          };
        })
        .filter((group): group is ModuleTreeItem["groups"][number] => Boolean(group));

      if (nextGroups.length === 0 && !module.name.toLowerCase().includes(normalized)) {
        return null;
      }

      return {
        ...module,
        groups: nextGroups.length > 0 ? nextGroups : module.groups
      };
    })
    .filter((module): module is ModuleTreeItem => Boolean(module));
}

export function findFirstEndpointId(modules: ModuleTreeItem[]) {
  for (const module of modules) {
    for (const group of module.groups) {
      if (group.endpoints[0]) {
        return group.endpoints[0].id;
      }
    }
  }

  return null;
}
