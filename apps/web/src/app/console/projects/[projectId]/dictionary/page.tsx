import { DictionaryScreen } from "@/features/console/dictionary-screen";

export default async function DictionaryPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <DictionaryScreen projectId={Number(projectId)} />;
}
