"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { questions as qApi, showApiError, type Question, type Paginated } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import QuestionCreator from "@/components/question-creator";
import { Plus, Search, Trash2, Eye, Loader2, ChevronLeft, ChevronRight, Pencil, Headphones, BookOpen, PenTool, Mic } from "lucide-react";

const SECTIONS = [
  { value: "listening", label: "Listening", icon: Headphones, color: "text-indigo-400 border-indigo-700 bg-indigo-950/30 hover:bg-indigo-950/50", activeColor: "border-indigo-500 bg-indigo-950/60 text-indigo-300" },
  { value: "reading",   label: "Reading",   icon: BookOpen,   color: "text-emerald-400 border-emerald-700 bg-emerald-950/30 hover:bg-emerald-950/50", activeColor: "border-emerald-500 bg-emerald-950/60 text-emerald-300" },
  { value: "writing",   label: "Writing",   icon: PenTool,    color: "text-amber-400 border-amber-700 bg-amber-950/30 hover:bg-amber-950/50", activeColor: "border-amber-500 bg-amber-950/60 text-amber-300" },
  { value: "speaking",  label: "Speaking",  icon: Mic,        color: "text-[var(--text-secondary)] border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)]", activeColor: "border-[var(--text-secondary)] bg-[var(--surface-secondary)] text-[var(--text-primary)]" },
];

const SECTION_PARTS: Record<string, { value: string; label: string }[]> = {
  listening: [
    { value: "listening_section_1", label: "Section 1" },
    { value: "listening_section_2", label: "Section 2" },
    { value: "listening_section_3", label: "Section 3" },
    { value: "listening_section_4", label: "Section 4" },
  ],
  reading: [
    { value: "reading_passage_1", label: "Passage 1" },
    { value: "reading_passage_2", label: "Passage 2" },
    { value: "reading_passage_3", label: "Passage 3" },
  ],
  writing: [
    { value: "writing_task_1", label: "Task 1" },
    { value: "writing_task_2", label: "Task 2" },
  ],
  speaking: [
    { value: "speaking_part_1", label: "Part 1" },
    { value: "speaking_part_2", label: "Part 2" },
    { value: "speaking_part_3", label: "Part 3" },
  ],
};

const sectionVariant: Record<string, "indigo" | "warning" | "success" | "secondary"> = {
  listening: "indigo",
  reading: "success",
  writing: "warning",
  speaking: "secondary",
};

// Question type → human label
const TYPE_LABELS: Record<string, string> = {
  multiple_choice: "Multiple Choice", multiple_select: "Multiple Select",
  form_completion: "Form Completion", note_completion: "Note Completion",
  table_completion: "Table Completion", flow_chart_completion: "Flow Chart Completion",
  summary_completion: "Summary Completion", sentence_completion: "Sentence Completion",
  short_answer: "Short Answer", matching: "Matching",
  matching_headings: "Matching Headings", matching_information: "Matching Information",
  matching_features: "Matching Features", map_labelling: "Map Labelling",
  plan_labelling: "Plan Labelling", diagram_labelling: "Diagram Labelling",
  true_false_not_given: "True / False / Not Given", yes_no_not_given: "Yes / No / Not Given",
  pick_from_list: "Pick from List",
  graph_description: "Graph Description", letter_writing: "Letter Writing",
  process_description: "Process Description", map_comparison: "Map Comparison",
  essay_opinion: "Opinion Essay", essay_discussion: "Discussion Essay",
  essay_problem_solution: "Problem & Solution Essay", essay_advantages: "Advantages Essay",
  essay_mixed: "Mixed Essay",
  speaking_interview: "Interview", speaking_cue_card: "Cue Card",
  speaking_discussion: "Discussion",
};

function typeLabel(t: string) { return TYPE_LABELS[t] ?? t.replace(/_/g, " "); }

function truncate(str: string, n = 60) {
  return str.length > n ? str.slice(0, n) + "…" : str;
}

function groupByType(items: Question[]): { type: string; label: string; questions: Question[] }[] {
  const map = new Map<string, Question[]>();
  for (const q of items) {
    if (!map.has(q.type)) map.set(q.type, []);
    map.get(q.type)!.push(q);
  }
  return [...map.entries()].map(([type, questions]) => ({
    type, label: typeLabel(type), questions,
  }));
}

