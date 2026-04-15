import { VersionsScreen } from "@/features/console/versions-screen";

export default async function VersionsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <VersionsScreen projectId={Number(projectId)} />;
}
