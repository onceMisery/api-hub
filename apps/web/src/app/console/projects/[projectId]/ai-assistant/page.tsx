import { AiAssistantScreen } from "@/features/console/ai-assistant-screen";

export default async function ProjectAiAssistantPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <AiAssistantScreen projectId={Number(projectId)} />;
}
