"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Send, Zap } from "lucide-react";
import { api } from "../../lib/api-client";
import { cn } from "../../lib/utils";

interface QuickReply {
  id: string;
  title: string;
  shortcut: string;
  body: string;
}

interface Props {
  onSend: (body: string) => Promise<void>;
  disabled?: boolean;
  disabledReason?: string;
  instanceId: string;
}

export function ChatInput({ onSend, disabled = false, disabledReason, instanceId }: Props) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [quickRepliesLoaded, setQuickRepliesLoaded] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [filteredReplies, setFilteredReplies] = useState<QuickReply[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = 24;
    const maxHeight = lineHeight * 4 + 16; // 4 rows + padding
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [value]);

  const loadQuickReplies = useCallback(async () => {
    if (quickRepliesLoaded) return;
    try {
      const { data } = await api.get("/api/quick-replies", {
        params: { instanceId },
      });
      setQuickReplies(Array.isArray(data) ? data : []);
      setQuickRepliesLoaded(true);
    } catch (err) {
      console.error("Failed to fetch quick replies:", err);
      setQuickRepliesLoaded(true);
    }
  }, [instanceId, quickRepliesLoaded]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newValue = e.target.value;
    setValue(newValue);

    if (newValue.startsWith("/")) {
      // Load quick replies on first "/" press
      if (!quickRepliesLoaded) {
        loadQuickReplies();
      }
      const query = newValue.slice(1).toLowerCase();
      const filtered = (quickRepliesLoaded ? quickReplies : []).filter(
        (qr) =>
          qr.shortcut.toLowerCase().includes(query) ||
          qr.title.toLowerCase().includes(query)
      );
      setFilteredReplies(filtered);
      setShowPopup(true);
      setSelectedIndex(0);
    } else {
      setShowPopup(false);
    }
  }

  // Update filtered replies when quick replies load and value starts with /
  useEffect(() => {
    if (quickRepliesLoaded && value.startsWith("/")) {
      const query = value.slice(1).toLowerCase();
      const filtered = quickReplies.filter(
        (qr) =>
          qr.shortcut.toLowerCase().includes(query) ||
          qr.title.toLowerCase().includes(query)
      );
      setFilteredReplies(filtered);
      setShowPopup(true);
      setSelectedIndex(0);
    }
  }, [quickRepliesLoaded, quickReplies, value]);

  function selectReply(reply: QuickReply) {
    setValue(reply.body);
    setShowPopup(false);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  async function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || sending || disabled) return;
    setSending(true);
    setShowPopup(false);
    try {
      await onSend(trimmed);
      setValue("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (showPopup && filteredReplies.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredReplies.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectReply(filteredReplies[selectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowPopup(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="bg-wa-search border-t border-gray-200 px-4 py-3 shrink-0 relative">
      {disabled && disabledReason && (
        <div className="text-xs text-center text-gray-500 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5 mb-2">
          {disabledReason}
        </div>
      )}

      {/* Quick replies popup — positioned above input */}
      {showPopup && (
        <div
          ref={popupRef}
          className="absolute left-4 right-4 bottom-full mb-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto"
        >
          {filteredReplies.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">
              Nenhuma resposta rápida encontrada
            </div>
          ) : (
            filteredReplies.map((reply, index) => (
              <button
                key={reply.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectReply(reply);
                }}
                className={cn(
                  "w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors border-b border-gray-50 last:border-0",
                  index === selectedIndex
                    ? "bg-brand/5 border-l-2 border-l-brand"
                    : "hover:bg-gray-50"
                )}
              >
                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                  <Zap className="w-3 h-3 text-brand" />
                  <span className="text-xs font-mono font-semibold text-brand bg-brand/10 px-1.5 py-0.5 rounded">
                    /{reply.shortcut}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">{reply.title}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{reply.body}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || sending}
          placeholder={disabled ? "Conversa encerrada" : "Digite uma mensagem ou / para respostas rápidas"}
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
