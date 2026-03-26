"use client";

import { useRouter, usePathname } from "next/navigation";
import { format, isToday, isYesterday, isThisWeek, isThisYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ResponseTimerBadge } from "../chat/ResponseTimerBadge";
import { cn } from "../../lib/utils";
import type { Conversation } from "../../store/conversations.store";

interface Props {
  conversation: Conversation;
}

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

function formatTimestamp(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Ontem";
  if (isThisWeek(date, { locale: ptBR })) return format(date, "EEE", { locale: ptBR });
  if (isThisYear(date)) return format(date, "dd/MM");
  return format(date, "dd/MM/yy");
}

function getStatusDot(status: Conversation["status"]): string {
  switch (status) {
    case "OPEN":
      return "bg-brand";
    case "PENDING":
      return "bg-yellow-400";
    case "RESOLVED":
      return "bg-gray-400";
    case "ARCHIVED":
      return "bg-gray-300";
  }
}

function formatLastMessage(msg: Conversation["messages"][0] | undefined): string {
  if (!msg) return "";
  const prefix = msg.direction === "OUTBOUND" ? "Você: " : "";
  switch (msg.type) {
    case "IMAGE":
      return `${prefix}[Imagem]`;
    case "AUDIO":
      return `${prefix}[Áudio]`;
    case "VIDEO":
      return `${prefix}[Vídeo]`;
    case "DOCUMENT":
      return `${prefix}[Documento]`;
    case "STICKER":
      return `${prefix}[Sticker]`;
    case "LOCATION":
      return `${prefix}[Localização]`;
    default:
      return `${prefix}${msg.body}`;
  }
}

const LABEL_COLORS: Record<string, string> = {
  "Urgente": "bg-red-100 text-red-700 border-red-200",
  "VIP": "bg-purple-100 text-purple-700 border-purple-200",
  "Aguardando": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Financeiro": "bg-blue-100 text-blue-700 border-blue-200",
  "Suporte": "bg-gray-100 text-gray-700 border-gray-200",
};

function getLabelColor(label: string): string {
  return LABEL_COLORS[label] ?? "bg-gray-100 text-gray-600 border-gray-200";
}

export function ConversationItem({ conversation }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const isActive = pathname === `/conversations/${conversation.id}`;

  const name = conversation.contact.name || conversation.contact.phone;
  const lastMsg = conversation.messages[0];
  const activeTimer = conversation.responseTimers.find((t) => t.status === "RUNNING");
  const avatarLetter = name[0]?.toUpperCase() ?? "?";
  const avatarColor = getAvatarColor(name);
  const timestamp = formatTimestamp(conversation.lastMessageAt);
  const preview = formatLastMessage(lastMsg);

  return (
    <button
      onClick={() => router.push(`/conversations/${conversation.id}`)}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-3 border-b border-gray-100 transition-colors text-left",
        isActive
          ? "bg-wa-panel-active border-l-2 border-l-brand"
          : "hover:bg-wa-panel-hover"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-white font-semibold text-base",
          avatarColor
        )}
      >
        {avatarLetter}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="font-medium text-sm text-gray-900 truncate">{name}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {activeTimer && (
              <ResponseTimerBadge triggeredAt={activeTimer.triggeredAt} />
            )}
            {timestamp && (
              <span className="text-xs text-gray-400 whitespace-nowrap">{timestamp}</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-1 mt-0.5">
          <p className="text-xs text-gray-500 truncate flex-1">{preview || "\u00A0"}</p>
          <div className="flex items-center gap-1 shrink-0">
            {/* Assigned user initials */}
            {conversation.assignedUser && (
              <div
                className="w-4 h-4 rounded-full bg-brand/20 flex items-center justify-center shrink-0"
                title={conversation.assignedUser.name}
              >
                <span className="text-[9px] font-semibold text-brand leading-none">
                  {conversation.assignedUser.name
                    .split(" ")
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join("")
                    .toUpperCase()}
                </span>
              </div>
            )}
            {/* Instance badge */}
            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full truncate max-w-[60px]">
              {conversation.instance.name}
            </span>
            {/* Status dot */}
            <span className={cn("w-2 h-2 rounded-full shrink-0", getStatusDot(conversation.status))} />
          </div>
        </div>

        {/* Labels */}
        {conversation.labels && conversation.labels.length > 0 && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {conversation.labels.map((label) => (
              <span
                key={label}
                className={cn(
                  "text-[9px] font-medium px-1.5 py-0.5 rounded border",
                  getLabelColor(label)
                )}
              >
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
