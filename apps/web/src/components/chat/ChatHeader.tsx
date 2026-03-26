"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ResponseTimerBadge } from "./ResponseTimerBadge";
import { api } from "../../lib/api-client";
import { cn } from "../../lib/utils";

interface Contact {
  id: string;
  name: string | null;
  phone: string;
  avatarUrl: string | null;
}

interface Instance {
  id: string;
  name: string;
}

type ConvStatus = "OPEN" | "PENDING" | "RESOLVED" | "ARCHIVED";

interface Props {
  conversationId: string;
  contact: Contact;
  instance: Instance;
  status: ConvStatus;
  activeTimer?: { triggeredAt: string } | null;
  onStatusChange: (status: ConvStatus) => void;
}

const STATUS_LABELS: Record<ConvStatus, string> = {
  OPEN: "Aberta",
  PENDING: "Pendente",
  RESOLVED: "Resolvida",
  ARCHIVED: "Arquivada",
};

const STATUS_COLORS: Record<ConvStatus, string> = {
  OPEN: "bg-brand text-white",
  PENDING: "bg-yellow-400 text-yellow-900",
  RESOLVED: "bg-gray-400 text-white",
  ARCHIVED: "bg-gray-300 text-gray-600",
};

const ALL_STATUSES: ConvStatus[] = ["OPEN", "PENDING", "RESOLVED", "ARCHIVED"];

const AVATAR_COLORS = [
  "bg-purple-500",
  "bg-blue-500",
  "bg-green-600",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-rose-500",
];

function getAvatarColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function ChatHeader({
  conversationId,
  contact,
  instance,
  status,
  activeTimer,
  onStatusChange,
}: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [changing, setChanging] = useState(false);

  const name = contact.name || contact.phone;
  const avatarColor = getAvatarColor(name);
  const avatarLetter = name[0]?.toUpperCase() ?? "?";

  async function handleStatusChange(newStatus: ConvStatus) {
    if (newStatus === status || changing) return;
    setChanging(true);
    setDropdownOpen(false);
    try {
      await api.patch(`/api/conversations/${conversationId}/status`, { status: newStatus });
      onStatusChange(newStatus);
    } catch (err) {
      console.error("Failed to change status:", err);
    } finally {
      setChanging(false);
    }
  }

  return (
    <div className="bg-wa-header px-4 py-2.5 flex items-center gap-3 shrink-0 shadow-sm">
      {/* Avatar */}
      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white font-semibold",
          avatarColor
        )}
      >
        {avatarLetter}
      </div>

      {/* Name + phone */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-white font-medium text-sm truncate">{name}</p>
          <span className="text-[10px] bg-white/20 text-gray-200 px-1.5 py-0.5 rounded-full shrink-0">
            {instance.name}
          </span>
        </div>
        {contact.name && (
          <p className="text-gray-400 text-xs truncate">{contact.phone}</p>
        )}
      </div>

      {/* Timer badge */}
      {activeTimer && (
        <div className="shrink-0">
          <ResponseTimerBadge triggeredAt={activeTimer.triggeredAt} />
        </div>
      )}

      {/* Status dropdown */}
      <div className="relative shrink-0">
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          disabled={changing}
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all",
            STATUS_COLORS[status],
            "opacity-90 hover:opacity-100"
          )}
        >
          {changing ? "..." : STATUS_LABELS[status]}
          <ChevronDown className="w-3 h-3" />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px] z-50">
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2",
                  s === status ? "font-semibold text-brand" : "text-gray-700"
                )}
              >
                <span
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    s === "OPEN" && "bg-brand",
                    s === "PENDING" && "bg-yellow-400",
                    s === "RESOLVED" && "bg-gray-400",
                    s === "ARCHIVED" && "bg-gray-300"
                  )}
                />
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
