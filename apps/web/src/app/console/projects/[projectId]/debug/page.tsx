import { DebugScreen } from "@/features/console/debug-screen";

export default async function DebugPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <DebugScreen projectId={Number(projectId)} />;
}
