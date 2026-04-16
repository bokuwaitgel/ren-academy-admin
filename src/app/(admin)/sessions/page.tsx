"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { admin, showApiError, type Session, type Paginated, type SessionResult, type SessionSectionState, type SpeakingSectionDetails, type ListeningReadingDetails, type AnswerDetail, type WritingSectionDetails, type WritingEvaluation } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Eye, Star, Loader2, ChevronLeft, ChevronRight, CheckCircle2, Clock, Circle, ChevronDown, ChevronUp, Trash2, GraduationCap,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

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
  return <span className={`${base} bg-[var(--card-bg)] text-[var(--text-muted)] border border-[var(--border-color)]`}><Circle className="h-3 w-3" />{SECTION_ABBR[sec.section] ?? sec.section}</span>;
}

function SectionProgress({ session }: { session: Session }) {
  if (session.mode === "practice") {
    const sec = session.session_sections[0];
    if (!sec) return <span className="text-xs text-[var(--text-muted)]">{session.practice_section ?? "—"}</span>;
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

// ── Speaking details panel ────────────────────────────────────

const CRITERIA_LABELS: Record<string, string> = {
  fluency_coherence: "Fluency & Coherence",
  lexical_resource: "Lexical Resource",
  grammar_accuracy: "Grammar & Accuracy",
  pronunciation: "Pronunciation",
};

function BandBar({ score }: { score: number | null }) {
  if (score == null) return <span className="text-[var(--text-muted)] text-xs">—</span>;
  const pct = (score / 9) * 100;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-[var(--surface)]">
        <div
          className="h-full rounded-full bg-indigo-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right text-xs font-bold text-indigo-300">{score}</span>
    </div>
  );
}

function SpeakingDetails({ details }: { details: SpeakingSectionDetails }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="mt-3 space-y-3">
      {/* Criteria scores */}
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface)] p-3 space-y-2">
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Criteria Breakdown</p>
        {Object.entries(CRITERIA_LABELS).map(([key, label]) => (
          <div key={key} className="grid grid-cols-[140px_1fr] items-center gap-2">
            <span className="text-xs text-[var(--text-secondary)]">{label}</span>
            <BandBar score={details.criteria[key as keyof typeof details.criteria] ?? null} />
          </div>
        ))}
      </div>

      {/* Per-answer cards */}
      {details.answer_details.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            Answer Details ({details.answer_details.length})
          </p>
          {details.answer_details.map((ans, i) => {
            const ev = ans.evaluation;
            const isOpen = expanded === i;
            return (
              <div key={i} className="rounded-lg border border-[var(--border-color)] bg-[var(--surface)]">
                <button
                  className="w-full flex items-center justify-between px-3 py-2 text-left"
                  onClick={() => setExpanded(isOpen ? null : i)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-[var(--text-muted)] shrink-0">
                      {ans.part_number ? `Part ${ans.part_number}` : ""} Q{ans.index + 1}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] truncate">{ans.question || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ev && <span className="text-sm font-bold text-indigo-400">{ev.overall_score}</span>}
                    {isOpen ? <ChevronUp className="h-3 w-3 text-[var(--text-muted)]" /> : <ChevronDown className="h-3 w-3 text-[var(--text-muted)]" />}
                  </div>
                </button>

                {isOpen && ev && (
                  <div className="border-t border-[var(--border-color)] px-3 pb-3 pt-2 space-y-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{ev.speaking_level}</Badge>
                      <span className="text-[var(--text-muted)]">{ev.grammar_errors} grammar err · {ev.vocabulary_errors} vocab err</span>
                      <span className="text-[var(--text-muted)] ml-auto">via {ev.evaluated_from}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {Object.entries(CRITERIA_LABELS).map(([key, label]) => (
                        <div key={key}>
                          <span className="text-[var(--text-muted)]">{label}: </span>
                          <span className="font-bold text-[var(--text-primary)]">{ev[key as keyof typeof ev]}</span>
                        </div>
                      ))}
                    </div>
                    {ev.overall_feedback && (
                      <p className="text-[var(--text-secondary)] leading-relaxed">{ev.overall_feedback}</p>
                    )}
                    {ev.strengths && (
                      <div>
                        <span className="text-emerald-500 font-medium">Strengths: </span>
                        <span className="text-[var(--text-secondary)]">{ev.strengths}</span>
                      </div>
                    )}
                    {ev.areas_for_improvement && (
                      <div>
                        <span className="text-amber-500 font-medium">Improve: </span>
                        <span className="text-[var(--text-secondary)]">{ev.areas_for_improvement}</span>
                      </div>
                    )}
                    {ev.sample_improvements?.length > 0 && (
                      <div>
                        <p className="text-[var(--text-muted)] mb-1">Sample improvements:</p>
                        <ul className="space-y-0.5">
                          {ev.sample_improvements.map((s, j) => (
                            <li key={j} className="text-[var(--text-secondary)] pl-2 border-l border-indigo-800">&ldquo;{s}&rdquo;</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {ev.motivation && (
                      <p className="text-indigo-400 italic">{ev.motivation}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Listening / Reading answer detail list ────────────────────

function isRecordLike(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

function formatAnswer(val: unknown): string {
  if (val == null || val === "") return "—";
  if (Array.isArray(val)) return val.map(v => (v == null ? "—" : String(v))).join(", ");
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

function answersMatch(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return false;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

function SubAnswerTable({ user, correct }: { user: unknown; correct: unknown }) {
  const userObj = isRecordLike(user) ? user : {};
  const correctObj = isRecordLike(correct) ? correct : {};
  const keys = Array.from(new Set([...Object.keys(userObj), ...Object.keys(correctObj)]))
    .sort((a, b) => {
      const na = Number(a), nb = Number(b);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });

  if (!keys.length) return null;

  return (
    <div className="mt-2 overflow-hidden rounded border border-[var(--border-color)] bg-[var(--card-bg)]/60">
      <div className="grid grid-cols-[32px_1fr_1fr_20px] items-center gap-2 px-2 py-1 text-[10px] uppercase tracking-wide text-[var(--text-muted)] border-b border-[var(--border-color)]">
        <span>#</span>
        <span>Your answer</span>
        <span>Correct</span>
        <span />
      </div>
      {keys.map(k => {
        const u = userObj[k];
        const c = correctObj[k];
        const match = answersMatch(u, c);
        const idx = Number(k);
        return (
          <div
            key={k}
            className="grid grid-cols-[32px_1fr_1fr_20px] items-center gap-2 px-2 py-1 text-[11px] border-t border-[var(--border-color)]/40 first:border-t-0"
          >
            <span className="font-mono text-[var(--text-muted)]">
              {Number.isNaN(idx) ? k : idx + 1}
            </span>
            <span
              className={
                u == null || u === ""
                  ? "text-[var(--text-muted)] italic"
                  : match
                    ? "text-emerald-300"
                    : "text-red-300"
              }
            >
              {formatAnswer(u)}
            </span>
            <span className="text-[var(--text-secondary)]">{formatAnswer(c)}</span>
            <span className="justify-self-end">
              {match
                ? <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                : <Circle className="h-3 w-3 text-red-400/70" />}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function AnswerDetailList({ details }: { details: ListeningReadingDetails }) {
  const items: AnswerDetail[] = details.answer_details ?? [];
  if (!items.length) return <p className="text-xs text-[var(--text-muted)] pt-2">No answer data.</p>;

  // Sum points so multi-part questions contribute their full weight (e.g. 10-part item counts as /10, not /1).
  const earnedSum = items.reduce((acc, a) => acc + (a.earned || 0), 0);
  const maxSum = items.reduce((acc, a) => acc + (a.max || 0), 0);

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] pb-1">
        <span>
          <span className="font-bold text-emerald-400">{earnedSum}</span>/{maxSum} correct
        </span>
      </div>
      {items.map((a, i) => {
        const isCorrect = a.max > 0 && a.earned === a.max;
        const isPartial = a.max > 0 && a.earned > 0 && a.earned < a.max;
        const isWrong = a.max > 0 && a.earned === 0;
        const isMultiPart = isRecordLike(a.user_answer) || isRecordLike(a.correct_answer);
        return (
          <div
            key={a.question_id ?? i}
            className={`rounded-lg border px-3 py-2 text-xs ${
              isCorrect ? "border-emerald-900 bg-emerald-950/20" :
              isPartial ? "border-amber-900 bg-amber-950/20" :
              isWrong ? "border-red-900/50 bg-red-950/10" :
              "border-[var(--border-color)] bg-[var(--surface)]"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[var(--text-secondary)] leading-snug flex-1">{a.title || `Q${i + 1}`}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`font-bold ${isCorrect ? "text-emerald-400" : isPartial ? "text-amber-400" : isWrong ? "text-red-400" : "text-[var(--text-muted)]"}`}>
                  {a.earned}/{a.max}
                </span>
                {isCorrect && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                {(isWrong || isPartial) && <Circle className="h-3.5 w-3.5 text-red-400" />}
              </div>
            </div>
            {isMultiPart ? (
              <SubAnswerTable user={a.user_answer} correct={a.correct_answer} />
            ) : (
              <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                <div>
                  <span className="text-[var(--text-muted)]">Your answer: </span>
                  <span className={isCorrect ? "text-emerald-300" : "text-red-300"}>{formatAnswer(a.user_answer)}</span>
                </div>
                {!isCorrect && (
                  <div>
                    <span className="text-[var(--text-muted)]">Correct: </span>
                    <span className="text-[var(--text-secondary)]">{formatAnswer(a.correct_answer)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Writing details panel ─────────────────────────────────────

const WRITING_CRITERIA_LABELS: Record<string, string> = {
  task_achievement: "Task Achievement",
  coherence_cohesion: "Coherence & Cohesion",
  lexical_resource: "Lexical Resource",
  grammar_accuracy: "Grammar & Accuracy",
};

function wordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function WritingDetails({
  session,
  details,
}: {
  session: Session;
  details: WritingSectionDetails | null;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const writingAnswers = (session.answers?.writing ?? {}) as Record<string, unknown>;
  const evals = details?.ai_evaluations ?? {};

  const keys = Array.from(
    new Set([...Object.keys(writingAnswers), ...Object.keys(evals)])
  ).sort((a, b) => a.localeCompare(b));

  if (!keys.length) {
    return (
      <p className="mt-2 text-xs text-[var(--text-muted)]">
        No writing submissions found.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {keys.map((key) => {
        const essay = typeof writingAnswers[key] === "string" ? (writingAnswers[key] as string) : "";
        const ev: WritingEvaluation | undefined = evals[key];
        const isOpen = expanded === key;
        const taskLabel = key.replace(/^task_/i, "Task ");
        const wc = wordCount(essay);
        return (
          <div key={key} className="rounded-lg border border-[var(--border-color)] bg-[var(--surface)]">
            <button
              className="w-full flex items-center justify-between px-3 py-2 text-left"
              onClick={() => setExpanded(isOpen ? null : key)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-semibold text-[var(--text-secondary)] shrink-0">{taskLabel}</span>
                <span className="text-xs text-[var(--text-muted)]">{wc} words</span>
                {!essay && <span className="text-xs text-red-400">no submission</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {ev && <span className="text-sm font-bold text-indigo-400">{ev.overall_score}</span>}
                {isOpen ? <ChevronUp className="h-3 w-3 text-[var(--text-muted)]" /> : <ChevronDown className="h-3 w-3 text-[var(--text-muted)]" />}
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-[var(--border-color)] px-3 pb-3 pt-2 space-y-3 text-xs">
                {/* Essay text */}
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1">Submission</p>
                  {essay ? (
                    <pre className="whitespace-pre-wrap break-words rounded border border-[var(--border-color)] bg-[var(--card-bg)] p-2.5 text-[12px] leading-relaxed text-[var(--text-secondary)] font-sans max-h-72 overflow-y-auto">
                      {essay}
                    </pre>
                  ) : (
                    <p className="text-[var(--text-muted)] italic">No essay submitted.</p>
                  )}
                </div>

                {/* AI evaluation */}
                {ev && (
                  <>
                    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)]/60 p-2.5 space-y-2">
                      <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Criteria Breakdown</p>
                      {Object.entries(WRITING_CRITERIA_LABELS).map(([k, label]) => (
                        <div key={k} className="grid grid-cols-[140px_1fr] items-center gap-2">
                          <span className="text-[var(--text-secondary)]">{label}</span>
                          <BandBar score={(ev[k as keyof typeof ev] as number) ?? null} />
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {ev.writing_level && <Badge variant="secondary">{ev.writing_level}</Badge>}
                      {ev.ai_detection && (
                        <Badge variant={ev.ai_detection === "Human Written" ? "success" : "warning"}>
                          {ev.ai_detection}
                          {typeof ev.ai_generation_percentage === "number" ? ` (${ev.ai_generation_percentage}%)` : ""}
                        </Badge>
                      )}
                      <span className="text-[var(--text-muted)]">
                        {ev.grammar_errors} grammar · {ev.vocabulary_errors} vocab · {ev.sentence_errors} sentence
                      </span>
                    </div>

                    {ev.overall_feedback && (
                      <p className="leading-relaxed text-[var(--text-secondary)]">{ev.overall_feedback}</p>
                    )}
                    {ev.ai_suggestions && (
                      <div>
                        <span className="text-amber-500 font-medium">Suggestions: </span>
                        <span className="text-[var(--text-secondary)]">{ev.ai_suggestions}</span>
                      </div>
                    )}
                    {ev.sentence_corrections && ev.sentence_corrections.length > 0 && (
                      <div>
                        <p className="text-[var(--text-muted)] mb-1">Sentence corrections:</p>
                        <ul className="space-y-1">
                          {ev.sentence_corrections.map((sc, j) => (
                            <li key={j} className="pl-2 border-l border-indigo-800 space-y-0.5">
                              <p className="text-red-300">{sc.original}</p>
                              <p className="text-emerald-300">{sc.corrected}</p>
                              <p className="text-[var(--text-muted)] italic">{sc.explanation}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {ev.improved_version && (
                      <details className="text-[var(--text-secondary)]">
                        <summary className="cursor-pointer text-[var(--text-muted)]">Improved version</summary>
                        <pre className="mt-1 whitespace-pre-wrap break-words rounded border border-[var(--border-color)] bg-[var(--card-bg)] p-2.5 text-[12px] leading-relaxed font-sans">
                          {ev.improved_version}
                        </pre>
                      </details>
                    )}
                    {ev.motivation && (
                      <p className="italic text-indigo-400">{ev.motivation}</p>
                    )}
                  </>
                )}

                {!ev && essay && (
                  <p className="text-[var(--text-muted)] italic">
                    No AI evaluation yet — submit AI grading or grade manually.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Section detail list (expandable) ─────────────────────────

function SectionDetailList({ session }: { session: Session }) {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const scoreMap = Object.fromEntries(
    (session.section_scores ?? []).map(sc => [sc.section, sc])
  );

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">Section Progress</p>
      <div className="space-y-2">
        {session.session_sections.map((sec) => {
          const score = scoreMap[sec.section];
          const isOpen = openSection === sec.section;
          const speakingDetails =
            sec.section === "speaking" && score?.details && "criteria" in score.details
              ? (score.details as unknown as SpeakingSectionDetails)
              : null;
          const lrDetails =
            (sec.section === "listening" || sec.section === "reading") && score?.details && "answer_details" in score.details
              ? (score.details as unknown as ListeningReadingDetails)
              : null;
          const writingDetails =
            sec.section === "writing"
              ? ((score?.details as unknown as WritingSectionDetails | undefined) ?? null)
              : null;
          const hasWritingAnswers =
            sec.section === "writing" &&
            !!(session.answers?.writing && Object.keys(session.answers.writing as Record<string, unknown>).length);
          const hasDetails =
            !!speakingDetails ||
            !!lrDetails ||
            (sec.section === "writing" && (!!writingDetails || hasWritingAnswers)) ||
            (score && score.raw_score != null);

          return (
            <div key={sec.section} className="rounded-lg border border-[var(--border-color)] bg-[var(--surface)] overflow-hidden">
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                onClick={() => hasDetails && setOpenSection(isOpen ? null : sec.section)}
              >
                <SectionPill sec={sec} />
                <span className="flex-1 text-sm capitalize text-[var(--text-secondary)]">{sec.section}</span>
                {score?.band_score != null && (
                  <span className="text-sm font-bold text-indigo-400">Band {score.band_score}</span>
                )}
                {sec.time_spent_seconds != null && (
                  <span className="text-xs text-[var(--text-muted)] ml-1">{fmtSecs(sec.time_spent_seconds)}</span>
                )}
                {hasDetails && (
                  isOpen
                    ? <ChevronUp className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
                    : <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="border-t border-[var(--border-color)] px-3 pb-3">
                  {speakingDetails ? (
                    <SpeakingDetails details={speakingDetails} />
                  ) : lrDetails ? (
                    <AnswerDetailList details={lrDetails} />
                  ) : sec.section === "writing" ? (
                    <WritingDetails session={session} details={writingDetails} />
                  ) : score ? (
                    <div className="pt-2 text-xs text-[var(--text-secondary)]">
                      <div className="flex gap-4">
                        <span>Score: <span className="font-bold text-[var(--text-primary)]">{score.raw_score}/{score.max_score}</span></span>
                        {score.band_score != null && (
                          <span>Band: <span className="font-bold text-indigo-300">{score.band_score}</span></span>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function SessionsPage() {
  const { user: currentUser } = useAuth();
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
  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState(false);


  const isSuperAdmin = currentUser?.role === "super_admin" || currentUser?.role === "super-admin";

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
    } catch (e) { showApiError(e, "Failed to load sessions"); }
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
      toast.success("Grade submitted successfully");
      setGradeSection("writing");
      setGradeBand("6.0");
      setGradeDetails("");
      setGradeOpen(null);
      load();
    } catch (e: unknown) {
      setGradeErr((e as { detail?: string })?.detail ?? "Grade failed");
    } finally { setGradeSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await admin.sessions.delete(deleteTarget.id);
      toast.success("Session deleted");
      setDeleteTarget(null);
      load();
    } catch (e: unknown) {
      showApiError(e, "Failed to delete session");
    } finally { setDeleting(false); }
  };

  const BAND_OPTIONS = ["0","1","1.5","2","2.5","3","3.5","4","4.5","5","5.5","6","6.5","7","7.5","8","8.5","9"];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Sessions</h1>
          <p className="text-sm text-[var(--text-muted)]">{data?.total ?? 0} total sessions</p>
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
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
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
                    <TableCell className="text-xs font-mono text-[var(--text-secondary)] max-w-[100px] truncate">
                      {s.user_id.slice(-8)}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-[var(--text-secondary)] max-w-[100px] truncate">
                      {s.test_id.slice(-8)}
                    </TableCell>
                    <TableCell>
                      <SectionProgress session={s} />
                    </TableCell>
                    <TableCell><StatusBadge status={s.status} /></TableCell>
                    <TableCell>
                      {s.overall_band != null
                        ? <span className="font-bold text-indigo-400">{s.overall_band}</span>
                        : <span className="text-[var(--text-muted)]">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--text-muted)]">
                      {new Date(s.started_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label="View session" onClick={() => setViewSession(s)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(s.status === "submitted" || s.status === "graded") && (
                          <Button
                            variant="ghost" size="icon"
                            aria-label="View results"
                            className="text-indigo-400 hover:bg-indigo-950/30"
                            onClick={() => openResult(s)}
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        {(s.status === "submitted" || s.status === "graded") && (
                          <Button
                            variant="ghost" size="icon"
                            aria-label="Grade session"
                            className="text-amber-400 hover:bg-amber-950/30"
                            onClick={() => { setGradeOpen(s); setGradeErr(""); }}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        {isSuperAdmin && (
                          <Button
                            variant="ghost" size="icon"
                            aria-label="Delete session"
                            className="text-red-500 hover:bg-red-950/30"
                            onClick={() => setDeleteTarget(s)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!data?.items.length && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <EmptyState
                        icon={GraduationCap}
                        title="No sessions found"
                        description="Try adjusting your search or filters"
                      />
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
        <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
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
        <DialogContent className="!max-w-[min(1100px,92vw)] w-[min(1100px,92vw)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Session Detail</DialogTitle>
          </DialogHeader>
          {viewSession && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Session ID</p>
                  <p className="font-mono text-xs text-[var(--text-secondary)]">{viewSession.id}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">User ID</p>
                  <p className="font-mono text-xs text-[var(--text-secondary)]">{viewSession.user_id}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Mode</p>
                  <Badge variant={viewSession.mode === "practice" ? "indigo" : "secondary"} className="mt-1 capitalize">
                    {viewSession.mode === "full_test" ? "Full Test" : "Practice"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Status</p>
                  <div className="mt-1"><StatusBadge status={viewSession.status} /></div>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Started</p>
                  <p className="text-[var(--text-secondary)]">{new Date(viewSession.started_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Duration</p>
                  <p className="text-[var(--text-secondary)]">{fmtSecs(viewSession.time_spent_seconds)}</p>
                </div>
                {viewSession.overall_band != null && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Overall Band</p>
                    <p className="text-2xl font-bold text-indigo-400">{viewSession.overall_band}</p>
                  </div>
                )}
                {viewSession.current_section && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Current Section</p>
                    <Badge variant="warning" className="mt-1 capitalize">{viewSession.current_section}</Badge>
                  </div>
                )}
              </div>

              {/* Section states */}
              {viewSession.session_sections.length > 0 && (
                <SectionDetailList session={viewSession} />
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
              <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
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
                  <p className="text-xs font-medium text-[var(--text-muted)]">Section Scores</p>
                  {result.section_scores.map((sc) => {
                    const isSpeaking = sc.section === "speaking";
                    const speakingDetails = isSpeaking && sc.details && "criteria" in sc.details
                      ? sc.details as SpeakingSectionDetails
                      : null;
                    return (
                      <div key={sc.section} className="rounded border border-[var(--border-color)] bg-[var(--surface)]">
                        <div className="flex items-center justify-between px-3 py-2">
                          <span className="capitalize font-medium text-[var(--text-secondary)]">{sc.section}</span>
                          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                            <span>{sc.raw_score}/{sc.max_score} answers</span>
                            <span className="font-bold text-[var(--text-primary)]">Band {sc.band_score}</span>
                          </div>
                        </div>
                        {speakingDetails && (
                          <div className="border-t border-[var(--border-color)] px-3 pb-3">
                            <SpeakingDetails details={speakingDetails} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>Duration: {fmtSecs(result.time_spent_seconds)}</span>
                {result.finished_at && (
                  <span>Finished: {new Date(result.finished_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">Results not yet available.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Are you sure you want to permanently delete session{" "}
              <span className="font-mono text-[var(--text-primary)]">{deleteTarget?.id.slice(-8)}</span>?
              This action cannot be undone.
            </p>
            <div className="flex gap-2 pt-1">
              <DialogClose asChild>
                <Button variant="outline" className="flex-1">Cancel</Button>
              </DialogClose>
              <Button
                className="flex-1 bg-red-700 hover:bg-red-600 text-white"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
              </Button>
            </div>
          </div>
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
              <label className="text-sm font-medium text-[var(--text-secondary)]">Section</label>
              <Select value={gradeSection} onValueChange={setGradeSection}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="writing">Writing</SelectItem>
                  <SelectItem value="speaking">Speaking</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-secondary)]">Band Score</label>
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
              <label className="text-sm font-medium text-[var(--text-secondary)]">Details (JSON, optional)</label>
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
