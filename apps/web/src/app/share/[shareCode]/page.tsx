"use client";

import { useParams } from "next/navigation";

import { PublicShareBrowser } from "../../../features/projects/components/public-share-browser";

export default function SharePage() {
  const params = useParams<{ shareCode: string }>();
  const shareCode = params.shareCode?.trim() ?? "";

  if (!shareCode) {
    return <main className="p-6 text-sm text-rose-600">Invalid share code.</main>;
  }

  return <PublicShareBrowser shareCode={shareCode} />;
}
