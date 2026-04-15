import { ApiBrowserScreen } from "@/features/console/api-browser-screen";

export default async function ProjectApiPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ApiBrowserScreen projectId={Number(projectId)} />;
}
