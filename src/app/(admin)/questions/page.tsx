"use client";

import { useEffect, useState, useCallback } from "react";
import { questions as qApi, type Question, type Paginated } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import QuestionCreator from "@/components/question-creator";
import { Plus, Search, Trash2, Eye, Loader2, ChevronLeft, ChevronRight, Pencil, Headphones, BookOpen, PenTool, Mic } from "lucide-react";

const SECTIONS = [
  { value: "listening", label: "Listening", icon: Headphones, color: "text-indigo-400 border-indigo-700 bg-indigo-950/30 hover:bg-indigo-950/50", activeColor: "border-indigo-500 bg-indigo-950/60 text-indigo-300" },
  { value: "reading",   label: "Reading",   icon: BookOpen,   color: "text-emerald-400 border-emerald-700 bg-emerald-950/30 hover:bg-emerald-950/50", activeColor: "border-emerald-500 bg-emerald-950/60 text-emerald-300" },
  { value: "writing",   label: "Writing",   icon: PenTool,    color: "text-amber-400 border-amber-700 bg-amber-950/30 hover:bg-amber-950/50", activeColor: "border-amber-500 bg-amber-950/60 text-amber-300" },
  { value: "speaking",  label: "Speaking",  icon: Mic,        color: "text-zinc-300 border-zinc-700 bg-zinc-800/40 hover:bg-zinc-800/60", activeColor: "border-zinc-400 bg-zinc-800 text-zinc-200" },
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
  const [groupByTypeEnabled, setGroupByTypeEnabled] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, page_size: 20, section: activeSection, section_part: activePart };
      if (search) params.search = search;
      const res = await qApi.list(params);
      setData(res);
    } catch (e) { console.error(e); }
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

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    setDeletingId(id);
    try {
      await qApi.delete(id);
      load();
    } catch (e) { console.error(e); }
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
          <h1 className="text-xl font-bold text-zinc-100">Questions</h1>
          <p className="text-sm text-zinc-500">{data?.total ?? 0} questions in {sectionInfo.label} — {activePartLabel}</p>
        </div>
        <Button onClick={() => setCreatorOpen(true)}>
          <Plus className="h-4 w-4" /> Add Question
        </Button>
      </div>

      {/* Step 1 — Section */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">Step 1 — Section</p>
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
      <div className={`rounded-xl border p-4 space-y-3 transition-all ${sectionInfo.activeColor.replace("text-", "border-").split(" ")[0]} bg-zinc-900/40`}>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
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
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
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
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
            Step 3 — Questions ({data?.total ?? 0})
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGroupByTypeEnabled((v) => !v)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                groupByTypeEnabled
                  ? "border-zinc-400 bg-zinc-700 text-zinc-100"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300"
              }`}
            >
              Group by type
            </button>
            <div className="relative max-w-xs w-48">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
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
              <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
            </div>
          ) : groupByTypeEnabled && data?.items.length ? (
            <div className="divide-y divide-zinc-800">
              {groupByType(data.items).map(({ type, label, questions }) => (
                <div key={type}>
                  <div className="flex items-center gap-2 bg-zinc-900/60 px-4 py-2">
                    <span className="text-xs font-semibold text-zinc-300">{label}</span>
                    <span className="rounded border border-zinc-700 px-1.5 py-0 text-[10px] text-zinc-500">{questions.length}</span>
                  </div>
                  <Table>
                    <TableBody>
                      {questions.map((q) => (
                        <TableRow key={q.id}>
                          <TableCell className="max-w-xs font-medium text-zinc-200">{truncate(q.title)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">{q.module_type}</Badge>
                          </TableCell>
                          <TableCell className="text-zinc-500 text-xs">{new Date(q.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setViewQ(q)}><Eye className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setEditQ(q)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon"
                                className="text-red-500 hover:bg-red-950/40 hover:text-red-400"
                                onClick={() => handleDelete(q.id)} disabled={deletingId === q.id}>
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
                    <TableCell className="max-w-xs font-medium text-zinc-200">
                      {truncate(q.title)}
                    </TableCell>
                    <TableCell className="text-zinc-400 text-xs">{q.type.replace(/_/g, " ")}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{q.module_type}</Badge>
                    </TableCell>
                    <TableCell className="text-zinc-500 text-xs">
                      {new Date(q.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewQ(q)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditQ(q)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="text-red-500 hover:bg-red-950/40 hover:text-red-400"
                          onClick={() => handleDelete(q.id)}
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
                    <TableCell colSpan={5} className="h-32 text-center text-zinc-600">
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
      </div>{/* end Step 3 */}

      {/* View detail dialog */}
      <Dialog open={!!viewQ} onOpenChange={() => setViewQ(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewQ?.title}</DialogTitle>
          </DialogHeader>
          {viewQ && (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant={sectionVariant[viewQ.section] ?? "secondary"} className="capitalize">{viewQ.section}</Badge>
                <Badge variant="secondary">{viewQ.type.replace(/_/g, " ")}</Badge>
                <Badge variant="secondary" className="capitalize">{viewQ.module_type}</Badge>
              </div>
              {viewQ.instruction && (
                <div>
                  <p className="mb-1 text-xs font-medium text-zinc-500">Instruction</p>
                  <p className="text-zinc-300">{viewQ.instruction}</p>
                </div>
              )}
              {viewQ.passage && (
                <div>
                  <p className="mb-1 text-xs font-medium text-zinc-500">Passage</p>
                  <p className="max-h-40 overflow-y-auto text-zinc-400 text-xs leading-relaxed">{viewQ.passage}</p>
                </div>
              )}
              {viewQ.options && (
                <div>
                  <p className="mb-1 text-xs font-medium text-zinc-500">Options</p>
                  <div className="space-y-1">
                    {viewQ.options.map((o) => (
                      <div key={o.label} className={`flex gap-2 rounded px-2 py-1 text-xs ${o.label === viewQ.correct_option ? "bg-emerald-950/50 text-emerald-300" : "text-zinc-400"}`}>
                        <span className="font-bold">{o.label}.</span> {o.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {viewQ.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {viewQ.tags.map((t) => (
                    <span key={t} className="rounded border border-zinc-700 px-1.5 py-0.5 text-xs text-zinc-500">{t}</span>
                  ))}
                </div>
              )}
              <p className="text-xs text-zinc-600">ID: {viewQ.id}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Creator modal — pre-seeded with current section + part */}
      {creatorOpen && (
        <QuestionCreator
          initialSection={activeSection}
          initialPart={activePart}
          onClose={() => setCreatorOpen(false)}
          onCreated={() => { setCreatorOpen(false); load(); }}
        />
      )}

      {/* Editor modal */}
      {editQ && (
        <QuestionCreator
          initialData={editQ}
          onClose={() => setEditQ(null)}
          onCreated={() => { setEditQ(null); load(); }}
          onUpdated={() => { setEditQ(null); load(); }}
        />
      )}
    </div>
  );
}