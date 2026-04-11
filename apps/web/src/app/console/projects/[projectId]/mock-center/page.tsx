"use client";

import { useParams } from "next/navigation";

import { ProjectMockCenter } from "../../../../../features/projects/components/project-mock-center";

export default function ProjectMockCenterPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = Number(params.projectId);

  if (Number.isNaN(projectId)) {
    return <main className="p-6 text-sm text-rose-600">Invalid project id.</main>;
  }

  return <ProjectMockCenter projectId={projectId} />;
}
