"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, ChevronDown } from "lucide-react";
import { useConversationsStore } from "../../store/conversations.store";
import { useInstancesStore } from "../../store/instances.store";
import { useSocket } from "../../providers/SocketProvider";
import { ConversationItem } from "./ConversationItem";
import type { Conversation } from "../../store/conversations.store";
import { cn } from "../../lib/utils";

type StatusFilter = "ALL" | "OPEN" | "PENDING" | "RESOLVED";

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "ALL", label: "Todas" },
  { key: "OPEN", label: "Abertas" },
  { key: "PENDING", label: "Pendentes" },
  { key: "RESOLVED", label: "Resolvidas" },
];

function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-3 border-b border-gray-100 animate-pulse">
      <div className="w-11 h-11 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3.5 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
    </div>
  );
}

export function ConversationListPanel() {
  const { conversations, loading, fetchConversations, upsertConversation } =
    useConversationsStore();
  const { instances, fetchInstances } = useInstancesStore();
  const socket = useSocket();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [instanceFilter, setInstanceFilter] = useState<string>("ALL");
  const [instanceDropdownOpen, setInstanceDropdownOpen] = useState(false);

  // Initial load
  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  useEffect(() => {
    const instanceId = instanceFilter !== "ALL" ? instanceFilter : undefined;
    fetchConversations(instanceId, statusFilter !== "ALL" ? statusFilter : undefined);
  }, [instanceFilter, statusFilter, fetchConversations]);

  // Socket: update conversation when new message arrives
  const handleNewMessage = useCallback(
    (data: { conversationId: string; message: { body: string; direction: string; createdAt: string; type: string; id: string } }) => {
      const existing = useConversationsStore.getState().conversations.find(
        (c) => c.id === data.conversationId
      );
      if (existing) {
        const updated: Conversation = {
          ...existing,
          lastMessageAt: data.message.createdAt,
          messages: [
            {
              id: data.message.id,
              body: data.message.body,
              direction: data.message.direction as "INBOUND" | "OUTBOUND",
              createdAt: data.message.createdAt,
              type: data.message.type,
            },
          ],
        };
        upsertConversation(updated);
      }
    },
    [upsertConversation]
  );

  useEffect(() => {
    if (!socket) return;
    socket.on("message:new", handleNewMessage);
    return () => {
      socket.off("message:new", handleNewMessage);
    };
  }, [socket, handleNewMessage]);

  // Filter conversations by search
  const filtered = conversations.filter((c) => {
    const name = (c.contact.name || c.contact.phone).toLowerCase();
    const phone = c.contact.phone.toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || phone.includes(q);
  });

  const selectedInstance = instances.find((i) => i.id === instanceFilter);

  return (
    <div className="w-80 flex flex-col h-full border-r border-gray-200 bg-wa-panel shrink-0">
      {/* Header */}
      <div className="bg-wa-header px-4 py-3 flex items-center justify-between shrink-0">
        <h1 className="text-white font-semibold text-base">BGP Massa</h1>

        {/* Instance filter dropdown */}
        <div className="relative">
          <button
            onClick={() => setInstanceDropdownOpen((v) => !v)}
            className="flex items-center gap-1.5 text-gray-300 hover:text-white text-xs bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <span className="truncate max-w-[100px]">
              {selectedInstance ? selectedInstance.name : "Todas"}
            </span>
            <ChevronDown className="w-3 h-3 shrink-0" />
          </button>

          {instanceDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px] z-50">
              <button
                onClick={() => {
                  setInstanceFilter("ALL");
                  setInstanceDropdownOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors",
                  instanceFilter === "ALL" ? "font-medium text-brand" : "text-gray-700"
                )}
              >
                Todas as instâncias
              </button>
              {instances.map((inst) => (
                <button
                  key={inst.id}
                  onClick={() => {
                    setInstanceFilter(inst.id);
                    setInstanceDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2",
                    instanceFilter === inst.id ? "font-medium text-brand" : "text-gray-700"
                  )}
                >
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      inst.status === "CONNECTED" ? "bg-brand" : "bg-gray-400"
                    )}
                  />
                  {inst.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 bg-wa-search shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar ou começar uma nova conversa"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand/50 border border-gray-200"
          />
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex border-b border-gray-200 bg-white shrink-0">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={cn(
              "flex-1 py-2.5 text-xs font-medium transition-colors border-b-2",
              statusFilter === tab.key
                ? "border-brand text-brand"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto" onClick={() => setInstanceDropdownOpen(false)}>
        {loading ? (
          <>
            {Array.from({ length: 8 }).map((_, i) => (
              <ConversationSkeleton key={i} />
            ))}
          </>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Search className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 font-medium">Nenhuma conversa</p>
            <p className="text-xs text-gray-400 mt-1">
              {search
                ? `Sem resultados para "${search}"`
                : "Nenhuma conversa encontrada"}
            </p>
          </div>
        ) : (
          filtered.map((conv) => (
            <ConversationItem key={conv.id} conversation={conv} />
          ))
        )}
      </div>
    </div>
  );
}
