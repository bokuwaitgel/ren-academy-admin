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
  { href: "/dashboard",  label: "Dashboard",  icon: LayoutDashboard },
  { href: "/users",      label: "Users",       icon: Users },
  { href: "/questions",  label: "Questions",   icon: FileQuestion },
  { href: "/tests",      label: "Tests",       icon: ClipboardList },
  { href: "/sessions",   label: "Sessions",    icon: GraduationCap },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-zinc-800 bg-[#111111]">
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b border-zinc-800 px-5 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
          <BookOpen className="h-4 w-4 text-white" />
        </div>
        <span className="text-base font-bold tracking-tight text-zinc-100">
          Ren Academy
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-indigo-600/15 text-indigo-400 border-l-2 border-indigo-500 pl-[10px]"
                  : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-800 px-3 py-4 space-y-3">
        {user && (
          <div className="px-3">
            <p className="truncate text-sm font-medium text-zinc-200">{user.username}</p>
            <p className="truncate text-xs text-zinc-500">{user.email}</p>
            <span className="mt-1 inline-block rounded-md border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-xs capitalize text-zinc-400">
              {user.role}
            </span>
          </div>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-red-950/40 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
