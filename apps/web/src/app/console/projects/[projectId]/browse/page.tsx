"use client";

import { useParams } from "next/navigation";

import { ProjectDocsBrowser } from "../../../../../features/projects/components/project-docs-browser";

export default function ProjectBrowsePage() {
  const params = useParams<{ projectId: string }>();
  const projectId = Number(params.projectId);

  if (Number.isNaN(projectId)) {
    return <main className="p-6 text-sm text-rose-600">Invalid project id.</main>;
  }

  return <ProjectDocsBrowser projectId={projectId} />;
}
