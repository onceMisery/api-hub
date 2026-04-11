"use client";

import { useParams } from "next/navigation";

import { ProjectShareDesk } from "../../../../../features/projects/components/project-share-desk";

export default function ProjectSharePage() {
  const params = useParams<{ projectId: string }>();
  const projectId = Number(params.projectId);

  if (Number.isNaN(projectId)) {
    return <main className="p-6 text-sm text-rose-600">Invalid project id.</main>;
  }

  return <ProjectShareDesk projectId={projectId} />;
}
