import { fetchPublicShare } from "@api-hub/api-sdk";

import { PublicShareScreen } from "@/features/share/public-share-screen";

export default async function PublicSharePage({
  params,
  searchParams
}: {
  params: Promise<{ shareCode: string }>;
  searchParams: Promise<{ endpointId?: string | string[] }>;
}) {
  const { shareCode } = await params;
  const resolvedSearchParams = await searchParams;
  const shareResponse = await fetchPublicShare(shareCode);
  const share = shareResponse.data;

  const rawEndpointId = Array.isArray(resolvedSearchParams.endpointId)
    ? resolvedSearchParams.endpointId[0]
    : resolvedSearchParams.endpointId;
  const parsedEndpointId = rawEndpointId ? Number(rawEndpointId) : undefined;
  const initialEndpointId = Number.isNaN(parsedEndpointId) ? undefined : parsedEndpointId;

  return <PublicShareScreen initialEndpointId={initialEndpointId} share={share} shareCode={shareCode} />;
}
