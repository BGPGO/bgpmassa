"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/auth.store";
import { SocketProvider } from "../../providers/SocketProvider";
import { ResponseTimeAlertContainer } from "../../components/alerts/ResponseTimeAlert";
import { Sidebar } from "../../components/layout/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loadMe } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    loadMe().then(() => {
      const { user } = useAuthStore.getState();
      if (!user) router.push("/login");
    });
  }, []);

  if (!user) return null;

  return (
    <SocketProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
      <ResponseTimeAlertContainer />
    </SocketProvider>
  );
}
