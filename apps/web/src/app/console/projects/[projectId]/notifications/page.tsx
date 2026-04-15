import { NotificationsScreen } from "@/features/console/notifications-screen";

export default async function NotificationsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <NotificationsScreen projectId={Number(projectId)} />;
}
