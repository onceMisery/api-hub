import { AuditScreen } from "@/features/console/audit-screen";

export default async function AuditPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <AuditScreen projectId={Number(projectId)} />;
}
