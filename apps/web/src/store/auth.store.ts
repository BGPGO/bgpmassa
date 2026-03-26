import { create } from "zustand";
import { api } from "../lib/api-client";

interface User {
  id: string;
  email: string;
  name: string;
  signature?: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    const { data } = await api.post("/api/auth/login", { email, password });
    localStorage.setItem("accessToken", data.accessToken);
    const me = await api.get("/api/users/me");
    set({ user: me.data, isLoading: false });
  },

  logout: async () => {
    await api.post("/api/auth/logout");
    localStorage.removeItem("accessToken");
    set({ user: null });
  },

  loadMe: async () => {
    try {
      const { data } = await api.get("/api/users/me");
      set({ user: data });
    } catch {
      set({ user: null });
    }
  },
}));
