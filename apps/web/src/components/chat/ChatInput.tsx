"use client";

import { useRef, useEffect, useState } from "react";
import { Send } from "lucide-react";
import { cn } from "../../lib/utils";

interface Props {
  onSend: (body: string) => Promise<void>;
  disabled?: boolean;
  disabledReason?: string;
}

export function ChatInput({ onSend, disabled = false, disabledReason }: Props) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = 24;
    const maxHeight = lineHeight * 4 + 16; // 4 rows + padding
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [value]);

  async function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || sending || disabled) return;
    setSending(true);
    try {
      await onSend(trimmed);
      setValue("");
      // Reset height after clearing
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="bg-wa-search border-t border-gray-200 px-4 py-3 shrink-0">
      {disabled && disabledReason && (
        <div className="text-xs text-center text-gray-500 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5 mb-2">
          {disabledReason}
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || sending}
          placeholder={disabled ? "Conversa encerrada" : "Digite uma mensagem"}
          rows={1}
          className={cn(
            "flex-1 resize-none bg-white rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400",
            "border border-gray-200 focus:outline-none focus:ring-1 focus:ring-brand/50",
            "leading-6 max-h-[112px] overflow-y-auto transition-colors",
            (disabled || sending) && "opacity-60 cursor-not-allowed"
          )}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!value.trim() || sending || disabled}
          className={cn(
            "w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all",
            value.trim() && !disabled
              ? "bg-brand hover:bg-brand-dark shadow-sm"
              : "bg-gray-300 cursor-not-allowed"
          )}
        >
          {sending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4 text-white" />
          )}
        </button>
      </div>
    </div>
  );
}
