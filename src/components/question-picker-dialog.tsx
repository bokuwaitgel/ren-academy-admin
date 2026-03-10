"use client";

import { useState, useEffect, useCallback } from "react";
import { questions as qApi, type Question, type Paginated } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Check } from "lucide-react";

export interface QuestionMeta {
  id: string;
  title: string;
  type: string;
  section: string;
  section_part: string;
}

const TYPE_LABELS: Record<string, string> = {
  // Listening & Reading
  multiple_choice: "MCQ",
  multiple_select: "Multi-select",
  form_completion: "Form",
  note_completion: "Note",
  table_completion: "Table",
  flow_chart_completion: "Flow chart",
  summary_completion: "Summary",
  sentence_completion: "Sentence",
  short_answer: "Short answer",
  matching: "Matching",
  matching_headings: "Headings",
  matching_information: "Match info",
  matching_features: "Match features",
  map_labelling: "Map label",
  plan_labelling: "Plan label",
  diagram_labelling: "Diagram",
  true_false_not_given: "T/F/NG",
  yes_no_not_given: "Y/N/NG",
  pick_from_list: "Pick list",
  // Writing
  graph_description: "Graph desc",
  letter_writing: "Letter",
  process_description: "Process",
  map_comparison: "Map compare",
  essay_opinion: "Opinion essay",
  essay_discussion: "Discussion",
  essay_problem_solution: "Problem-solution",
  essay_advantages: "Advantages",
  essay_mixed: "Mixed essay",
  // Speaking
  speaking_interview: "Interview",
  speaking_cue_card: "Cue card",
  speaking_discussion: "Discussion",
};

const SECTION_COLORS: Record<string, string> = {
  listening: "bg-indigo-950/60 text-indigo-300 border-indigo-800",
  reading:   "bg-emerald-950/60 text-emerald-300 border-emerald-800",
  writing:   "bg-amber-950/60 text-amber-300 border-amber-800",
  speaking:  "bg-zinc-800 text-zinc-300 border-zinc-700",
};

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

function typeLabel(t: string) {
  return TYPE_LABELS[t] ?? t.replace(/_/g, " ");
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pre-filter by section on open. "all" = no filter. */
  initialSection?: string;
  /** All question IDs already in the test — greyed out */
  selectedIds: Set<string>;
  onConfirm: (questions: QuestionMeta[]) => void;
}

