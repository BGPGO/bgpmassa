import { create } from "zustand";
import { api } from "../lib/api-client";

export interface Instance {
  id: string;
  name: string;
  phoneNumber: string | null;
  status: "CONNECTED" | "DISCONNECTED" | "QRCODE_PENDING";
  zapiInstanceId: string;
  createdAt: string;
}

interface InstancesState {
  instances: Instance[];
  loading: boolean;
  fetchInstances: () => Promise<void>;
}

export const useInstancesStore = create<InstancesState>((set) => ({
  instances: [],
  loading: false,

  fetchInstances: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get("/api/instances");
      const items: Instance[] = data.items ?? data;
      set({ instances: items });
    } catch (error) {
      console.error("Failed to fetch instances:", error);
    } finally {
      set({ loading: false });
    }
  },
}));
