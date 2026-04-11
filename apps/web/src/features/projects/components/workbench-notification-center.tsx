"use client";

import { useEffect, useRef, useState } from "react";

export type WorkbenchNotificationTone = "success" | "error" | "neutral";

export type WorkbenchNotification = {
  id: string;
  tone: WorkbenchNotificationTone;
  title: string;
  detail?: string;
};

type WorkbenchNotificationInput = Omit<WorkbenchNotification, "id">;

type UseWorkbenchNotificationsOptions = {
  durationMs?: number;
  maxVisible?: number;
};

const NOTIFICATION_STYLES: Record<
  WorkbenchNotificationTone,
  {
    accent: string;
    badge: string;
    badgeLabel: string;
    badgeText: string;
    orb: string;
    shell: string;
  }
> = {
  success: {
    accent: "bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300",
    badge: "border-emerald-200 bg-emerald-50",
    badgeLabel: "Success",
    badgeText: "OK",
    orb: "bg-emerald-200/70",
    shell: "border-emerald-100/80 bg-[linear-gradient(145deg,rgba(240,253,244,0.96),rgba(255,255,255,0.96))]"
  },
  error: {
    accent: "bg-gradient-to-r from-rose-400 via-orange-300 to-amber-300",
    badge: "border-rose-200 bg-rose-50",
    badgeLabel: "Error",
    badgeText: "!!",
    orb: "bg-rose-200/70",
    shell: "border-rose-100/80 bg-[linear-gradient(145deg,rgba(255,241,242,0.97),rgba(255,255,255,0.96))]"
  },
  neutral: {
    accent: "bg-gradient-to-r from-slate-500 via-slate-300 to-sky-300",
    badge: "border-slate-200 bg-slate-50",
    badgeLabel: "Notice",
    badgeText: "i",
    orb: "bg-slate-200/70",
    shell: "border-slate-200/80 bg-[linear-gradient(145deg,rgba(248,250,252,0.97),rgba(255,255,255,0.96))]"
  }
};

export function useWorkbenchNotifications(options: UseWorkbenchNotificationsOptions = {}) {
  const durationMs = options.durationMs ?? 4200;
  const maxVisible = Math.max(1, options.maxVisible ?? 4);
  const [notifications, setNotifications] = useState<WorkbenchNotification[]>([]);
  const notificationsRef = useRef<WorkbenchNotification[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const nextIdRef = useRef(0);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  function syncNotifications(nextNotifications: WorkbenchNotification[]) {
    notificationsRef.current = nextNotifications;
    setNotifications(nextNotifications);
  }

  function clearDismissTimer(notificationId: string) {
    const timer = timersRef.current.get(notificationId);
    if (!timer) {
      return;
    }

    clearTimeout(timer);
    timersRef.current.delete(notificationId);
  }

  function dismissNotification(notificationId: string) {
    clearDismissTimer(notificationId);
    syncNotifications(notificationsRef.current.filter((notification) => notification.id !== notificationId));
  }

  function notify(notificationInput: WorkbenchNotificationInput) {
    nextIdRef.current += 1;

    const notification: WorkbenchNotification = {
      id: `workbench-notification-${nextIdRef.current}`,
      ...notificationInput
    };
    const appendedNotifications = [...notificationsRef.current, notification];
    const trimmedNotifications = appendedNotifications.slice(-maxVisible);
    const removedNotifications = appendedNotifications.slice(0, Math.max(0, appendedNotifications.length - maxVisible));

    removedNotifications.forEach((item) => clearDismissTimer(item.id));
    syncNotifications(trimmedNotifications);

    const timer = setTimeout(() => {
      dismissNotification(notification.id);
    }, durationMs);

    timersRef.current.set(notification.id, timer);
    return notification.id;
  }

  return {
    dismissNotification,
    notifications,
    notify
  };
}

export function WorkbenchNotificationCenter({
  notifications,
  onDismiss
}: {
  notifications: WorkbenchNotification[];
  onDismiss: (notificationId: string) => void;
}) {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 top-4 z-50 flex justify-center sm:justify-end"
    >
      <div className="flex w-full max-w-md flex-col gap-3">
        {notifications.map((notification) => {
          const styles = NOTIFICATION_STYLES[notification.tone];

          return (
            <article
              className={`pointer-events-auto relative overflow-hidden rounded-[1.6rem] border shadow-[0_28px_70px_rgba(15,23,42,0.16)] backdrop-blur-xl ${styles.shell}`}
              key={notification.id}
              role={notification.tone === "error" ? "alert" : "status"}
            >
              <div className={`absolute inset-x-0 top-0 h-1 ${styles.accent}`} />
              <div className={`absolute -right-10 top-[-3.5rem] h-28 w-28 rounded-full blur-3xl ${styles.orb}`} />

              <div className="relative flex items-start gap-4 p-4 sm:p-5">
                <div
                  className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-xs font-semibold tracking-[0.18em] text-slate-700 ${styles.badge}`}
                >
                  {styles.badgeText}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                        {styles.badgeLabel}
                      </p>
                      <h3 className="mt-1 text-sm font-semibold tracking-tight text-slate-950">{notification.title}</h3>
                    </div>

                    <button
                      aria-label={`Dismiss notification ${notification.title}`}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/70 text-slate-400 transition hover:border-slate-300 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                      onClick={() => onDismiss(notification.id)}
                      type="button"
                    >
                      <span aria-hidden="true">x</span>
                    </button>
                  </div>

                  {notification.detail ? (
                    <p className="mt-2 text-sm leading-6 text-slate-600">{notification.detail}</p>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
