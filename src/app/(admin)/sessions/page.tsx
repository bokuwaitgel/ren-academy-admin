"use client";

import { useEffect, useState, useCallback } from "react";
import { admin, type Session, type Paginated, type SessionResult } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Award,
  Clock,
  CheckCircle2,
} from "lucide-react";

const STATUS_OPTIONS = ["in_progress", "submitted", "graded"];

export default function SessionsPage() {
  const [data, setData] = useState<Paginated<Session> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");

  // Detail / result dialogs
  const [viewSession, setViewSession] = useState<Session | null>(null);
  const [viewResult, setViewResult] = useState<SessionResult | null>(null);
  const [loadingResult, setLoadingResult] = useState(false);

  // Grading dialog
  const [gradeSession, setGradeSession] = useState<Session | null>(null);
  const [gradeSection, setGradeSection] = useState("writing");
  const [gradeBand, setGradeBand] = useState("6.0");
  const [gradeDetails, setGradeDetails] = useState("");
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState("");

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, page_size: 20 };
      if (statusFilter !== "all") params.status = statusFilter;
      setData(await admin.sessions.list(params));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const openResult = async (session: Session) => {
    setLoadingResult(true);
    setViewResult(null);
    try {
      const r = await admin.sessions.result(session.id);
      setViewResult(r);
    } catch {
      /* ignore */
    } finally {
      setLoadingResult(false);
    }
  };

  const openGrade = (session: Session) => {
    setGradeSession(session);
    setGradeSection("writing");
    setGradeBand("6.0");
    setGradeDetails("");
    setGradeError("");
  };

  const handleGrade = async () => {
    if (!gradeSession) return;
    setGradeError("");
    setGrading(true);
    try {
      let details: Record<string, unknown> | undefined;
      if (gradeDetails.trim()) {
        try {
          details = JSON.parse(gradeDetails);
        } catch {
          setGradeError("Invalid JSON for details");
          setGrading(false);
          return;
        }
      }
      await admin.sessions.grade(
        gradeSession.id,
        gradeSection,
        parseFloat(gradeBand),
        details,
      );
      setGradeSession(null);
      fetchSessions();
    } catch (err: unknown) {
      const e = err as { detail?: string };
      setGradeError(typeof e?.detail === "string" ? e.detail : "Failed to grade");
    } finally {
      setGrading(false);
    }
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case "in_progress":
        return <Badge variant="warning">In Progress</Badge>;
      case "submitted":
        return <Badge variant="default">Submitted</Badge>;
      case "graded":
        return <Badge variant="success">Graded</Badge>;
      default:
        return <Badge variant="secondary" className="capitalize">{s.replace(/_/g, " ")}</Badge>;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Sessions</h1>
        <p className="text-sm text-zinc-500">Monitor test sessions and grade writing/speaking</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-zinc-400">
              No sessions found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Band</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs text-zinc-500">
                      {s.id.slice(0, 8)}…
                    </TableCell>
                    <TableCell className="font-mono text-xs text-zinc-500">
                      {s.user_id.slice(0, 8)}…
                    </TableCell>
                    <TableCell>{statusBadge(s.status)}</TableCell>
                    <TableCell>
                      {s.overall_band != null ? (
                        <span className="font-semibold text-zinc-900">{s.overall_band}</span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-500">
                      {formatDuration(s.time_spent_seconds)}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">
                      {new Date(s.started_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="View details"
                          onClick={() => setViewSession(s)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="View result"
                          onClick={() => openResult(s)}
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </Button>
                        {(s.status === "submitted" || s.status === "graded") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Grade writing/speaking"
                            onClick={() => openGrade(s)}
                          >
                            <Award className="h-4 w-4 text-amber-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-500">
            Page {data.page} of {data.total_pages} ({data.total} sessions)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= data.total_pages} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* View session detail */}
      <Dialog open={!!viewSession} onOpenChange={() => setViewSession(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle>Session Details</DialogTitle>
          </DialogHeader>
          {viewSession && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-zinc-700">Session ID</span>
                  <p className="font-mono text-xs text-zinc-500">{viewSession.id}</p>
                </div>
                <div>
                  <span className="font-medium text-zinc-700">User ID</span>
                  <p className="font-mono text-xs text-zinc-500">{viewSession.user_id}</p>
                </div>
                <div>
                  <span className="font-medium text-zinc-700">Test ID</span>
                  <p className="font-mono text-xs text-zinc-500">{viewSession.test_id}</p>
                </div>
                <div>
                  <span className="font-medium text-zinc-700">Status</span>
                  <div className="mt-1">{statusBadge(viewSession.status)}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-zinc-400" />
                  <span className="text-zinc-600">{formatDuration(viewSession.time_spent_seconds)}</span>
                </div>
                {viewSession.overall_band != null && (
                  <div className="flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-amber-500" />
                    <span className="font-semibold text-zinc-900">Band {viewSession.overall_band}</span>
                  </div>
                )}
              </div>
              {viewSession.section_scores.length > 0 && (
                <div>
                  <span className="font-medium text-zinc-700">Section Scores</span>
                  <div className="mt-2 space-y-2">
                    {viewSession.section_scores.map((sc, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2">
                        <Badge variant="secondary" className="capitalize">{sc.section}</Badge>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-zinc-500">{sc.raw_score}/{sc.max_score} raw</span>
                          <span className="font-semibold text-zinc-900">Band {sc.band_score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {Object.keys(viewSession.answers).length > 0 && (
                <div>
                  <span className="font-medium text-zinc-700">Answers</span>
                  <pre className="mt-1 max-h-40 overflow-auto rounded bg-zinc-50 p-3 text-xs text-zinc-600">
                    {JSON.stringify(viewSession.answers, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View result */}
      <Dialog open={!!viewResult || loadingResult} onOpenChange={() => { setViewResult(null); setLoadingResult(false); }}>
        <DialogContent className="max-h-[80vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle>Session Result</DialogTitle>
          </DialogHeader>
          {loadingResult ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : viewResult ? (
            <div className="space-y-4 text-sm">
              <div className="text-center">
                <p className="text-4xl font-bold text-zinc-900">
                  {viewResult.overall_band != null ? viewResult.overall_band : "—"}
                </p>
                <p className="text-sm text-zinc-500">Overall Band</p>
              </div>
              <div className="space-y-2">
                {viewResult.section_scores.map((sc, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3">
                    <span className="capitalize font-medium text-zinc-700">{sc.section}</span>
                    <div className="text-right">
                      <p className="font-semibold text-zinc-900">Band {sc.band_score}</p>
                      <p className="text-xs text-zinc-500">{sc.raw_score}/{sc.max_score}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-zinc-500">
                <div>Status: <span className="capitalize font-medium text-zinc-700">{viewResult.status}</span></div>
                <div>Duration: <span className="font-medium text-zinc-700">{formatDuration(viewResult.time_spent_seconds)}</span></div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-400 text-center py-8">No result available</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Grade dialog */}
      <Dialog open={!!gradeSession} onOpenChange={() => setGradeSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grade Writing / Speaking</DialogTitle>
          </DialogHeader>
          {gradeSession && (
            <div className="space-y-4">
              {gradeError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{gradeError}</div>
              )}
              <div className="text-xs text-zinc-500">
                Session: <span className="font-mono">{gradeSession.id.slice(0, 12)}…</span>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Section</label>
                <Select value={gradeSection} onValueChange={setGradeSection}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="writing">Writing</SelectItem>
                    <SelectItem value="speaking">Speaking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Band Score</label>
                <Select value={gradeBand} onValueChange={setGradeBand}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 19 }, (_, i) => (i * 0.5).toFixed(1)).map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Details (optional JSON)</label>
                <textarea
                  className="flex w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-xs font-mono shadow-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400"
                  rows={3}
                  placeholder='{"task_achievement": 6, "coherence": 7, ...}'
                  value={gradeDetails}
                  onChange={(e) => setGradeDetails(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setGradeSession(null)}>Cancel</Button>
                <Button onClick={handleGrade} disabled={grading}>
                  {grading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Grade"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
