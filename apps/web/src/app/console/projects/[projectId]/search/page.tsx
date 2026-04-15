import { ProjectSearchScreen } from "@/features/console/project-search-screen";

export default async function ProjectSearchPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ProjectSearchScreen projectId={Number(projectId)} />;
}
