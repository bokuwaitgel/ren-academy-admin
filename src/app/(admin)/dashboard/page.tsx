"use client";

import { useEffect, useState } from "react";
import { admin, type DashboardStats, type QuestionAnalytics, type TestAnalytics } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FileQuestion,
  ClipboardList,
  GraduationCap,
  Activity,
  CheckCircle,
  Loader2,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [qAnalytics, setQAnalytics] = useState<QuestionAnalytics | null>(null);
  const [tAnalytics, setTAnalytics] = useState<TestAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [s, q, t] = await Promise.all([
          admin.dashboard(),
          admin.analytics.questions(),
          admin.analytics.tests(),
        ]);
        setStats(s);
        setQAnalytics(q);
        setTAnalytics(t);
      } catch {
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-2 text-zinc-500">
        <AlertCircle className="h-8 w-8" />
        <p>{error || "No data"}</p>
      </div>
    );
  }

  const statCards = [
    { label: "Total Users", value: stats.total_users, icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Questions", value: stats.total_questions, icon: FileQuestion, color: "text-purple-600 bg-purple-50" },
    { label: "Tests", value: stats.total_tests, icon: ClipboardList, color: "text-emerald-600 bg-emerald-50" },
    { label: "Sessions", value: stats.total_sessions, icon: GraduationCap, color: "text-amber-600 bg-amber-50" },
    { label: "Active Now", value: stats.active_sessions, icon: Activity, color: "text-rose-600 bg-rose-50" },
    { label: "Completed", value: stats.completed_sessions, icon: CheckCircle, color: "text-teal-600 bg-teal-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-500">Overview of your IELTS platform</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-900">{value}</p>
                  <p className="text-xs text-zinc-500">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Average band score */}
      {stats.average_band != null && (
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
              <TrendingUp className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-zinc-900">{stats.average_band.toFixed(1)}</p>
              <p className="text-sm text-zinc-500">Average Band Score</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Users by role */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Users by Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.users_by_role).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">{role}</Badge>
                  </div>
                  <span className="text-sm font-semibold text-zinc-900">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sessions by status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sessions by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.sessions_by_status).map(([st, count]) => {
                const variant = st === "completed" || st === "graded" ? "success" : st === "in_progress" ? "warning" : "secondary";
                return (
                  <div key={st} className="flex items-center justify-between">
                    <Badge variant={variant} className="capitalize">{st.replace(/_/g, " ")}</Badge>
                    <span className="text-sm font-semibold text-zinc-900">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Question distribution */}
        {qAnalytics && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Questions by Section</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(qAnalytics.by_section).map(([section, count]) => (
                  <div key={section} className="flex items-center justify-between">
                    <span className="text-sm capitalize text-zinc-600">{section}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 rounded-full bg-zinc-200" style={{ width: 120 }}>
                        <div
                          className="h-2 rounded-full bg-purple-500"
                          style={{ width: `${Math.min(100, (count / qAnalytics.total_questions) * 100)}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-sm font-semibold text-zinc-900">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Band distribution */}
        {tAnalytics && Object.keys(tAnalytics.band_distribution).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Band Score Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(tAnalytics.band_distribution)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([band, count]) => (
                    <div key={band} className="flex items-center justify-between">
                      <span className="text-sm text-zinc-600">Band {band}</span>
                      <span className="text-sm font-semibold text-zinc-900">{count}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Most popular tests */}
        {tAnalytics && tAnalytics.most_popular_tests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Most Popular Tests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tAnalytics.most_popular_tests.slice(0, 5).map((t, i) => (
                  <div key={t.test_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-600">{i + 1}</span>
                      <span className="text-sm text-zinc-700 truncate max-w-[200px]">{t.title}</span>
                    </div>
                    <Badge variant="secondary">{t.attempts} attempts</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test overview */}
        {tAnalytics && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Test Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-zinc-50 p-3 text-center">
                  <p className="text-2xl font-bold text-zinc-900">{tAnalytics.published_tests}</p>
                  <p className="text-xs text-zinc-500">Published</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3 text-center">
                  <p className="text-2xl font-bold text-zinc-900">{tAnalytics.draft_tests}</p>
                  <p className="text-xs text-zinc-500">Drafts</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3 text-center">
                  <p className="text-2xl font-bold text-zinc-900">{tAnalytics.total_tests}</p>
                  <p className="text-xs text-zinc-500">Total Tests</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3 text-center">
                  <p className="text-2xl font-bold text-zinc-900">{tAnalytics.total_sessions}</p>
                  <p className="text-xs text-zinc-500">Total Sessions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