export default function QuestionPickerDialog({
  open,
  onClose,
  initialSection = "all",
  selectedIds,
  onConfirm,
}: Props) {
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState(initialSection);
  const [partFilter, setPartFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Question> | null>(null);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<Map<string, QuestionMeta>>(new Map());

  useEffect(() => {
    if (open) {
      setSearch("");
      setPage(1);
      setSectionFilter(initialSection);
      setPartFilter("all");
      setPicked(new Map());
    }
  }, [open, initialSection]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, page_size: 15 };
      if (search) params.search = search;
      if (sectionFilter !== "all") params.section = sectionFilter;
      if (partFilter !== "all") params.section_part = partFilter;
      const res = await qApi.list(params);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, sectionFilter, partFilter]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const toggle = (q: Question) => {
    if (selectedIds.has(q.id)) return;
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(q.id)) next.delete(q.id);
      else next.set(q.id, {
        id: q.id,
        title: q.title,
        type: q.type,
        section: q.section,
        section_part: q.section_part,
      });
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm([...picked.values()]);
    onClose();
  };

  // Group picked items by section_part for the summary
  const pickedBySectionPart = new Map<string, number>();
  picked.forEach((q) => {
    const key = q.section_part;
    pickedBySectionPart.set(key, (pickedBySectionPart.get(key) ?? 0) + 1);
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-xl flex flex-col p-0 gap-0 max-h-[85vh]">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-zinc-800 flex-shrink-0">
          <DialogTitle>Add Questions</DialogTitle>
          <p className="text-xs text-zinc-500 mt-0.5">
            Questions are grouped into sections automatically by their type.
          </p>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-col gap-2 px-4 pt-3 pb-2 flex-shrink-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="Search by title…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 h-8 text-sm"
              />
            </div>
            <Select value={sectionFilter} onValueChange={(v) => { setSectionFilter(v); setPartFilter("all"); setPage(1); }}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sections</SelectItem>
                <SelectItem value="listening">Listening</SelectItem>
                <SelectItem value="reading">Reading</SelectItem>
                <SelectItem value="writing">Writing</SelectItem>
                <SelectItem value="speaking">Speaking</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {sectionFilter !== "all" && SECTION_PARTS[sectionFilter] && (
            <div className="flex gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => { setPartFilter("all"); setPage(1); }}
                className={`rounded border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  partFilter === "all"
                    ? "border-zinc-500 bg-zinc-700 text-zinc-200"
                    : "border-zinc-700 bg-zinc-900 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                All parts
              </button>
              {SECTION_PARTS[sectionFilter].map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => { setPartFilter(p.value); setPage(1); }}
                  className={`rounded border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                    partFilter === p.value
                      ? `${SECTION_COLORS[sectionFilter] ?? "border-zinc-500 bg-zinc-700 text-zinc-200"}`
                      : "border-zinc-700 bg-zinc-900 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected summary bar */}
        {picked.size > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pb-2 flex-shrink-0">
            {[...pickedBySectionPart.entries()].map(([part, count]) => (
              <span
                key={part}
                className={`rounded border px-2 py-0.5 text-[11px] font-medium ${
                  SECTION_COLORS[part.split("_")[0]] ?? SECTION_COLORS.speaking
                }`}
              >
                {part.replace(/_/g, " ")} · {count}q
              </span>
            ))}
          </div>
        )}

        {/* Question list */}
        <div className="flex-1 overflow-y-auto px-4 py-1 space-y-1 min-h-0">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
            </div>
          ) : (
            <>
              {data?.items.map((q) => {
                const alreadyIn = selectedIds.has(q.id);
                const isChecked = picked.has(q.id);
                const sectionColorClass = SECTION_COLORS[q.section] ?? SECTION_COLORS.speaking;
                return (
                  <button
                    key={q.id}
                    type="button"
                    disabled={alreadyIn}
                    onClick={() => toggle(q)}
                    className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${
                      alreadyIn
                        ? "border-zinc-800 bg-zinc-800/20 opacity-40 cursor-not-allowed"
                        : isChecked
                        ? "border-indigo-700 bg-indigo-950/40"
                        : "border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/60"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`mt-0.5 flex-shrink-0 h-4 w-4 rounded border flex items-center justify-center ${
                          isChecked
                            ? "border-indigo-500 bg-indigo-600"
                            : alreadyIn
                            ? "border-zinc-600 bg-zinc-700"
                            : "border-zinc-600"
                        }`}
                      >
                        {(isChecked || alreadyIn) && <Check className="h-3 w-3 text-white" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isChecked ? "text-zinc-100" : "text-zinc-300"}`}>
                          {q.title}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <span className={`rounded border px-1.5 py-0 text-[10px] font-medium ${
                            sectionColorClass
                          }`}>
                            {q.section_part.replace(/_/g, " ")}
                          </span>
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                            {typeLabel(q.type)}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] capitalize py-0 px-1.5">
                            {q.module_type}
                          </Badge>
                          {alreadyIn && (
                            <span className="text-[10px] text-zinc-500 italic">already added</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
              {!loading && !data?.items.length && (
                <div className="flex h-40 items-center justify-center text-sm text-zinc-600">
                  No questions found
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ‹
            </Button>
            <span className="text-xs text-zinc-500 w-16 text-center">
              {data?.page ?? 1} / {data?.total_pages ?? 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              disabled={!data || page >= data.total_pages}
              onClick={() => setPage((p) => p + 1)}
            >
              ›
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {picked.size > 0 && (
              <span className="text-xs text-zinc-400">
                {picked.size} selected
              </span>
            )}
            <Button onClick={handleConfirm} disabled={picked.size === 0} size="sm">
              Add {picked.size > 0 ? picked.size : ""} Question{picked.size !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
