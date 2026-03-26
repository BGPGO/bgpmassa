import { create } from "zustand";
import type { ResponseTimeAlertEvent } from "@bgpmassa/shared";

interface AlertsState {
  alerts: ResponseTimeAlertEvent[];
  addAlert: (alert: ResponseTimeAlertEvent) => void;
  dismissAlert: (conversationId: string) => void;
  clearAll: () => void;
}

export const useAlertsStore = create<AlertsState>((set) => ({
  alerts: [],
  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts.filter((a) => a.conversationId !== alert.conversationId)],
    })),
  dismissAlert: (conversationId) =>
    set((state) => ({ alerts: state.alerts.filter((a) => a.conversationId !== conversationId) })),
  clearAll: () => set({ alerts: [] }),
}));
