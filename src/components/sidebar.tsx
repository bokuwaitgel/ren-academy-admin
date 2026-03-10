"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileQuestion,
  ClipboardList,
  GraduationCap,
  LogOut,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/questions", label: "Questions", icon: FileQuestion },
  { href: "/tests", label: "Tests", icon: ClipboardList },
  { href: "/sessions", label: "Sessions", icon: GraduationCap },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-zinc-200 bg-zinc-50">
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b border-zinc-200 px-5 py-4">
        <BookOpen className="h-6 w-6 text-zinc-900" />
        <span className="text-lg font-bold tracking-tight text-zinc-900">
          Ren Academy
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-200 px-3 py-4">
        {user && (
          <div className="mb-3 px-3">
            <p className="truncate text-sm font-medium text-zinc-900">
              {user.username}
            </p>
            <p className="truncate text-xs text-zinc-500">{user.email}</p>
            <p className="mt-0.5 text-xs capitalize text-zinc-400">
              {user.role}
            </p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
