"use client";

import { useEffect, useState, useCallback } from "react";
import { admin, type Session, type Paginated, type SessionResult, type SessionSectionState } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Eye, Star, Loader2, ChevronLeft, ChevronRight, CheckCircle2, Clock, Circle,
} from "lucide-react";

// ── Section progress helpers ──────────────────────────────────

const FULL_TEST_ORDER = ["listening", "reading", "writing", "speaking"] as const;
const SECTION_ABBR: Record<string, string> = {
  listening: "L", reading: "R", writing: "W", speaking: "S",
};

function SectionPill({ sec }: { sec: SessionSectionState }) {
  const base = "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold";
  if (sec.status === "completed")
    return <span className={`${base} bg-emerald-950/60 text-emerald-400 border border-emerald-900`}><CheckCircle2 className="h-3 w-3" />{SECTION_ABBR[sec.section] ?? sec.section}</span>;
  if (sec.status === "in_progress")
    return <span className={`${base} bg-amber-950/60 text-amber-400 border border-amber-900`}><Clock className="h-3 w-3" />{SECTION_ABBR[sec.section] ?? sec.section}</span>;
  return <span className={`${base} bg-zinc-900 text-zinc-600 border border-zinc-800`}><Circle className="h-3 w-3" />{SECTION_ABBR[sec.section] ?? sec.section}</span>;
}

