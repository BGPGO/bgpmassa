"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, UserCircle, Tag, X } from "lucide-react";
import { ResponseTimerBadge } from "./ResponseTimerBadge";
import { api } from "../../lib/api-client";
import { cn } from "../../lib/utils";

interface Contact {
  id: string;
  name: string | null;
  phone: string;
  avatarUrl: string | null;
}

interface Instance {
  id: string;
  name: string;
}

type ConvStatus = "OPEN" | "PENDING" | "RESOLVED" | "ARCHIVED";

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface Props {
  conversationId: string;
  contact: Contact;
  instance: Instance;
  status: ConvStatus;
  activeTimer?: { triggeredAt: string } | null;
  assignedUser: { id: string; name: string } | null;
  labels: string[];
  onStatusChange: (status: ConvStatus) => void;
  onAssignChange: (user: { id: string; name: string } | null) => void;
  onLabelsChange: (labels: string[]) => void;
}

const STATUS_LABELS: Record<ConvStatus, string> = {
  OPEN: "Aberta",
  PENDING: "Pendente",
  RESOLVED: "Resolvida",
  ARCHIVED: "Arquivada",
};

const STATUS_COLORS: Record<ConvStatus, string> = {
  OPEN: "bg-brand text-white",
  PENDING: "bg-yellow-400 text-yellow-900",
  RESOLVED: "bg-gray-400 text-white",
  ARCHIVED: "bg-gray-300 text-gray-600",
};

const ALL_STATUSES: ConvStatus[] = ["OPEN", "PENDING", "RESOLVED", "ARCHIVED"];

