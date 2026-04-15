import { AiSettingsScreen } from "@/features/console/ai-settings-screen";

export default async function ProjectAiPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <AiSettingsScreen projectId={Number(projectId)} />;
}
