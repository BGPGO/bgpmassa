"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "../../../../lib/api-client";
import { useSocket } from "../../../../providers/SocketProvider";
import { Send } from "lucide-react";
import { cn } from "../../../../lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Message {
  id: string;
  body: string;
  direction: "INBOUND" | "OUTBOUND";
  status: string;
  signatureApplied: boolean;
  createdAt: string;
  sender?: { id: string; name: string };
}

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const socket = useSocket();

  useEffect(() => {
    api.get(`/api/messages/${id}`).then((r) => setMessages(r.data.items));
  }, [id]);

  useEffect(() => {
    if (!socket) return;
    const handler = (data: { conversationId: string; message: Message }) => {
      if (data.conversationId === id) {
        setMessages((prev) => [...prev, data.message]);
      }
    };
    socket.on("message:new", handler);
    return () => { socket.off("message:new", handler); };
  }, [socket, id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setSending(true);
    try {
      await api.post(`/api/messages/${id}`, { body: input });
      setInput("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex", msg.direction === "OUTBOUND" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-xs lg:max-w-md px-3 py-2 rounded-2xl text-sm shadow-sm",
                msg.direction === "OUTBOUND"
                  ? "bg-brand-light rounded-tr-sm text-gray-800"
                  : "bg-white rounded-tl-sm text-gray-800"
              )}
            >
              {msg.direction === "OUTBOUND" && msg.sender && (
                <p className="text-xs text-gray-500 font-medium mb-1">{msg.sender.name}</p>
              )}
              <p className="whitespace-pre-wrap break-words">{msg.body}</p>
              <p className="text-xs text-gray-400 mt-1 text-right">
                {format(new Date(msg.createdAt), "HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-200 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e as unknown as React.FormEvent);
            }
          }}
          placeholder="Digite uma mensagem..."
          rows={1}
          className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="w-10 h-10 rounded-full bg-brand flex items-center justify-center shrink-0 hover:bg-brand-dark transition-colors disabled:opacity-50"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </form>
    </div>
  );
}
