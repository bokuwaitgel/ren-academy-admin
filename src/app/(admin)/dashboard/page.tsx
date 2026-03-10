"use client";

import { useEffect, useState } from "react";
import { admin, type DashboardStats, type QuestionAnalytics, type TestAnalytics } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, FileQuestion, ClipboardList, GraduationCap,
  Activity, TrendingUp, Loader2, BookOpen,
} from "lucide-react";

function fmt(n: number | undefined) {
  return n?.toLocaleString() ?? "—";
}

function StatCard({
  label, value, icon: Icon, accent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-zinc-100">{value}</p>
          <p className="text-xs text-zinc-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [qAnalytics, setQAnalytics] = useState<QuestionAnalytics | null>(null);
  const [tAnalytics, setTAnalytics] = useState<TestAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([admin.dashboard(), admin.analytics.questions(), admin.analytics.tests()])
      .then(([s, q, t]) => {
        setStats(s);
        setQAnalytics(q);
        setTAnalytics(t);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-600" />
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    in_progress: "warning",
    submitted: "indigo",
    graded: "success",
    not_started: "secondary",
  };

  const sectionColors: Record<string, string> = {
    listening: "bg-violet-500/10 text-violet-400",
    reading: "bg-sky-500/10 text-sky-400",
    writing: "bg-amber-500/10 text-amber-400",
    speaking: "bg-emerald-500/10 text-emerald-400",
  };

  const totalQ = qAnalytics?.total_questions || 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Dashboard</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Overview of your IELTS platform</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Users"    value={fmt(stats?.total_users)}     icon={Users}        accent="bg-indigo-500/10 text-indigo-400" />
        <StatCard label="Questions"      value={fmt(stats?.total_questions)}  icon={FileQuestion} accent="bg-violet-500/10 text-violet-400" />
        <StatCard label="Tests"          value={fmt(stats?.total_tests)}      icon={ClipboardList} accent="bg-sky-500/10 text-sky-400" />
        <StatCard label="Sessions"       value={fmt(stats?.total_sessions)}   icon={GraduationCap} accent="bg-emerald-500/10 text-emerald-400" />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Active / Completed */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <Activity className="h-4 w-4" /> Session Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Active</span>
              <span className="text-lg font-bold text-amber-400">{fmt(stats?.active_sessions)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Completed</span>
              <span className="text-lg font-bold text-emerald-400">{fmt(stats?.completed_sessions)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
              <span className="text-sm text-zinc-400">Avg Band</span>
              <span className="text-lg font-bold text-indigo-400">
                {stats?.average_band != null ? stats.average_band.toFixed(1) : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Users by role */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <Users className="h-4 w-4" /> Users by Role
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats?.users_by_role || {}).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between">
                <span className="text-sm capitalize text-zinc-400">{role}</span>
                <Badge variant={role === "admin" ? "indigo" : role === "examiner" ? "warning" : "secondary"}>
                  {count}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Sessions by status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Sessions by Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats?.sessions_by_status || {}).map(([s, count]) => (
              <div key={s} className="flex items-center justify-between">
                <span className="text-sm capitalize text-zinc-400">{s.replace("_", " ")}</span>
                <Badge variant={(statusColors[s] as "warning" | "indigo" | "success" | "secondary") || "secondary"}>
                  {count}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Third row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Questions by section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <FileQuestion className="h-4 w-4" /> Questions by Section
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(qAnalytics?.by_section || {}).map(([section, count]) => {
              const pct = totalQ > 0 ? Math.round((count / totalQ) * 100) : 0;
              return (
                <div key={section}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className={`capitalize font-medium ${(sectionColors[section] || "text-zinc-400").split(" ")[1]}`}>
                      {section}
                    </span>
                    <span className="text-zinc-500">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-800">
                    <div
                      className="h-1.5 rounded-full bg-indigo-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Popular tests */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Most Popular Tests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(tAnalytics?.most_popular_tests || []).slice(0, 6).map((t, i) => (
              <div key={t.test_id} className="flex items-center gap-3">
                <span className="w-5 shrink-0 text-center text-xs font-bold text-zinc-600">
                  {i + 1}
                </span>
                <span className="flex-1 truncate text-sm text-zinc-300">{t.title}</span>
                <Badge variant="secondary">{t.attempts}</Badge>
              </div>
            ))}
            {!tAnalytics?.most_popular_tests?.length && (
              <p className="text-sm text-zinc-600">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Test overview */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold text-emerald-400">{fmt(tAnalytics?.published_tests)}</p>
            <p className="mt-1 text-xs text-zinc-500">Published Tests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold text-zinc-400">{fmt(tAnalytics?.draft_tests)}</p>
            <p className="mt-1 text-xs text-zinc-500">Draft Tests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold text-indigo-400">{fmt(tAnalytics?.total_sessions)}</p>
            <p className="mt-1 text-xs text-zinc-500">Total Attempts</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
