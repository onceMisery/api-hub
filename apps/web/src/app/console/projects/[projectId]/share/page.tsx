import { ProjectConsoleLayout } from "@/features/console/project-console-layout";
import { ShareScreen } from "@/features/console/share-screen";

export default async function SharePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  return (
    <ProjectConsoleLayout
      description="这里集中管理项目的公开分享链接，你可以创建新分享、启停公开访问，并直接预览外部访客看到的文档页面。"
      projectId={Number(projectId)}
      title="分享"
    >
      <ShareScreen projectId={Number(projectId)} />
    </ProjectConsoleLayout>
  );
}
