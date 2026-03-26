import { create } from "zustand";
import { api } from "../lib/api-client";

export interface ConversationContact {
  id: string;
  phone: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface ConversationInstance {
  id: string;
  name: string;
}

export interface ConversationMessage {
  id: string;
  body: string;
  direction: "INBOUND" | "OUTBOUND";
  createdAt: string;
  type: string;
}

export interface ConversationResponseTimer {
  id: string;
  triggeredAt: string;
  status: string;
}

export interface Conversation {
  id: string;
  instanceId: string;
  contactId: string;
  zapiChatId: string;
  status: "OPEN" | "PENDING" | "RESOLVED" | "ARCHIVED";
  assignedUserId: string | null;
  assignedUser: { id: string; name: string } | null;
  labels: string[];
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  contact: ConversationContact;
  instance: ConversationInstance;
  messages: ConversationMessage[];
  responseTimers: ConversationResponseTimer[];
}

interface ConversationsState {
  conversations: Conversation[];
  loading: boolean;
  fetchConversations: (instanceId?: string, status?: string, assignedTo?: string) => Promise<void>;
  setConversations: (conversations: Conversation[]) => void;
  upsertConversation: (conv: Conversation) => void;
  setLoading: (loading: boolean) => void;
}

export const useConversationsStore = create<ConversationsState>((set, get) => ({
  conversations: [],
  loading: false,

  fetchConversations: async (instanceId?: string, status?: string, assignedTo?: string) => {
    set({ loading: true });
    try {
      const params: Record<string, string> = {};
      if (instanceId) params.instanceId = instanceId;
      if (status && status !== "ALL") params.status = status;
      if (assignedTo) params.assignedTo = assignedTo;
      const { data } = await api.get("/api/conversations", { params });
      const items: Conversation[] = data.items ?? data;
      set({ conversations: items });
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      set({ loading: false });
    }
  },

  setConversations: (conversations) => set({ conversations }),

  upsertConversation: (conv) => {
    set((state) => {
      const exists = state.conversations.find((c) => c.id === conv.id);
      if (exists) {
        // Update existing and move to top
        const updated = state.conversations.filter((c) => c.id !== conv.id);
        return { conversations: [conv, ...updated] };
      }
      // New conversation — add to top
      return { conversations: [conv, ...state.conversations] };
    });
  },

  setLoading: (loading) => set({ loading }),
}));
