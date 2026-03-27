"use client";

import { useEffect, useState } from "react";
import { X, Clock, User, MessageCircle, TrendingUp, Loader2 } from "lucide-react";
import { api } from "../../lib/api-client";
import { cn } from "../../lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Interaction {
  inboundMessageId: string;
  inboundAt: string | null;
  inboundBody: string;
  respondedBy: { id: string; name: string } | null;
  outboundAt: string | null;
  responseTimeMinutes: number | null;
}

interface Props {
  conversationId: string;
  areaId: string;
  contactName: string;
  onClose: () => void;
}

function ResponseTimeBadge({ minutes }: { minutes: number | null }) {
  if (minutes === null) {
    return <span className="text-xs text-gray-400 italic">Sem resposta</span>;
  }
  const color =
    minutes <= 15
      ? "bg-green-100 text-green-700"
      : minutes <= 30
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-700";

  return (
    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", color)}>
      {minutes < 60
        ? `${minutes}min`
        : `${Math.floor(minutes / 60)}h${minutes % 60 > 0 ? ` ${minutes % 60}min` : ""}`}
    </span>
  );
}

export function InteractionHistoryModal({ conversationId, areaId, contactName, onClose }: Props) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data } = await api.get(
          `/api/areas/${areaId}/interaction-history?conversationId=${conversationId}`
        );
        setInteractions(data.interactions ?? []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [areaId, conversationId]);

  const responded = interactions.filter((i) => i.responseTimeMinutes !== null);
  const avgResponse =
    responded.length > 0
      ? Math.round(responded.reduce((s, i) => s + (i.responseTimeMinutes ?? 0), 0) / responded.length)
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Histórico de interação</h2>
            <p className="text-sm text-gray-500">{contactName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        {!loading && interactions.length > 0 && (
          <div className="grid grid-cols-3 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{interactions.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Mensagens recebidas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{responded.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Respondidas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {avgResponse !== null ? (
                  <ResponseTimeBadge minutes={avgResponse} />
                ) : "—"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Tempo médio</p>
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-brand" />
            </div>
          ) : interactions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>Nenhuma interação encontrada.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {interactions.map((item, idx) => (
                <div
                  key={item.inboundMessageId}
                  className="border border-gray-100 rounded-xl p-3 hover:bg-gray-50"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500 font-medium shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Inbound */}
                      <div className="flex items-center gap-2 mb-1">
                        <MessageCircle className="w-3 h-3 text-gray-400 shrink-0" />
                        <p className="text-xs text-gray-600 truncate">{item.inboundBody}</p>
                        {item.inboundAt && (
                          <span className="text-xs text-gray-400 whitespace-nowrap ml-auto">
                            {format(new Date(item.inboundAt), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        )}
                      </div>

                      {/* Response */}
                      <div className="flex items-center gap-2 mt-1.5">
                        {item.respondedBy ? (
                          <>
                            <User className="w-3 h-3 text-brand shrink-0" />
                            <span className="text-xs font-medium text-gray-700">
                              {item.respondedBy.name}
                            </span>
                            {item.outboundAt && (
                              <span className="text-xs text-gray-400">
                                {format(new Date(item.outboundAt), "dd/MM HH:mm", { locale: ptBR })}
                              </span>
                            )}
                            <span className="ml-auto">
                              <ResponseTimeBadge minutes={item.responseTimeMinutes} />
                            </span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-gray-300 shrink-0" />
                            <span className="text-xs text-gray-400 italic">Aguardando resposta</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> até 15min
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> 15–30min
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> +30min
            </span>
          </div>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
