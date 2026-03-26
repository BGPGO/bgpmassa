"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { api } from "../../../lib/api-client";
import { cn } from "../../../lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

function formatTs(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Ontem " + format(d, "HH:mm");
  return format(d, "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/api/notifications");
      setNotifications(data.items ?? data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function markRead(id: string) {
    await api.patch(`/api/notifications/${id}/read`);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    );
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await api.patch("/api/notifications/read-all");
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))
      );
    } finally {
      setMarkingAll(false);
    }
  }

  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Notificações</h1>
            {unread > 0 && (
              <p className="text-sm text-gray-500 mt-0.5">{unread} não lida{unread > 1 ? "s" : ""}</p>
            )}
          </div>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 text-sm text-brand hover:text-brand-dark font-medium transition-colors disabled:opacity-60"
            >
              <CheckCheck className="w-4 h-4" />
              Marcar todas como lidas
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-brand" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Bell className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium">Sem notificações</p>
            <p className="text-sm text-gray-400 mt-1">Você está em dia!</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.readAt && markRead(n.id)}
                className={cn(
                  "flex items-start gap-3 px-5 py-4 transition-colors",
                  !n.readAt ? "bg-brand/5 cursor-pointer hover:bg-brand/10" : "hover:bg-gray-50"
                )}
              >
                <div
                  className={cn(
                    "w-2 h-2 rounded-full mt-1.5 shrink-0",
                    !n.readAt ? "bg-brand" : "bg-transparent"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-sm", !n.readAt ? "font-semibold text-gray-900" : "font-medium text-gray-700")}>
                      {n.title}
                    </p>
                    <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                      {formatTs(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
