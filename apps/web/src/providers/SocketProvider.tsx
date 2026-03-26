"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import { getSocket, disconnectSocket } from "../lib/socket-client";
import { useAlertsStore } from "../store/alerts.store";
import type { ResponseTimeAlertEvent } from "@bgpmassa/shared";

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const addAlert = useAlertsStore((s) => s.addAlert);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;
    socket.connect();

    socket.on("alert:response_time", (event: ResponseTimeAlertEvent) => {
      addAlert(event);
      // Play notification sound for >=1h alerts
      if (event.thresholdMinutes >= 60) {
        new Notification(`Alerta: ${event.contactName}`, {
          body: `Sem resposta há ${event.thresholdMinutes >= 60 ? `${event.thresholdMinutes / 60}h` : `${event.thresholdMinutes}min`}`,
        });
      }
    });

    return () => {
      socket.off("alert:response_time");
      disconnectSocket();
    };
  }, [addAlert]);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
