"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { api } from "../../../../lib/api-client";
import { useSocket } from "../../../../providers/SocketProvider";
import { ChatHeader } from "../../../../components/chat/ChatHeader";
import { MessageBubble } from "../../../../components/chat/MessageBubble";
import { ChatInput } from "../../../../components/chat/ChatInput";
import type { MessageData } from "../../../../components/chat/MessageBubble";

type ConvStatus = "OPEN" | "PENDING" | "RESOLVED" | "ARCHIVED";

interface ConversationDetail {
  id: string;
  status: ConvStatus;
  instanceId: string;
  contact: {
    id: string;
    name: string | null;
    phone: string;
    avatarUrl: string | null;
  };
  instance: {
    id: string;
    name: string;
  };
  responseTimers: Array<{
    id: string;
    triggeredAt: string;
    status: string;
  }>;
}

function DateSeparator({ date }: { date: Date }) {
  let label: string;
  if (isToday(date)) {
    label = "Hoje";
  } else if (isYesterday(date)) {
    label = "Ontem";
  } else {
    label = format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  }

  return (
    <div className="flex items-center justify-center my-3">
      <span className="bg-white/80 text-gray-500 text-xs px-3 py-1 rounded-full shadow-sm border border-gray-200">
        {label}
      </span>
    </div>
  );
}

function isGrouped(prev: MessageData, curr: MessageData): boolean {
  if (prev.direction !== curr.direction) return false;
  const prevTime = new Date(prev.createdAt).getTime();
  const currTime = new Date(curr.createdAt).getTime();
  return currTime - prevTime < 2 * 60 * 1000; // 2 minutes
}

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const socket = useSocket();

  // Fetch conversation details
  useEffect(() => {
    if (!id) return;
    setLoadingConv(true);
    setError(null);
    api
      .get(`/api/conversations/${id}`)
      .then((r) => setConversation(r.data))
      .catch(() => setError("Erro ao carregar conversa"))
      .finally(() => setLoadingConv(false));
  }, [id]);

  // Fetch messages (first page)
  useEffect(() => {
    if (!id) return;
    setLoadingMsgs(true);
    setMessages([]);
    setPage(1);
    api
      .get(`/api/messages/${id}`, { params: { page: 1, limit: 50 } })
      .then((r) => {
        const items: MessageData[] = r.data.items ?? r.data;
        setMessages(items);
        const total = r.data.total ?? items.length;
        setHasMore(total > items.length);
      })
      .catch(() => setError("Erro ao carregar mensagens"))
      .finally(() => setLoadingMsgs(false));
  }, [id]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!loadingMsgs && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [loadingMsgs]);

  // Scroll to bottom on new messages (only if near bottom)
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const distFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distFromBottom < 200 || behavior === "instant") {
      bottomRef.current?.scrollIntoView({ behavior });
    }
  }, []);

  // Socket: new messages
  useEffect(() => {
    if (!socket) return;

    const handler = (data: { conversationId: string; message: MessageData }) => {
      if (data.conversationId === id) {
        setMessages((prev) => {
          // avoid duplicates
          if (prev.find((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        setTimeout(() => scrollToBottom("smooth"), 50);
      }
    };

    socket.on("message:new", handler);
    return () => {
      socket.off("message:new", handler);
    };
  }, [socket, id, scrollToBottom]);

  // Load more messages (scroll to top)
  async function loadMoreMessages() {
    if (loadingMore || !hasMore) return;
    const container = scrollContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;

    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const { data } = await api.get(`/api/messages/${id}`, {
        params: { page: nextPage, limit: 50 },
      });
      const items: MessageData[] = data.items ?? data;
      setMessages((prev) => [...items, ...prev]);
      setPage(nextPage);
      const total = data.total ?? messages.length + items.length;
      setHasMore(total > messages.length + items.length);

      // Preserve scroll position after prepend
      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - prevScrollHeight;
        }
      });
    } finally {
      setLoadingMore(false);
    }
  }

  function handleScroll() {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (container.scrollTop < 80) {
      loadMoreMessages();
    }
  }

  async function handleSend(body: string) {
    const { data: newMsg } = await api.post(`/api/messages/${id}`, { body });
    setMessages((prev) => {
      if (prev.find((m) => m.id === newMsg.id)) return prev;
      return [...prev, newMsg];
    });
    setTimeout(() => scrollToBottom("smooth"), 50);
  }

  function handleStatusChange(newStatus: ConvStatus) {
    setConversation((prev) => (prev ? { ...prev, status: newStatus } : prev));
  }

  const isDisabled =
    conversation?.status === "RESOLVED" || conversation?.status === "ARCHIVED";
  const disabledReason =
    conversation?.status === "RESOLVED"
      ? "Esta conversa está resolvida. Altere o status para responder."
      : conversation?.status === "ARCHIVED"
      ? "Esta conversa está arquivada."
      : undefined;

  const activeTimer = conversation?.responseTimers.find((t) => t.status === "RUNNING");

  if (loadingConv || loadingMsgs) {
    return (
      <div className="flex items-center justify-center h-full bg-wa-chat">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-wa-chat gap-3">
        <p className="text-gray-600 text-sm">{error ?? "Conversa não encontrada"}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <ChatHeader
        conversationId={id}
        contact={conversation.contact}
        instance={conversation.instance}
        status={conversation.status}
        activeTimer={activeTimer ?? null}
        onStatusChange={handleStatusChange}
      />

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-2 chat-bg"
      >
        {/* Load more indicator */}
        {loadingMore && (
          <div className="flex justify-center py-2">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        )}

        {/* Messages with date separators */}
        {messages.map((msg, index) => {
          const prev = messages[index - 1];
          const showDateSep =
            !prev || !isSameDay(new Date(prev.createdAt), new Date(msg.createdAt));
          const grouped = prev ? isGrouped(prev, msg) : false;

          return (
            <div key={msg.id}>
              {showDateSep && <DateSeparator date={new Date(msg.createdAt)} />}
              <MessageBubble message={msg} isGrouped={grouped} />
            </div>
          );
        })}

        {messages.length === 0 && !loadingMsgs && (
          <div className="flex justify-center mt-12">
            <span className="bg-white/80 text-gray-500 text-xs px-4 py-2 rounded-full shadow-sm border border-gray-200">
              Sem mensagens ainda
            </span>
          </div>
        )}

        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={isDisabled}
        disabledReason={disabledReason}
      />
    </div>
  );
}
