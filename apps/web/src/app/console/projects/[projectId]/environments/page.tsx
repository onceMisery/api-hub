import { EnvironmentScreen } from "@/features/console/environment-screen";

export default async function EnvironmentPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <EnvironmentScreen projectId={Number(projectId)} />;
}
