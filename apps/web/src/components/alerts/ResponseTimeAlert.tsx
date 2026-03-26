"use client";

import { useAlertsStore } from "../../store/alerts.store";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X, Clock } from "lucide-react";
import type { ResponseTimeAlertEvent } from "@bgpmassa/shared";

function AlertBadge({ alert }: { alert: ResponseTimeAlertEvent }) {
  const dismiss = useAlertsStore((s) => s.dismissAlert);
  const isUrgent = alert.thresholdMinutes >= 60;

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border text-sm shadow-md ${
        isUrgent
          ? "bg-red-50 border-red-300 text-red-800"
          : "bg-yellow-50 border-yellow-300 text-yellow-800"
      }`}
    >
      <Clock className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{alert.contactName}</p>
        <p className="text-xs opacity-80">
          Sem resposta há{" "}
          {alert.thresholdMinutes >= 60
            ? `${alert.thresholdMinutes / 60}h`
            : `${alert.thresholdMinutes}min`}
        </p>
      </div>
      <button onClick={() => dismiss(alert.conversationId)} className="shrink-0 opacity-60 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ResponseTimeAlertContainer() {
  const alerts = useAlertsStore((s) => s.alerts);
  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-72">
      {alerts.slice(0, 5).map((alert) => (
        <AlertBadge key={alert.conversationId} alert={alert} />
      ))}
      {alerts.length > 5 && (
        <p className="text-xs text-center text-gray-500">+{alerts.length - 5} mais alertas</p>
      )}
    </div>
  );
}
