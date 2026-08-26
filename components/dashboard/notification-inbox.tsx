"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Bell, Check, CheckCheck, CircleAlert, Info, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  dismissNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationInboxItem,
} from "@/lib/services/alerts";
import { cn } from "@/lib/utils";

interface NotificationInboxProps {
  userId: string;
  farmId: string;
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function SeverityIcon({ severity }: Pick<NotificationInboxItem, "severity">) {
  if (severity === "critical") return <CircleAlert className="h-4 w-4 text-red-500" />;
  if (severity === "warning") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <Info className="h-4 w-4 text-blue-500" />;
}

export function NotificationInbox({ userId, farmId }: NotificationInboxProps) {
  const [items, setItems] = useState<NotificationInboxItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const notifications = await getNotifications(userId, farmId);
      setItems(notifications.filter((notification) => !notification.dismissedAt));
      setError(null);
    } catch (loadError: unknown) {
      console.error(loadError);
      setError("Não foi possível carregar as notificações.");
    } finally {
      setLoading(false);
    }
  }, [farmId, userId]);

  useEffect(() => {
    setLoading(true);
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notification-inbox:${userId}:${farmId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notification_recipients", filter: `user_id=eq.${userId}` },
        () => void loadNotifications(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [farmId, loadNotifications, userId]);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const unreadCount = items.filter((item) => item.status === "active" && !item.readAt).length;

  async function handleRead(item: NotificationInboxItem) {
    try {
      await markNotificationAsRead(item.recipientId);
      setItems((current) => current.map((entry) => entry.recipientId === item.recipientId
        ? { ...entry, readAt: new Date().toISOString() }
        : entry));
      setError(null);
    } catch (actionError: unknown) {
      console.error(actionError);
      setError("Não foi possível atualizar a notificação.");
    }
  }

  async function handleDismiss(item: NotificationInboxItem) {
    try {
      await dismissNotification(item.recipientId);
      setItems((current) => current.filter((entry) => entry.recipientId !== item.recipientId));
      setError(null);
    } catch (actionError: unknown) {
      console.error(actionError);
      setError("Não foi possível dispensar a notificação.");
    }
  }

  async function handleReadAll() {
    try {
      await markAllNotificationsAsRead(farmId);
      const now = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? now })));
      setError(null);
    } catch (actionError: unknown) {
      console.error(actionError);
      setError("Não foi possível atualizar as notificações.");
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={unreadCount ? `Notificações, ${unreadCount} não lidas` : "Notificações"}
        aria-expanded={open}
        aria-controls="dashboard-notification-inbox"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-gray-100/80 text-gray-500 transition-colors hover:bg-gray-100 dark:bg-white/8 dark:text-slate-300 dark:hover:bg-white/12"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:bg-red-400 dark:ring-slate-950">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section
          id="dashboard-notification-inbox"
          aria-label="Central de notificações"
          className="fixed inset-x-3 top-[68px] z-50 max-h-[min(70vh,560px)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[390px] dark:border-white/10 dark:bg-slate-900"
        >
          <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-white/10">
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Notificações</h2>
              <p className="text-[11px] text-gray-400">{unreadCount} não lida{unreadCount === 1 ? "" : "s"}</p>
            </div>
            {unreadCount > 0 && (
              <button type="button" onClick={() => void handleReadAll()} className="flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
                <CheckCheck className="h-3.5 w-3.5" /> Marcar todas como lidas
              </button>
            )}
          </header>

          <div className="max-h-[calc(min(70vh,560px)-65px)] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-12 text-xs text-gray-400"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
            ) : error ? (
              <div role="alert" className="px-5 py-10 text-center text-xs text-red-600 dark:text-red-300">
                <p>{error}</p>
                <button type="button" onClick={() => void loadNotifications()} className="mt-3 cursor-pointer font-semibold underline">Tentar novamente</button>
              </div>
            ) : items.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Bell className="mx-auto h-6 w-6 text-gray-300 dark:text-slate-600" />
                <p className="mt-2 text-sm font-medium text-gray-600 dark:text-slate-300">Nenhuma notificação</p>
                <p className="mt-1 text-xs text-gray-400">Novos alertas operacionais aparecerão aqui.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-white/10">
                {items.map((item) => (
                  <li key={item.recipientId} className={cn("relative px-4 py-3", !item.readAt && item.status === "active" && "bg-brand-50/60 dark:bg-brand-500/5")}>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5"><SeverityIcon severity={item.severity} /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold leading-5 text-gray-900 dark:text-slate-100">{item.title}</p>
                          <button type="button" aria-label={`Dispensar ${item.title}`} onClick={() => void handleDismiss(item)} className="cursor-pointer text-gray-300 hover:text-gray-500 dark:hover:text-slate-200"><X className="h-3.5 w-3.5" /></button>
                        </div>
                        <p className="mt-0.5 text-[11px] leading-4 text-gray-500 dark:text-slate-400">{item.body}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="text-[10px] text-gray-400">{dateFormatter.format(new Date(item.lastDetectedAt))}</span>
                          {item.status === "resolved" && <span className="text-[10px] font-semibold text-emerald-600">Resolvida</span>}
                          {item.emailStatus === "failed" && <span className="text-[10px] font-semibold text-red-500">Falha no e-mail</span>}
                          {!item.readAt && (
                            <button type="button" onClick={() => void handleRead(item)} className="flex cursor-pointer items-center gap-1 text-[10px] font-semibold text-brand-600 dark:text-brand-400"><Check className="h-3 w-3" /> Marcar como lida</button>
                          )}
                          <Link href={item.actionPath} onClick={() => { void handleRead(item); setOpen(false); }} className="text-[10px] font-semibold text-brand-600 hover:underline dark:text-brand-400">Ver detalhes</Link>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
