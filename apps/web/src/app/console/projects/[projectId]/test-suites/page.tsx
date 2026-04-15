import { TestSuitesScreen } from "@/features/console/test-suites-screen";

export default async function TestSuitesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <TestSuitesScreen projectId={Number(projectId)} />;
}
