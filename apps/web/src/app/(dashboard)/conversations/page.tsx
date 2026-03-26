"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../../lib/api-client";
import { ResponseTimerBadge } from "../../../components/chat/ResponseTimerBadge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search } from "lucide-react";

interface Conversation {
  id: string;
  contact: { name?: string; phone: string; avatarUrl?: string };
  instance: { name: string };
  status: string;
  lastMessageAt: string;
  messages: { body: string; direction: string }[];
  responseTimers: { triggeredAt: string }[];
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/api/conversations").then((r) => setConversations(r.data.items));
  }, []);

  const filtered = conversations.filter((c) => {
    const name = c.contact.name || c.contact.phone;
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 bg-white">
        <h1 className="font-semibold text-lg mb-3">Conversas</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar conversa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {filtered.map((conv) => {
          const lastMsg = conv.messages[0];
          const activeTimer = conv.responseTimers[0];
          const name = conv.contact.name || conv.contact.phone;

          return (
            <Link
              key={conv.id}
              href={`/conversations/${conv.id}`}
              className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                <span className="font-medium text-sm text-gray-600">{name[0]?.toUpperCase()}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">{name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {activeTimer && (
                      <ResponseTimerBadge triggeredAt={activeTimer.triggeredAt} />
                    )}
                    {conv.lastMessageAt && (
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(conv.lastMessageAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {conv.instance.name}
                  {lastMsg && ` · ${lastMsg.direction === "OUTBOUND" ? "Você: " : ""}${lastMsg.body}`}
                </p>
              </div>
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-12">Nenhuma conversa encontrada</p>
        )}
      </div>
    </div>
  );
}
