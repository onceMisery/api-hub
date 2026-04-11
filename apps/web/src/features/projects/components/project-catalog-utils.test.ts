import {
  buildProjectCatalogGroups,
  filterProjects,
  normalizeProjectKey
} from "./project-catalog-utils";

describe("project-catalog-utils", () => {
  const projects = [
    {
      id: 1,
      name: "Admin Project",
      projectKey: "admin-project",
      description: "Can manage members",
      debugAllowedHosts: [],
      currentUserRole: "project_admin",
      canWrite: true,
      canManageMembers: true
    },
    {
      id: 2,
      name: "Editable Project",
      projectKey: "editable-project",
      description: "Can edit but not manage",
      debugAllowedHosts: [],
      currentUserRole: "editor",
      canWrite: true,
      canManageMembers: false
    },
    {
      id: 3,
      name: "Review Project",
      projectKey: "review-project",
      description: "Read only",
      debugAllowedHosts: [],
      currentUserRole: "viewer",
      canWrite: false,
      canManageMembers: false
    }
  ] as never[];

  it("normalizes project keys", () => {
    expect(normalizeProjectKey("  Payment Center API  ")).toBe("payment-center-api");
  });

  it("filters projects by access mode", () => {
    expect(filterProjects(projects, "", "manage")).toHaveLength(1);
    expect(filterProjects(projects, "", "editable")).toHaveLength(2);
    expect(filterProjects(projects, "", "review")).toHaveLength(1);
  });

  it("builds group-first navigation data", () => {
    const groups = buildProjectCatalogGroups(projects);

    expect(groups.map((group) => group.filter)).toEqual(["all", "manage", "editable", "review"]);
    expect(groups[0]?.count).toBe(3);
    expect(groups[1]?.count).toBe(1);
    expect(groups[2]?.count).toBe(2);
    expect(groups[3]?.count).toBe(1);
    expect(groups[1]?.description).toContain("成员");
  });
});
