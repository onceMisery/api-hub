"use client";

import {
  createProjectShareLink,
  fetchProjectShareLinks,
  updateProjectShareLink,
  type ShareLinkDetail
} from "@api-hub/api-sdk";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useI18n } from "../../../lib/ui-preferences";

type ProjectShareDeskProps = {
  projectId: number;
};

type ShareDrafts = Record<number, string>;
type ShareMetadataDrafts = Record<number, { name: string; description: string }>;

export function ProjectShareDesk({ projectId }: ProjectShareDeskProps) {
  const { t } = useI18n();
  const [shareLinks, setShareLinks] = useState<ShareLinkDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [expiryDrafts, setExpiryDrafts] = useState<ShareDrafts>({});
  const [shareMetadataDrafts, setShareMetadataDrafts] = useState<ShareMetadataDrafts>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    void reloadShareLinks();
  }, [projectId]);

  useEffect(() => {
    setExpiryDrafts(
      Object.fromEntries(shareLinks.map((shareLink) => [shareLink.id, toDateTimeLocalValue(shareLink.expiresAt)]))
    );
    setShareMetadataDrafts(
      Object.fromEntries(
        shareLinks.map((shareLink) => [
          shareLink.id,
          {
            name: shareLink.name,
            description: shareLink.description ?? ""
          }
        ])
      )
    );
  }, [shareLinks]);

  const stats = useMemo(() => {
    const active = shareLinks.filter((shareLink) => shareLink.enabled && !isExpired(shareLink.expiresAt)).length;
    const expired = shareLinks.filter((shareLink) => isExpired(shareLink.expiresAt)).length;

    return {
      active,
      expired,
      total: shareLinks.length
    };
  }, [shareLinks]);

  return (
    <main className="mx-auto flex min-h-screen max-w-[1480px] flex-col gap-6 p-6 text-slate-900">
      <section className="overflow-hidden rounded-[2.4rem] border border-slate-900/80 bg-[linear-gradient(180deg,#1d2028_0%,#0b0d11_100%)] p-6 text-white shadow-[0_30px_90px_rgba(15,23,42,0.20)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">{t("shareDesk.heroEyebrow")}</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">{t("shareDesk.heroTitle")}</h1>
            <p className="mt-4 text-sm leading-7 text-slate-300">{t("shareDesk.heroSubtitle")}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <StatusPill label={t("shareDesk.activeCount", { count: stats.active })} tone="emerald" />
              <StatusPill label={t("shareDesk.expiredCount", { count: stats.expired })} tone="amber" />
              <StatusPill label={t("shareDesk.totalCount", { count: stats.total })} tone="slate" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:w-[420px]">
            <StatCard label={t("shareDesk.state.enabled")} value={stats.active} />
            <StatCard label={t("shareDesk.state.expired")} value={stats.expired} />
            <StatCard label={t("shareDesk.totalCount", { count: 0 }).replace(/^0\s*/, "")} value={stats.total} />
          </div>
        </div>
      </section>

      {error ? <div className="rounded-[1.8rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div> : null}

      <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <form
          className="app-shell-card rounded-[2rem] p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreateShareLink();
          }}
        >
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{t("shareDesk.createEyebrow")}</p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{t("shareDesk.createTitle")}</h2>
            <p className="text-sm leading-6 text-slate-600">{t("shareDesk.createDescription")}</p>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{t("shareDesk.nameLabel")}</span>
              <input
                aria-label={t("shareDesk.nameLabel")}
                className="app-input w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                onChange={(event) => setName(event.target.value)}
                placeholder={t("shareDesk.placeholder.name")}
                value={name}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{t("shareDesk.descriptionLabel")}</span>
              <textarea
                aria-label={t("shareDesk.descriptionLabel")}
                className="app-input min-h-28 w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t("shareDesk.placeholder.description")}
                value={description}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{t("shareDesk.expiryLabel")}</span>
              <input
                aria-label={t("shareDesk.expiryLabel")}
                className="app-input w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                onChange={(event) => setExpiresAt(event.target.value)}
                type="datetime-local"
                value={expiresAt}
              />
            </label>
          </div>

          <button className="app-button-primary mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition hover:opacity-90" type="submit">
            {t("shareDesk.createAction")}
          </button>
        </form>

        <section className="app-shell-card rounded-[2rem] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{t("shareDesk.liveEyebrow")}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{t("shareDesk.liveTitle")}</h2>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">
              {t("shareDesk.projectLabel", { id: projectId })}
            </div>
          </div>

          {isLoading ? (
            <div className="mt-5 rounded-[1.7rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500">
              {t("shareDesk.loading")}
            </div>
          ) : shareLinks.length === 0 ? (
            <div className="mt-5 rounded-[1.7rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500">
              {t("shareDesk.empty")}
            </div>
          ) : (
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {shareLinks.map((shareLink) => {
                const publicUrl = buildPublicShareUrl(shareLink.shareCode);
                const shareState = getShareState(shareLink, t);

                return (
                  <article
                    aria-label={shareLink.name}
                    className="overflow-hidden rounded-[1.8rem] border border-slate-200/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.92))] p-5 shadow-[0_18px_42px_rgba(15,23,42,0.05)]"
                    key={shareLink.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-950">{shareLink.name}</h3>
                          <StatusPill label={shareState.label} tone={shareState.tone} />
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {shareLink.description || t("shareDesk.emptyDescription")}
                        </p>
                      </div>
                      <Link
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        href={`/share/${shareLink.shareCode}`}
                      >
                        {t("shareDesk.openPublicPage")}
                      </Link>
                    </div>

                    <div className="mt-4 rounded-[1.35rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("shareDesk.publicUrl")}</p>
                      <p className="mt-2 break-all font-mono text-sm text-slate-700">{publicUrl}</p>
                    </div>

                    <div className="mt-4 space-y-4">
                      <label className="block space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {t("shareDesk.nameLabelById", { id: shareLink.id })}
                        </span>
                        <input
                          aria-label={t("shareDesk.nameLabelById", { id: shareLink.id })}
                          className="app-input w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                          onChange={(event) =>
                            setShareMetadataDrafts((currentDrafts) => ({
                              ...currentDrafts,
                              [shareLink.id]: {
                                description: currentDrafts[shareLink.id]?.description ?? "",
                                name: event.target.value
                              }
                            }))
                          }
                          value={shareMetadataDrafts[shareLink.id]?.name ?? shareLink.name}
                        />
                      </label>

                      <label className="block space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {t("shareDesk.descriptionLabelById", { id: shareLink.id })}
                        </span>
                        <textarea
                          aria-label={t("shareDesk.descriptionLabelById", { id: shareLink.id })}
                          className="app-input min-h-24 w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                          onChange={(event) =>
                            setShareMetadataDrafts((currentDrafts) => ({
                              ...currentDrafts,
                              [shareLink.id]: {
                                description: event.target.value,
                                name: currentDrafts[shareLink.id]?.name ?? shareLink.name
                              }
                            }))
                          }
                          value={shareMetadataDrafts[shareLink.id]?.description ?? shareLink.description ?? ""}
                        />
                      </label>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {shareLink.expiresAt
                          ? t("shareDesk.validUntilShort", { date: formatShareDate(shareLink.expiresAt) })
                          : t("shareDesk.noExpiry")}
                      </span>
                      {copiedCode === shareLink.shareCode ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">
                          {t("shareDesk.copied")}
                        </span>
                      ) : null}
                    </div>

                    <label className="mt-4 block space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {t("shareDesk.expiryLabelById", { id: shareLink.id })}
                      </span>
                      <input
                        aria-label={t("shareDesk.expiryLabelById", { id: shareLink.id })}
                        className="app-input w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                        onChange={(event) =>
                          setExpiryDrafts((currentDrafts) => ({
                            ...currentDrafts,
                            [shareLink.id]: event.target.value
                          }))
                        }
                        type="datetime-local"
                        value={expiryDrafts[shareLink.id] ?? ""}
                      />
                    </label>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        onClick={() => void handleSaveDetails(shareLink.id)}
                        type="button"
                      >
                        {t("shareDesk.saveDetails")}
                      </button>
                      <button
                        className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        onClick={() => void handleCopyLink(publicUrl, shareLink.shareCode)}
                        type="button"
                      >
                        {t("shareDesk.copy")}
                      </button>
                      <button
                        className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        onClick={() => void handleSaveExpiry(shareLink.id)}
                        type="button"
                      >
                        {t("shareDesk.saveExpiry")}
                      </button>
                      <button
                        className={`rounded-full px-4 py-3 text-sm font-medium text-white transition ${
                          shareLink.enabled ? "bg-rose-500 hover:bg-rose-600" : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                        onClick={() => void handleToggleLink(shareLink)}
                        type="button"
                      >
                        {shareLink.enabled ? t("shareDesk.disable") : t("shareDesk.enable")}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );

  async function reloadShareLinks() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchProjectShareLinks(projectId);
      setShareLinks(response.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load share links");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateShareLink() {
    setError(null);

    try {
      await createProjectShareLink(projectId, {
        name: name.trim(),
        description: description.trim(),
        expiresAt: toIsoValue(expiresAt)
      });
      setName("");
      setDescription("");
      setExpiresAt("");
      await reloadShareLinks();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to create share link");
    }
  }

  async function handleToggleLink(shareLink: ShareLinkDetail) {
    setError(null);

    try {
      await updateProjectShareLink(projectId, shareLink.id, {
        enabled: !shareLink.enabled
      });
      await reloadShareLinks();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update share link");
    }
  }

  async function handleSaveDetails(shareLinkId: number) {
    const draft = shareMetadataDrafts[shareLinkId];
    if (!draft) {
      return;
    }

    setError(null);

    try {
      await updateProjectShareLink(projectId, shareLinkId, {
        description: draft.description.trim(),
        name: draft.name.trim()
      });
      await reloadShareLinks();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update share link");
    }
  }

  async function handleSaveExpiry(shareLinkId: number) {
    setError(null);

    try {
      const nextExpiry = expiryDrafts[shareLinkId] ?? "";
      await updateProjectShareLink(projectId, shareLinkId, {
        ...(nextExpiry.trim()
          ? { expiresAt: toIsoValue(nextExpiry) }
          : { clearExpiry: true })
      });
      await reloadShareLinks();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update share expiry");
    }
  }

  async function handleCopyLink(publicUrl: string, shareCode: string) {
    await navigator.clipboard.writeText(publicUrl);
    setCopiedCode(shareCode);
  }
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.6rem] border border-white/12 bg-white/6 px-5 py-4 text-white shadow-[0_18px_40px_rgba(15,23,42,0.20)]">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "amber" | "emerald" | "rose" | "slate" }) {
  const toneClasses =
    tone === "emerald"
      ? "bg-emerald-100 text-emerald-800"
      : tone === "amber"
        ? "bg-amber-100 text-amber-800"
        : tone === "rose"
          ? "bg-rose-100 text-rose-700"
          : "bg-slate-100 text-slate-600";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${toneClasses}`}>{label}</span>;
}

function getShareState(shareLink: ShareLinkDetail, t: (key: string, values?: Record<string, string | number>) => string) {
  if (isExpired(shareLink.expiresAt)) {
    return {
      label: t("shareDesk.state.expired"),
      tone: "amber" as const
    };
  }

  if (!shareLink.enabled) {
    return {
      label: t("shareDesk.state.disabled"),
      tone: "rose" as const
    };
  }

  return {
    label: t("shareDesk.state.enabled"),
    tone: "emerald" as const
  };
}

function buildPublicShareUrl(shareCode: string) {
  if (typeof window === "undefined") {
    return `http://localhost:3000/share/${shareCode}`;
  }

  return new URL(`/share/${shareCode}`, window.location.origin).toString();
}

function formatShareDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isExpired(value: string | null) {
  if (!value) {
    return false;
  }

  return new Date(value).getTime() < Date.now();
}

function toIsoValue(value: string) {
  if (!value.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toDateTimeLocalValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