export default function QuestionsPage() {
  const [activeSection, setActiveSection] = useState("listening");
  const [activePart, setActivePart] = useState(SECTION_PARTS["listening"][0].value);
  const [data, setData] = useState<Paginated<Question> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [viewQ, setViewQ] = useState<Question | null>(null);
  const [editQ, setEditQ] = useState<Question | null>(null);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [groupByTypeEnabled, setGroupByTypeEnabled] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, page_size: 20, section: activeSection, section_part: activePart };
      if (search) params.search = search;
      const res = await qApi.list(params);
      setData(res);
    } catch (e) { showApiError(e, "Failed to load questions"); }
    finally { setLoading(false); }
  }, [page, search, activeSection, activePart]);

  useEffect(() => { load(); }, [load]);

  const handleSectionChange = (section: string) => {
    const firstPart = SECTION_PARTS[section]?.[0]?.value ?? "";
    setActiveSection(section);
    setActivePart(firstPart);
    setPage(1);
    setSearch("");
  };

  const handlePartChange = (part: string) => {
    setActivePart(part);
    setPage(1);
    setSearch("");
  };

  const handleEdit = async (q: Question) => {
    setLoadingEditId(q.id);
    try {
      const full = await qApi.get(q.id);
      setEditQ(full);
    } catch (e) { showApiError(e, "Failed to load question"); }
    finally { setLoadingEditId(null); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await qApi.delete(deleteTarget.id);
      toast.success("Question deleted");
      setDeleteTarget(null);
      load();
    } catch (e) { showApiError(e, "Failed to delete question"); }
    finally { setDeletingId(null); }
  };

  const sectionInfo = SECTIONS.find((s) => s.value === activeSection)!;
  const parts = SECTION_PARTS[activeSection] ?? [];
  const activePartLabel = parts.find((p) => p.value === activePart)?.label ?? activePart;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Questions</h1>
          <p className="text-sm text-[var(--text-muted)]">{data?.total ?? 0} questions in {sectionInfo.label} — {activePartLabel}</p>
        </div>
        <Button onClick={() => setCreatorOpen(true)}>
          <Plus className="h-4 w-4" /> Add Question
        </Button>
      </div>

      {/* Step 1 — Section */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Step 1 — Section</p>
        <div className="grid grid-cols-4 gap-2">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const isActive = activeSection === s.value;
            return (
              <button
                key={s.value}
                onClick={() => handleSectionChange(s.value)}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                  isActive ? s.activeColor + " ring-1 ring-inset ring-white/10" : s.color
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2 — Part */}
      <div className={`rounded-xl border p-4 space-y-3 transition-all ${sectionInfo.activeColor.replace("text-", "border-").split(" ")[0]} bg-[var(--surface)]`}>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          Step 2 — {sectionInfo.label} Part
        </p>
        <div className="flex flex-wrap gap-2">
          {parts.map((p) => {
            const isActive = activePart === p.value;
            return (
              <button
                key={p.value}
                onClick={() => handlePartChange(p.value)}
                className={`rounded-lg border-2 px-5 py-2.5 text-sm font-semibold transition-all ${
                  isActive
                    ? sectionInfo.activeColor + " ring-1 ring-inset ring-white/10"
                    : "border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-color)] hover:text-[var(--text-primary)]"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 3 — Questions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Step 3 — Questions ({data?.total ?? 0})
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGroupByTypeEnabled((v) => !v)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                groupByTypeEnabled
                  ? "border-[var(--border-color)] bg-[var(--surface-secondary)] text-[var(--text-primary)]"
                  : "border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-color)] hover:text-[var(--text-secondary)]"
              }`}
            >
              Group by type
            </button>
            <div className="relative max-w-xs w-48">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input
                placeholder="Search…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 h-8 text-sm"
              />
            </div>
          </div>
        </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
            </div>
          ) : groupByTypeEnabled && data?.items.length ? (
            <div className="divide-y divide-[var(--border-color)]">
              {groupByType(data.items).map(({ type, label, questions }) => (
                <div key={type}>
                  <div className="flex items-center gap-2 bg-[var(--surface)] px-4 py-2">
                    <span className="text-xs font-semibold text-[var(--text-secondary)]">{label}</span>
                    <span className="rounded border border-[var(--border-color)] px-1.5 py-0 text-[10px] text-[var(--text-muted)]">{questions.length}</span>
                  </div>
                  <Table>
                    <TableBody>
                      {questions.map((q) => (
                        <TableRow key={q.id}>
                          <TableCell className="max-w-xs">
                            <p className="font-medium text-[var(--text-primary)]">{truncate(q.title)}</p>
                            {q.type === "speaking_cue_card" && (q.cue_card as { bullet_points?: string[] } | undefined)?.bullet_points?.length ? (
                              <ul className="mt-1 space-y-0.5 pl-3">
                                {(q.cue_card as { bullet_points: string[] }).bullet_points.map((b, idx) => (
                                  <li key={idx} className="text-[var(--text-muted)] text-xs truncate list-disc">{b}</li>
                                ))}
                              </ul>
                            ) : q.section === "speaking" && ((q.speaking_questions as { question: string }[] | undefined)?.filter((i) => i.question?.trim()).length ?? 0) > 0 && (
                              <ol className="mt-1 space-y-0.5 list-decimal list-inside">
                                {(q.speaking_questions as { question: string }[]).filter((i) => i.question?.trim()).map((item, idx) => (
                                  <li key={idx} className="text-[var(--text-muted)] text-xs truncate">{item.question}</li>
                                ))}
                              </ol>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">{q.module_type}</Badge>
                          </TableCell>
                          <TableCell className="text-[var(--text-muted)] text-xs">{new Date(q.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setViewQ(q)}><Eye className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(q)} disabled={loadingEditId === q.id}>
                                {loadingEditId === q.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                              </Button>
                              <Button variant="ghost" size="icon"
                                className="text-red-500 hover:bg-red-950/40 hover:text-red-400"
                                onClick={() => setDeleteTarget(q)} disabled={deletingId === q.id}>
                                {deletingId === q.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="max-w-xs">
                      <p className="font-medium text-[var(--text-primary)]">{truncate(q.title)}</p>
                      {q.type === "speaking_cue_card" && (q.cue_card as { bullet_points?: string[] } | undefined)?.bullet_points?.length ? (
                        <ul className="mt-1 space-y-0.5 pl-3">
                          {(q.cue_card as { bullet_points: string[] }).bullet_points.map((b, idx) => (
                            <li key={idx} className="text-[var(--text-muted)] text-xs truncate list-disc">{b}</li>
                          ))}
                        </ul>
                      ) : q.section === "speaking" && ((q.speaking_questions as { question: string }[] | undefined)?.filter((i) => i.question?.trim()).length ?? 0) > 0 && (
                        <ol className="mt-1 space-y-0.5 list-decimal list-inside">
                          {(q.speaking_questions as { question: string }[]).filter((i) => i.question?.trim()).map((item, idx) => (
                            <li key={idx} className="text-[var(--text-muted)] text-xs truncate">{item.question}</li>
                          ))}
                        </ol>
                      )}
                    </TableCell>
                    <TableCell className="text-[var(--text-secondary)] text-xs">{q.type.replace(/_/g, " ")}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{q.module_type}</Badge>
                    </TableCell>
                    <TableCell className="text-[var(--text-muted)] text-xs">
                      {new Date(q.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewQ(q)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(q)} disabled={loadingEditId === q.id}>
                          {loadingEditId === q.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="text-red-500 hover:bg-red-950/40 hover:text-red-400"
                          onClick={() => setDeleteTarget(q)}
                          disabled={deletingId === q.id}
                        >
                          {deletingId === q.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!data?.items.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-[var(--text-muted)]">
                      No questions in {sectionInfo.label} — {activePartLabel}
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
      </div>{/* end Step 3 */}

      {/* View detail dialog */}
      <Dialog open={!!viewQ} onOpenChange={() => setViewQ(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewQ?.title}</DialogTitle>
          </DialogHeader>
          {viewQ && (() => {
            const q = viewQ as Record<string, unknown>;
            const formFields = q.form_fields as { label: string; prefix: string; answer: string }[] | undefined;
            const tableCells = q.table_cells as { row_header: string; col_header: string; answer: string }[] | undefined;
            const flowSteps = q.flow_steps as { step_number: number; description: string; answer: string; is_blank: boolean }[] | undefined;
            const sentences = q.sentences as { before: string; after: string; answer: string }[] | undefined;
            const summaryItems = q.summary_items as { before: string; after: string; answer: string; word_options: string }[] | undefined;
            const shortItems = q.short_items as { question: string; answer: string }[] | undefined;
            const mapWordBox = q.map_word_box as string[] | undefined;
            const mapSlots = q.map_slots as { slot_label: string; position: string; answer: string }[] | undefined;
            const matchingItems = q.matching_items as { item: string; answer: string }[] | undefined;
            const headingOptions = q.heading_options as { label: string; text: string }[] | undefined;
            const headingItems = q.heading_items as { paragraph_label: string; answer: string }[] | undefined;
            const tfngItems = q.tfng_items as { statement: string; answer: string }[] | undefined;
            const pickItems = q.pick_items as { question: string; answers: string[] }[] | undefined;
            const writingPrompt = q.writing_prompt as { prompt: string; word_limit: number; time_limit_mins: number; chart_type?: string; letter_type?: string; letter_situation?: string } | undefined;
            const cueCard = q.cue_card as { topic: string; bullet_points: string[]; follow_up?: string; prep_time_seconds: number; speak_time_seconds: number } | undefined;
            const speakingQuestions = q.speaking_questions as { question: string }[] | undefined;
            return (
              <div className="space-y-3 text-sm">
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant={sectionVariant[viewQ.section] ?? "secondary"} className="capitalize">{viewQ.section}</Badge>
                  <Badge variant="outline" className="capitalize text-[var(--text-secondary)]">{viewQ.section_part.replace(/_/g, " ")}</Badge>
                  <Badge variant="secondary">{viewQ.type.replace(/_/g, " ")}</Badge>
                  <Badge variant="secondary" className="capitalize">{viewQ.module_type}</Badge>
                </div>

                {/* Context */}
                {viewQ.context && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">Context</p>
                    <p className="text-[var(--text-secondary)] text-xs leading-relaxed">{viewQ.context}</p>
                  </div>
                )}

                {/* Instruction */}
                {viewQ.instruction && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">Instruction</p>
                    <p className="text-[var(--text-secondary)]">{viewQ.instruction}</p>
                  </div>
                )}

                {/* Audio */}
                {viewQ.audio_url && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">Audio</p>
                    <audio controls src={viewQ.audio_url} className="w-full h-8" />
                  </div>
                )}

                {/* Image */}
                {viewQ.image_url && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">Image</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={viewQ.image_url} alt="question" className="max-h-48 rounded border border-[var(--border-color)] object-contain" />
                  </div>
                )}

                {/* Passage */}
                {viewQ.passage && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">Passage</p>
                    <p className="max-h-40 overflow-y-auto text-[var(--text-secondary)] text-xs leading-relaxed whitespace-pre-wrap">{viewQ.passage}</p>
                  </div>
                )}

                {/* MCQ options */}
                {viewQ.options && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">Options</p>
                    <div className="space-y-1">
                      {viewQ.options.map((o) => {
                        const isCorrect = viewQ.correct_option
                          ? o.label === viewQ.correct_option
                          : (viewQ.correct_options as string[] | undefined)?.includes(o.label);
                        return (
                          <div key={o.label} className={`flex gap-2 rounded px-2 py-1 text-xs ${isCorrect ? "bg-emerald-950/50 text-emerald-300" : "text-[var(--text-secondary)]"}`}>
                            <span className="font-bold">{o.label}.</span> {o.text}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sentences / Note completion */}
                {sentences && sentences.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">Sentences</p>
                    <div className="space-y-1">
                      {sentences.map((s, i) => (
                        <div key={i} className="text-xs text-[var(--text-secondary)]">
                          {s.before} <span className="rounded bg-emerald-950/50 text-emerald-300 px-1">{s.answer}</span> {s.after}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary completion */}
                {summaryItems && summaryItems.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">Summary Items</p>
                    <div className="space-y-1">
                      {summaryItems.map((s, i) => (
                        <div key={i} className="text-xs text-[var(--text-secondary)]">
                          {s.before} <span className="rounded bg-emerald-950/50 text-emerald-300 px-1">{s.answer}</span> {s.after}
                          {s.word_options && <span className="ml-2 text-[var(--text-muted)]">({s.word_options})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Form completion */}
                {formFields && formFields.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">Form Fields</p>
                    <div className="rounded border border-[var(--border-color)] overflow-hidden">
                      <table className="w-full text-xs">
                        <thead><tr className="border-b border-[var(--border-color)] bg-[var(--surface)]"><th className="px-2 py-1 text-left text-[var(--text-secondary)]">Label</th><th className="px-2 py-1 text-left text-[var(--text-secondary)]">Prefix</th><th className="px-2 py-1 text-left text-emerald-400">Answer</th></tr></thead>
                        <tbody>
                          {formFields.map((f, i) => (
                            <tr key={i} className="border-b border-[var(--border-color)] last:border-0">
                              <td className="px-2 py-1 text-[var(--text-secondary)]">{f.label}</td>
                              <td className="px-2 py-1 text-[var(--text-secondary)]">{f.prefix}</td>
                              <td className="px-2 py-1 text-emerald-300">{f.answer}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Table completion */}
                {tableCells && tableCells.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">Table Cells</p>
                    <div className="rounded border border-[var(--border-color)] overflow-hidden">
                      <table className="w-full text-xs">
                        <thead><tr className="border-b border-[var(--border-color)] bg-[var(--surface)]"><th className="px-2 py-1 text-left text-[var(--text-secondary)]">Row</th><th className="px-2 py-1 text-left text-[var(--text-secondary)]">Column</th><th className="px-2 py-1 text-left text-emerald-400">Answer</th></tr></thead>
                        <tbody>
                          {tableCells.map((c, i) => (
                            <tr key={i} className="border-b border-[var(--border-color)] last:border-0">
                              <td className="px-2 py-1 text-[var(--text-secondary)]">{c.row_header}</td>
                              <td className="px-2 py-1 text-[var(--text-secondary)]">{c.col_header}</td>
                              <td className="px-2 py-1 text-emerald-300">{c.answer}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Flow chart */}
                {flowSteps && flowSteps.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">Flow Steps</p>
                    <div className="space-y-1">
                      {flowSteps.map((s, i) => (
                        <div key={i} className="flex gap-2 text-xs text-[var(--text-secondary)]">
                          <span className="text-[var(--text-muted)] w-4 shrink-0">{s.step_number}.</span>
                          <span>{s.description}</span>
                          {s.is_blank && <span className="rounded bg-emerald-950/50 text-emerald-300 px-1 ml-auto shrink-0">{s.answer}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Short answer */}
                {shortItems && shortItems.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">Short Answer Items</p>
                    <div className="space-y-1">
                      {shortItems.map((s, i) => (
                        <div key={i} className="flex justify-between gap-4 text-xs rounded px-2 py-1 bg-[var(--surface)]">
                          <span className="text-[var(--text-secondary)]">{s.question}</span>
                          <span className="text-emerald-300 shrink-0">{s.answer}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Map/Plan/Diagram */}
                {mapSlots && mapSlots.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">Map Slots</p>
                    {mapWordBox && mapWordBox.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {mapWordBox.map((w, i) => <span key={i} className="rounded border border-[var(--border-color)] px-1.5 py-0.5 text-xs text-[var(--text-secondary)]">{w}</span>)}
                      </div>
                    )}
                    <div className="space-y-1">
                      {mapSlots.map((s, i) => (
                        <div key={i} className="flex gap-3 text-xs">
                          <span className="text-[var(--text-muted)] font-bold w-4 shrink-0">{s.slot_label}</span>
                          <span className="text-[var(--text-secondary)]">{s.position}</span>
                          <span className="text-emerald-300 ml-auto shrink-0">{s.answer}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matching */}
                {matchingItems && matchingItems.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">Matching Items</p>
                    <div className="space-y-1">
                      {matchingItems.map((m, i) => (
                        <div key={i} className="flex justify-between gap-4 text-xs rounded px-2 py-1 bg-[var(--surface)]">
                          <span className="text-[var(--text-secondary)]">{m.item}</span>
                          <span className="text-emerald-300 shrink-0">{m.answer}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matching headings */}
                {headingItems && headingItems.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">Heading Items</p>
                    {headingOptions && headingOptions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {headingOptions.map((h) => <span key={h.label} className="rounded border border-[var(--border-color)] px-1.5 py-0.5 text-xs text-[var(--text-secondary)]"><b>{h.label}</b> {h.text}</span>)}
                      </div>
                    )}
                    <div className="space-y-1">
                      {headingItems.map((h, i) => (
                        <div key={i} className="flex justify-between gap-4 text-xs rounded px-2 py-1 bg-[var(--surface)]">
                          <span className="text-[var(--text-secondary)]">Paragraph {h.paragraph_label}</span>
                          <span className="text-emerald-300 shrink-0">{h.answer}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TFNG */}
                {tfngItems && tfngItems.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">Statements</p>
                    <div className="space-y-1">
                      {tfngItems.map((t, i) => (
                        <div key={i} className="flex justify-between gap-4 text-xs rounded px-2 py-1 bg-[var(--surface)]">
                          <span className="text-[var(--text-secondary)]">{t.statement}</span>
                          <span className={`shrink-0 font-medium ${t.answer === "TRUE" || t.answer === "YES" ? "text-emerald-300" : t.answer === "FALSE" || t.answer === "NO" ? "text-red-400" : "text-yellow-400"}`}>{t.answer}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pick from list */}
                {pickItems && pickItems.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">Pick From List</p>
                    <div className="space-y-1">
                      {pickItems.map((p, i) => (
                        <div key={i} className="text-xs rounded px-2 py-1 bg-[var(--surface)]">
                          <p className="text-[var(--text-secondary)] mb-0.5">{p.question}</p>
                          <p className="text-emerald-300">{p.answers.join(", ")}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Writing prompt */}
                {writingPrompt && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">Writing Prompt</p>
                    <div className="rounded border border-[var(--border-color)] p-2 space-y-1.5 text-xs">
                      <p className="text-[var(--text-secondary)] leading-relaxed">{writingPrompt.prompt}</p>
                      <div className="flex gap-3 text-[var(--text-muted)]">
                        <span>{writingPrompt.word_limit}+ words</span>
                        <span>{writingPrompt.time_limit_mins} min</span>
                        {writingPrompt.chart_type && <span className="capitalize">{writingPrompt.chart_type}</span>}
                        {writingPrompt.letter_type && <span className="capitalize">{writingPrompt.letter_type} letter</span>}
                      </div>
                      {writingPrompt.letter_situation && <p className="text-[var(--text-secondary)]">{writingPrompt.letter_situation}</p>}
                    </div>
                  </div>
                )}

                {/* Cue card */}
                {cueCard && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">Cue Card</p>
                    <div className="rounded border border-[var(--border-color)] p-2 space-y-1.5 text-xs">
                      <p className="text-[var(--text-secondary)] font-medium">{cueCard.topic}</p>
                      <ul className="space-y-0.5 pl-3">
                        {cueCard.bullet_points.map((b, i) => <li key={i} className="text-[var(--text-secondary)] list-disc">{b}</li>)}
                      </ul>
                      {cueCard.follow_up && <p className="text-[var(--text-secondary)] italic">{cueCard.follow_up}</p>}
                      <div className="flex gap-3 text-[var(--text-muted)]">
                        <span>Prep: {cueCard.prep_time_seconds}s</span>
                        <span>Speak: {cueCard.speak_time_seconds}s</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Speaking questions */}
                {speakingQuestions && speakingQuestions.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">Speaking Questions</p>
                    <ol className="space-y-1 list-decimal list-inside">
                      {speakingQuestions.map((item, idx) => (
                        <li key={idx} className="text-[var(--text-secondary)] text-xs">{item.question}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Tags */}
                {viewQ.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {viewQ.tags.map((t) => (
                      <span key={t} className="rounded border border-[var(--border-color)] px-1.5 py-0.5 text-xs text-[var(--text-muted)]">{t}</span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-[var(--text-muted)]">ID: {viewQ.id}</p>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Question"
        description={`Are you sure you want to delete "${deleteTarget?.title ?? "this question"}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deletingId === deleteTarget?.id}
      />

      {/* Creator modal — pre-seeded with current section + part */}
      {creatorOpen && (
        <QuestionCreator
          initialSection={activeSection}
          initialPart={activePart}
          onClose={() => setCreatorOpen(false)}
          onCreated={() => { setCreatorOpen(false); toast.success("Question created"); load(); }}
        />
      )}

      {/* Editor modal */}
      {editQ && (
        <QuestionCreator
          initialData={editQ}
          onClose={() => setEditQ(null)}
          onCreated={() => { setEditQ(null); toast.success("Question created"); load(); }}
          onUpdated={() => { setEditQ(null); toast.success("Question updated"); load(); }}
        />
      )}
    </div>
  );
}