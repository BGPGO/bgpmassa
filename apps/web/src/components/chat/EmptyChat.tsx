"use client";

import { MessageCircle } from "lucide-react";

export function EmptyChat() {
  return (
    <div className="flex flex-col items-center justify-center h-full chat-bg select-none">
      <div className="flex flex-col items-center gap-4 max-w-sm text-center px-8">
        <div className="w-20 h-20 rounded-full bg-brand/10 flex items-center justify-center">
          <MessageCircle className="w-10 h-10 text-brand" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-700">
            Selecione uma conversa
          </h2>
          <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
            Escolha uma conversa para começar a responder
          </p>
        </div>
        <div className="w-full border-t border-gray-300/50 mt-2" />
        <p className="text-xs text-gray-400">
          As mensagens são criptografadas de ponta a ponta via WhatsApp
        </p>
      </div>
    </div>
  );
}
