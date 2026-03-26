"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Settings, Users, Bell, LogOut, Building2 } from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { useRouter } from "next/navigation";
import { cn } from "../../lib/utils";

const navItems = [
  { href: "/conversations", icon: MessageCircle, label: "Conversas" },
  { href: "/instances", icon: Building2, label: "Instâncias" },
  { href: "/notifications", icon: Bell, label: "Notificações" },
  { href: "/settings/profile", icon: Settings, label: "Configurações" },
];

const adminItems = [{ href: "/admin/users", icon: Users, label: "Usuários" }];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN";

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <aside className="w-16 md:w-56 bg-white border-r border-gray-200 flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">B</span>
          </div>
          <span className="font-semibold text-sm hidden md:block truncate">BGP Massa</span>
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              pathname.startsWith(href)
                ? "bg-brand/10 text-brand-dark font-medium"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="hidden md:block">{label}</span>
          </Link>
        ))}

        {isAdmin && (
          <>
            <div className="pt-2 pb-1 hidden md:block">
              <p className="text-xs text-gray-400 px-3 font-medium uppercase tracking-wide">Admin</p>
            </div>
            {adminItems.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  pathname.startsWith(href)
                    ? "bg-brand/10 text-brand-dark font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden md:block">{label}</span>
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="p-2 border-t border-gray-200">
        <div className="flex items-center gap-2 px-3 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
            <span className="text-xs font-medium text-gray-600">{user?.name?.[0]?.toUpperCase()}</span>
          </div>
          <div className="hidden md:block min-w-0">
            <p className="text-xs font-medium truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 w-full transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span className="hidden md:block">Sair</span>
        </button>
      </div>
    </aside>
  );
}
