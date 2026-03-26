"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MessageCircle, Settings, Users, Bell, LogOut } from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { cn } from "../../lib/utils";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const navItems: NavItem[] = [
  { href: "/conversations", icon: MessageCircle, label: "Conversas" },
  { href: "/notifications", icon: Bell, label: "Notificações" },
  { href: "/settings/profile", icon: Settings, label: "Configurações" },
];

const adminItems: NavItem[] = [
  { href: "/admin/users", icon: Users, label: "Usuários" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN";
  const initials = user?.name
    ? user.name
        .split(" ")
        .slice(0, 2)
        .map((p) => p[0])
        .join("")
        .toUpperCase()
    : "?";

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <aside className="w-14 bg-wa-sidebar flex flex-col h-full shrink-0 z-10">
      {/* Logo */}
      <div className="flex items-center justify-center h-14 shrink-0">
        <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center">
          <span className="text-white font-bold text-base leading-none">B</span>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col items-center gap-1 py-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <div key={href} className="relative group">
              <Link
                href={href}
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-xl transition-colors",
                  active
                    ? "text-brand bg-white/10"
                    : "text-gray-400 hover:text-white hover:bg-white/10"
                )}
              >
                <Icon className="w-5 h-5" />
              </Link>
              {/* Tooltip */}
              <div className="absolute left-14 top-1/2 -translate-y-1/2 pointer-events-none z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-gray-900 text-white text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap shadow-lg">
                  {label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
                </div>
              </div>
            </div>
          );
        })}

        {isAdmin && (
          <>
            <div className="w-6 border-t border-white/10 my-1" />
            {adminItems.map(({ href, icon: Icon, label }) => {
              const active = pathname.startsWith(href);
              return (
                <div key={href} className="relative group">
                  <Link
                    href={href}
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-xl transition-colors",
                      active
                        ? "text-brand bg-white/10"
                        : "text-gray-400 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </Link>
                  <div className="absolute left-14 top-1/2 -translate-y-1/2 pointer-events-none z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-gray-900 text-white text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap shadow-lg">
                      {label}
                      <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </nav>

      {/* Bottom user + logout */}
      <div className="flex flex-col items-center gap-1 pb-3">
        {/* User avatar */}
        <div className="relative group">
          <div className="w-9 h-9 rounded-full bg-gray-500 flex items-center justify-center cursor-default select-none">
            <span className="text-white text-xs font-semibold">{initials}</span>
          </div>
          <div className="absolute left-14 bottom-0 pointer-events-none z-50 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-gray-900 text-white text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap shadow-lg">
              {user?.name}
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="relative group">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-10 h-10 rounded-xl text-gray-400 hover:text-red-400 hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
          <div className="absolute left-14 top-1/2 -translate-y-1/2 pointer-events-none z-50 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-gray-900 text-white text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap shadow-lg">
              Sair
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