function SectionProgress({ session }: { session: Session }) {
  if (session.mode === "practice") {
    const sec = session.session_sections[0];
    if (!sec) return <span className="text-xs text-zinc-600">{session.practice_section ?? "—"}</span>;
    return (
      <div className="flex items-center gap-1.5">
        <Badge variant="indigo" className="text-xs">PRACTICE</Badge>
        <SectionPill sec={sec} />
      </div>
    );
  }

  // FULL_TEST — show all sections in order
  const secMap = Object.fromEntries(session.session_sections.map(s => [s.section, s]));
  return (
    <div className="flex items-center gap-1.5">
      <Badge variant="secondary" className="text-xs">FULL</Badge>
      <div className="flex gap-1">
        {FULL_TEST_ORDER.map(key => {
          const s = secMap[key];
          if (!s) return null;
          return <SectionPill key={key} sec={s} />;
        })}
      </div>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, "warning" | "indigo" | "success" | "secondary"> = {
    in_progress: "warning", submitted: "indigo", graded: "success", not_started: "secondary",
  };
  return <Badge variant={map[status] ?? "secondary"} className="capitalize">{status.replace("_", " ")}</Badge>;
}

// ── Format seconds ────────────────────────────────────────────

function fmtSecs(s?: number | null) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec}s`;
}

// ── Main page ─────────────────────────────────────────────────

export default function SessionsPage() {
  const [data, setData] = useState<Paginated<Session> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");

  const [viewSession, setViewSession] = useState<Session | null>(null);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [resultLoading, setResultLoading] = useState(false);
  const [gradeOpen, setGradeOpen] = useState<Session | null>(null);
  const [gradeSection, setGradeSection] = useState("writing");
  const [gradeBand, setGradeBand] = useState("6.0");
  const [gradeDetails, setGradeDetails] = useState("");
  const [gradeSaving, setGradeSaving] = useState(false);
  const [gradeErr, setGradeErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, page_size: 20 };
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await admin.sessions.list(params);
      // client-side filter by mode (backend doesn't have mode filter yet)
      if (modeFilter !== "all") {
        res.items = res.items.filter(s => s.mode === modeFilter);
      }
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, statusFilter, modeFilter]);

  useEffect(() => { load(); }, [load]);

  const openResult = async (session: Session) => {
    setViewSession(null);
    setResult(null);
    setResultLoading(true);
    try {
      const r = await admin.sessions.result(session.id);
      setResult(r);
    } catch { /* not graded yet */ }
    finally { setResultLoading(false); }
  };

  const handleGrade = async () => {
    if (!gradeOpen) return;
    setGradeErr("");
    setGradeSaving(true);
    try {
      let details: Record<string, unknown> | undefined;
      if (gradeDetails.trim()) {
        try { details = JSON.parse(gradeDetails); } catch {
          setGradeErr("Details must be valid JSON"); setGradeSaving(false); return;
        }
      }
      await admin.sessions.grade(gradeOpen.id, gradeSection, Number(gradeBand), details);
      setGradeOpen(null);
      load();
    } catch (e: unknown) {
      setGradeErr((e as { detail?: string })?.detail ?? "Grade failed");
    } finally { setGradeSaving(false); }
  };

  const BAND_OPTIONS = ["0","1","1.5","2","2.5","3","3.5","4","4.5","5","5.5","6","6.5","7","7.5","8","8.5","9"];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Sessions</h1>
          <p className="text-sm text-zinc-500">{data?.total ?? 0} total sessions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="graded">Graded</SelectItem>
          </SelectContent>
        </Select>
        <Select value={modeFilter} onValueChange={v => { setModeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modes</SelectItem>
            <SelectItem value="full_test">Full Test</SelectItem>
            <SelectItem value="practice">Practice</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Mode / Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Band</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs font-mono text-zinc-400 max-w-[100px] truncate">
                      {s.user_id.slice(-8)}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-zinc-400 max-w-[100px] truncate">
                      {s.test_id.slice(-8)}
                    </TableCell>
                    <TableCell>
                      <SectionProgress session={s} />
                    </TableCell>
                    <TableCell><StatusBadge status={s.status} /></TableCell>
                    <TableCell>
                      {s.overall_band != null
                        ? <span className="font-bold text-indigo-400">{s.overall_band}</span>
                        : <span className="text-zinc-600">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">
                      {new Date(s.started_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewSession(s)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(s.status === "submitted" || s.status === "graded") && (
                          <Button
                            variant="ghost" size="icon"
                            className="text-indigo-400 hover:bg-indigo-950/30"
                            onClick={() => openResult(s)}
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        {(s.status === "submitted" || s.status === "graded") && (
                          <Button
                            variant="ghost" size="icon"
                            className="text-amber-400 hover:bg-amber-950/30"
                            onClick={() => { setGradeOpen(s); setGradeErr(""); }}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!data?.items.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-zinc-600">
                      No sessions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span>Page {data.page} of {data.total_pages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= data.total_pages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Session detail dialog */}
      <Dialog open={!!viewSession} onOpenChange={() => setViewSession(null)}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Session Detail</DialogTitle>
          </DialogHeader>
          {viewSession && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-zinc-500">Session ID</p>
                  <p className="font-mono text-xs text-zinc-400">{viewSession.id}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">User ID</p>
                  <p className="font-mono text-xs text-zinc-400">{viewSession.user_id}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Mode</p>
                  <Badge variant={viewSession.mode === "practice" ? "indigo" : "secondary"} className="mt-1 capitalize">
                    {viewSession.mode === "full_test" ? "Full Test" : "Practice"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Status</p>
                  <div className="mt-1"><StatusBadge status={viewSession.status} /></div>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Started</p>
                  <p className="text-zinc-300">{new Date(viewSession.started_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Duration</p>
                  <p className="text-zinc-300">{fmtSecs(viewSession.time_spent_seconds)}</p>
                </div>
                {viewSession.overall_band != null && (
                  <div>
                    <p className="text-xs text-zinc-500">Overall Band</p>
                    <p className="text-2xl font-bold text-indigo-400">{viewSession.overall_band}</p>
                  </div>
                )}
                {viewSession.current_section && (
                  <div>
                    <p className="text-xs text-zinc-500">Current Section</p>
                    <Badge variant="warning" className="mt-1 capitalize">{viewSession.current_section}</Badge>
                  </div>
                )}
              </div>

              {/* Section states */}
              {viewSession.session_sections.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-zinc-500">Section Progress</p>
                  <div className="space-y-2">
                    {viewSession.session_sections.map((sec) => (
                      <div key={sec.section} className="rounded-lg border border-zinc-800 bg-zinc-800/30 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <SectionPill sec={sec} />
                            <span className="capitalize text-sm text-zinc-300">{sec.section}</span>
                          </div>
                          <span className="text-xs text-zinc-500">{fmtSecs(sec.time_spent_seconds)}</span>
                        </div>
                        {sec.time_limit_seconds && (
                          <p className="mt-1 text-xs text-zinc-600">Limit: {Math.round(sec.time_limit_seconds / 60)} min</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Result dialog */}
      <Dialog open={resultLoading || !!result} onOpenChange={() => { setResult(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Session Result</DialogTitle>
          </DialogHeader>
          {resultLoading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
            </div>
          ) : result ? (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <StatusBadge status={result.status} />
                <Badge variant={result.mode === "practice" ? "indigo" : "secondary"}>
                  {result.mode === "full_test" ? "Full Test" : "Practice"}
                </Badge>
                {result.overall_band != null && (
                  <span className="ml-auto text-3xl font-bold text-indigo-400">{result.overall_band}</span>
                )}
              </div>
              {result.section_scores.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-500">Section Scores</p>
                  {result.section_scores.map((sc) => (
                    <div key={sc.section} className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-800/30 px-3 py-2">
                      <span className="capitalize font-medium text-zinc-300">{sc.section}</span>
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <span>{sc.raw_score}/{sc.max_score} raw</span>
                        <span className="font-bold text-zinc-200">Band {sc.band_score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Duration: {fmtSecs(result.time_spent_seconds)}</span>
                {result.finished_at && (
                  <span>Finished: {new Date(result.finished_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Results not yet available.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Grade dialog */}
      <Dialog open={!!gradeOpen} onOpenChange={() => setGradeOpen(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Grade Section</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {gradeErr && (
              <div className="rounded border border-red-900 bg-red-950/50 p-3 text-sm text-red-400">{gradeErr}</div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Section</label>
              <Select value={gradeSection} onValueChange={setGradeSection}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="writing">Writing</SelectItem>
                  <SelectItem value="speaking">Speaking</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Band Score</label>
              <Select value={gradeBand} onValueChange={setGradeBand}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BAND_OPTIONS.map(b => (
                    <SelectItem key={b} value={b}>Band {b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Details (JSON, optional)</label>
              <Input
                value={gradeDetails}
                onChange={e => setGradeDetails(e.target.value)}
                placeholder='{"task_achievement": 6, "coherence": 6}'
              />
            </div>
            <div className="flex gap-2 pt-1">
              <DialogClose asChild>
                <Button variant="outline" className="flex-1">Cancel</Button>
              </DialogClose>
              <Button className="flex-1" onClick={handleGrade} disabled={gradeSaving}>
                {gradeSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Grade"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