const PRESET_LABELS = [
  { name: "Urgente", classes: "bg-red-100 text-red-700 border-red-200" },
  { name: "VIP", classes: "bg-purple-100 text-purple-700 border-purple-200" },
  { name: "Aguardando", classes: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { name: "Financeiro", classes: "bg-blue-100 text-blue-700 border-blue-200" },
  { name: "Suporte", classes: "bg-gray-100 text-gray-700 border-gray-200" },
];

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

export function ChatHeader({
  conversationId,
  contact,
  instance,
  status,
  activeTimer,
  assignedUser,
  labels,
  onStatusChange,
  onAssignChange,
  onLabelsChange,
}: Props) {
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [assignDropdownOpen, setAssignDropdownOpen] = useState(false);
  const [labelEditorOpen, setLabelEditorOpen] = useState(false);
  const [changing, setChanging] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [assignChanging, setAssignChanging] = useState(false);
  const [labelsChanging, setLabelsChanging] = useState(false);

  const assignDropdownRef = useRef<HTMLDivElement>(null);
  const labelEditorRef = useRef<HTMLDivElement>(null);

  const name = contact.name || contact.phone;
  const avatarColor = getAvatarColor(name);
  const avatarLetter = name[0]?.toUpperCase() ?? "?";

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (assignDropdownRef.current && !assignDropdownRef.current.contains(e.target as Node)) {
        setAssignDropdownOpen(false);
      }
      if (labelEditorRef.current && !labelEditorRef.current.contains(e.target as Node)) {
        setLabelEditorOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleStatusChange(newStatus: ConvStatus) {
    if (newStatus === status || changing) return;
    setChanging(true);
    setStatusDropdownOpen(false);
    try {
      await api.patch(`/api/conversations/${conversationId}/status`, { status: newStatus });
      onStatusChange(newStatus);
    } catch (err) {
      console.error("Failed to change status:", err);
    } finally {
      setChanging(false);
    }
  }

  async function openAssignDropdown() {
    setAssignDropdownOpen((v) => !v);
    if (!assignDropdownOpen && users.length === 0) {
      setLoadingUsers(true);
      try {
        const { data } = await api.get("/api/users");
        setUsers(data.items ?? data);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        setLoadingUsers(false);
      }
    }
  }

  async function handleAssign(user: UserOption | null) {
    setAssignDropdownOpen(false);
    if (assignChanging) return;
    setAssignChanging(true);
    try {
      const { data } = await api.patch(`/api/conversations/${conversationId}/assign`, {
        userId: user ? user.id : null,
      });
      onAssignChange(data.assignedUser ?? null);
    } catch (err) {
      console.error("Failed to assign conversation:", err);
    } finally {
      setAssignChanging(false);
    }
  }

  async function handleToggleLabel(labelName: string) {
    if (labelsChanging) return;
    const currentLabels = labels ?? [];
    let newLabels: string[];
    if (currentLabels.includes(labelName)) {
      newLabels = currentLabels.filter((l) => l !== labelName);
    } else {
      if (currentLabels.length >= 5) return;
      newLabels = [...currentLabels, labelName];
    }
    setLabelsChanging(true);
    try {
      await api.patch(`/api/conversations/${conversationId}/labels`, { labels: newLabels });
      onLabelsChange(newLabels);
    } catch (err) {
      console.error("Failed to update labels:", err);
    } finally {
      setLabelsChanging(false);
    }
  }

  const visibleLabels = (labels ?? []).slice(0, 3);

  return (
    <div className="bg-wa-header px-4 py-2.5 flex items-center gap-3 shrink-0 shadow-sm">
      {/* Avatar */}
      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white font-semibold",
          avatarColor
        )}
      >
        {avatarLetter}
      </div>

      {/* Name + phone + labels */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-white font-medium text-sm truncate">{name}</p>
          <span className="text-[10px] bg-white/20 text-gray-200 px-1.5 py-0.5 rounded-full shrink-0">
            {instance.name}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          {contact.name && (
            <p className="text-gray-400 text-xs truncate">{contact.phone}</p>
          )}
          {visibleLabels.map((label) => (
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
      </div>

      {/* Timer badge */}
      {activeTimer && (
        <div className="shrink-0">
          <ResponseTimerBadge triggeredAt={activeTimer.triggeredAt} />
        </div>
      )}

      {/* Labels editor button */}
      <div className="relative shrink-0" ref={labelEditorRef}>
        <button
          onClick={() => setLabelEditorOpen((v) => !v)}
          className="flex items-center gap-1 text-gray-300 hover:text-white text-xs bg-white/10 hover:bg-white/20 px-2 py-1.5 rounded-lg transition-colors"
          title="Gerenciar labels"
        >
          <Tag className="w-3.5 h-3.5" />
        </button>

        {labelEditorOpen && (
          <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[180px] z-50">
            <p className="text-xs font-semibold text-gray-500 px-3 pb-1.5 border-b border-gray-100">
              Labels
            </p>
            <div className="pt-1">
              {PRESET_LABELS.map((preset) => {
                const active = (labels ?? []).includes(preset.name);
                return (
                  <button
                    key={preset.name}
                    onClick={() => handleToggleLabel(preset.name)}
                    disabled={labelsChanging}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors",
                      labelsChanging && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded border",
                        preset.classes
                      )}
                    >
                      {preset.name}
                    </span>
                    {active && <X className="w-3.5 h-3.5 text-gray-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Assignment button */}
      <div className="relative shrink-0" ref={assignDropdownRef}>
        <button
          onClick={openAssignDropdown}
          disabled={assignChanging}
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all",
            "bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white",
            assignChanging && "opacity-60 cursor-not-allowed"
          )}
        >
          <UserCircle className="w-3.5 h-3.5" />
          <span className="max-w-[80px] truncate">
            {assignChanging ? "..." : assignedUser ? assignedUser.name : "Atribuir"}
          </span>
          <ChevronDown className="w-3 h-3" />
        </button>

        {assignDropdownOpen && (
          <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px] z-50">
            <button
              onClick={() => handleAssign(null)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors text-gray-500 italic"
            >
              Sem atribuição
            </button>
            <div className="border-t border-gray-100 my-0.5" />
            {loadingUsers ? (
              <div className="px-3 py-2 text-xs text-gray-400">Carregando...</div>
            ) : (
              users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleAssign(user)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2",
                    assignedUser?.id === user.id ? "font-semibold text-brand" : "text-gray-700"
                  )}
                >
                  <div className="w-6 h-6 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-semibold text-brand">
                      {user.name
                        .split(" ")
                        .slice(0, 2)
                        .map((p) => p[0])
                        .join("")
                        .toUpperCase()}
                    </span>
                  </div>
                  <span className="truncate">{user.name}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Status dropdown */}
      <div className="relative shrink-0">
        <button
          onClick={() => setStatusDropdownOpen((v) => !v)}
          disabled={changing}
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all",
            STATUS_COLORS[status],
            "opacity-90 hover:opacity-100"
          )}
        >
          {changing ? "..." : STATUS_LABELS[status]}
          <ChevronDown className="w-3 h-3" />
        </button>

        {statusDropdownOpen && (
          <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px] z-50">
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2",
                  s === status ? "font-semibold text-brand" : "text-gray-700"
                )}
              >
                <span
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    s === "OPEN" && "bg-brand",
                    s === "PENDING" && "bg-yellow-400",
                    s === "RESOLVED" && "bg-gray-400",
                    s === "ARCHIVED" && "bg-gray-300"
                  )}
                />
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
