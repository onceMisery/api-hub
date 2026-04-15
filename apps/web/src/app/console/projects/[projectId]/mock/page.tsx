import { MockScreen } from "@/features/console/mock-screen";

export default async function ProjectMockPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <MockScreen projectId={Number(projectId)} />;
}
