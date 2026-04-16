import { ProjectPermissionsScreen } from "@/features/console/project-permissions-screen";

export default async function ProjectPermissionsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ProjectPermissionsScreen projectId={Number(projectId)} />;
}
