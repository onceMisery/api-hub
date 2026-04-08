"use client";

import { useParams } from "next/navigation";

import { ProjectShell } from "../../../../features/projects/components/project-shell";

export default function ProjectWorkbenchPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = Number(params.projectId);

  if (Number.isNaN(projectId)) {
    return <main className="p-6 text-sm text-rose-600">Invalid project id.</main>;
  }

  return <ProjectShell projectId={projectId} />;
}
