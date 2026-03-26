"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, CheckCheck, Clock, Image, Mic, Video, FileText, MapPin, Smile } from "lucide-react";
import { cn } from "../../lib/utils";

export interface MessageData {
  id: string;
  conversationId: string;
  senderId: string | null;
  direction: "INBOUND" | "OUTBOUND";
  type: "TEXT" | "IMAGE" | "AUDIO" | "VIDEO" | "DOCUMENT" | "STICKER" | "LOCATION";
  body: string;
  signatureApplied: boolean;
  status: "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  createdAt: string;
  sentAt: string | null;
  sender: { id: string; name: string } | null;
}

interface Props {
  message: MessageData;
  isGrouped?: boolean; // same direction, within 2 minutes of prev
}

function StatusIcon({ status }: { status: MessageData["status"] }) {
  switch (status) {
    case "PENDING":
      return <Clock className="w-3 h-3 text-gray-400" />;
    case "SENT":
      return <Check className="w-3 h-3 text-gray-400" />;
    case "DELIVERED":
      return <CheckCheck className="w-3 h-3 text-gray-400" />;
    case "READ":
      return <CheckCheck className="w-3 h-3 text-blue-500" />;
    case "FAILED":
      return <span className="text-red-500 text-[10px] font-medium">!</span>;
  }
}

function MediaPlaceholder({ type }: { type: MessageData["type"] }) {
  const items: Record<string, { Icon: React.ComponentType<{ className?: string }>; label: string }> = {
    IMAGE: { Icon: Image, label: "Imagem" },
    AUDIO: { Icon: Mic, label: "Áudio" },
    VIDEO: { Icon: Video, label: "Vídeo" },
    DOCUMENT: { Icon: FileText, label: "Documento" },
    STICKER: { Icon: Smile, label: "Sticker" },
    LOCATION: { Icon: MapPin, label: "Localização" },
  };

  const item = items[type];
  if (!item) return null;
  const { Icon, label } = item;

  return (
    <div className="flex items-center gap-2 text-gray-500 text-sm italic py-1">
      <Icon className="w-4 h-4 shrink-0" />
      <span>[{label}]</span>
    </div>
  );
}

export function MessageBubble({ message, isGrouped = false }: Props) {
  const isOut = message.direction === "OUTBOUND";
  const time = format(new Date(message.createdAt), "HH:mm", { locale: ptBR });

  return (
    <div
      className={cn(
        "flex",
        isOut ? "justify-end" : "justify-start",
        isGrouped ? "mt-0.5" : "mt-2"
      )}
    >
      <div
        className={cn(
          "max-w-[70%] px-3 py-1.5 rounded-2xl shadow-sm relative",
          isOut
            ? "bg-wa-msg-out rounded-tr-sm text-gray-800"
            : "bg-wa-msg-in rounded-tl-sm text-gray-800"
        )}
      >
        {/* Sender name for outbound with signature */}
        {isOut && message.signatureApplied && message.sender && (
          <p className="text-xs font-semibold text-teal-700 mb-1">{message.sender.name}</p>
        )}

        {/* Message body / media placeholder */}
        {message.type === "TEXT" ? (
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
            {message.body}
          </p>
        ) : (
          <MediaPlaceholder type={message.type} />
        )}

        {/* Time + status */}
        <div className={cn("flex items-center gap-1 mt-1", isOut ? "justify-end" : "justify-end")}>
          <span className="text-[11px] text-gray-400 leading-none">{time}</span>
          {isOut && <StatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  );
}
