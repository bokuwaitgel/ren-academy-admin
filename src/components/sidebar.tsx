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
  Sun,
  Moon,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "next-themes";

const NAV_ITEMS = [
  { href: "/dashboard",  label: "Dashboard",  icon: LayoutDashboard, roles: ["admin", "super_admin", "super-admin"] },
  { href: "/users",      label: "Users",       icon: Users,           roles: ["admin", "super_admin", "super-admin"] },
  { href: "/questions",  label: "Questions",   icon: FileQuestion,    roles: ["admin", "super_admin", "super-admin", "examiner"] },
  { href: "/tests",      label: "Tests",       icon: ClipboardList,   roles: ["admin", "super_admin", "super-admin"] },
  { href: "/sessions",   label: "Sessions",    icon: GraduationCap,   roles: ["admin", "super_admin", "super-admin", "examiner"] },
  { href: "/payments",   label: "Payments",    icon: CreditCard,      roles: ["admin", "super_admin", "super-admin"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-[var(--border-color)] bg-[var(--sidebar-bg)]">
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b border-[var(--border-color)] px-5 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
          <BookOpen className="h-4 w-4 text-white" />
        </div>
        <span className="text-base font-bold tracking-tight text-[var(--text-primary)]">
          Ren Academy
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {NAV_ITEMS.filter(item => !user || item.roles.includes(user.role)).map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-indigo-600/15 text-indigo-400 border-l-2 border-indigo-500 pl-[10px]"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--border-color)] px-3 py-4 space-y-3">
        {user && (
          <div className="px-3">
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">{user.username}</p>
            <p className="truncate text-xs text-[var(--text-muted)]">{user.email}</p>
            <span className="mt-1 inline-block rounded-md border border-[var(--border-color)] bg-[var(--surface)] px-1.5 py-0.5 text-xs capitalize text-[var(--text-secondary)]">
              {user.role}
            </span>
          </div>
        )}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:bg-red-950/40 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
