"use client";

import { useState } from "react";
import { exportProjectMarkdown, exportProjectOpenApi } from "@api-hub/api-sdk";
import { Download, FileCode2, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type SpecExportPanelProps = {
  projectId: number;
};

function triggerDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export function SpecExportPanel({ projectId }: SpecExportPanelProps) {
  const [busy, setBusy] = useState<"openapi" | "markdown" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleDownload(type: "openapi" | "markdown") {
    setBusy(type);
    setError(null);
    setMessage(null);
    try {
      const file = type === "openapi" ? await exportProjectOpenApi(projectId) : await exportProjectMarkdown(projectId);
      triggerDownload(file.blob, file.filename ?? `project-export.${type === "openapi" ? "json" : "md"}`);
      setMessage(type === "openapi" ? "OpenAPI export downloaded." : "Markdown export downloaded.");
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Failed to export project docs.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="overflow-hidden rounded-[2rem] border-border/80 bg-card/84">
      <CardContent className="p-0">
        <div className="border-b border-border/80 bg-gradient-to-r from-info/10 via-transparent to-primary/10 px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Download className="h-4 w-4 text-primary" />
                Export Project Docs
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Download the current project documentation as OpenAPI JSON or a readable Markdown handoff.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">project-level</Badge>
              <Badge variant="info">ready to share</Badge>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-6">
          {error ? <div className="rounded-[1.4rem] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
          {message ? <div className="rounded-[1.4rem] border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">{message}</div> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-border bg-surface/60 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-info/12 text-info">
                  <FileCode2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">OpenAPI JSON</p>
                  <p className="mt-1 text-xs text-muted-foreground">For gateways, SDK generation, linting, and external tooling.</p>
                </div>
              </div>
              <Button className="mt-5 w-full" disabled={busy !== null} onClick={() => void handleDownload("openapi")} variant="outline">
                {busy === "openapi" ? "Exporting..." : "Download OpenAPI"}
              </Button>
            </div>

            <div className="rounded-[1.5rem] border border-border bg-surface/60 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Markdown Docs</p>
                  <p className="mt-1 text-xs text-muted-foreground">For handoff, PR review, onboarding, or offline documentation packs.</p>
                </div>
              </div>
              <Button className="mt-5 w-full" disabled={busy !== null} onClick={() => void handleDownload("markdown")} variant="outline">
                {busy === "markdown" ? "Exporting..." : "Download Markdown"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
