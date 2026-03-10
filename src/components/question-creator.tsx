"use client";

import { useState, useCallback } from "react";
import { questions as qApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Plus,
  Trash2,
  Check,
  X,
  BookOpen,
  Headphones,
  PenTool,
  Mic,
  FileText,
  ListChecks,
  CheckSquare,
  AlignLeft,
  Table,
  GitBranch,
  Map,
  ArrowLeftRight,
  ToggleLeft,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────

const SECTIONS = [
  { value: "listening", label: "Listening", icon: Headphones, color: "bg-blue-500" },
  { value: "reading", label: "Reading", icon: BookOpen, color: "bg-green-500" },
  { value: "writing", label: "Writing", icon: PenTool, color: "bg-amber-500" },
  { value: "speaking", label: "Speaking", icon: Mic, color: "bg-purple-500" },
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

interface QuestionTypeInfo {
  value: string;
  label: string;
  description: string;
  icon: React.ElementType;
  sections: string[];
}

const QUESTION_TYPES: QuestionTypeInfo[] = [
  { value: "multiple_choice", label: "Multiple Choice", description: "Choose one correct answer from A, B, C", icon: ListChecks, sections: ["listening", "reading"] },
  { value: "multiple_select", label: "Multiple Select", description: "Choose TWO or more correct answers (e.g. Q19 & 20: pick 2 from A–E)", icon: CheckSquare, sections: ["listening", "reading"] },
  { value: "form_completion", label: "Form Completion", description: "Fill in blanks in a form", icon: FileText, sections: ["listening"] },
  { value: "note_completion", label: "Note Completion", description: "Complete notes with missing words", icon: AlignLeft, sections: ["listening", "reading"] },
  { value: "table_completion", label: "Table Completion", description: "Fill in blanks in a table", icon: Table, sections: ["listening", "reading"] },
  { value: "flow_chart_completion", label: "Flow Chart Completion", description: "Complete a flow chart", icon: GitBranch, sections: ["listening", "reading"] },
  { value: "summary_completion", label: "Summary Completion", description: "Complete a summary passage", icon: AlignLeft, sections: ["listening", "reading"] },
  { value: "sentence_completion", label: "Sentence Completion", description: "Complete sentences with missing words", icon: AlignLeft, sections: ["listening", "reading"] },
  { value: "short_answer", label: "Short Answer", description: "Write a short answer", icon: PenTool, sections: ["listening", "reading"] },
  { value: "matching", label: "Matching", description: "Match items to categories", icon: ArrowLeftRight, sections: ["listening", "reading"] },
  { value: "matching_features", label: "Matching Features", description: "Match features to options", icon: ArrowLeftRight, sections: ["reading"] },
  { value: "matching_headings", label: "Matching Headings", description: "Match headings to paragraphs", icon: ArrowLeftRight, sections: ["reading"] },
  { value: "map_labelling", label: "Map Labelling", description: "Label locations on a map", icon: Map, sections: ["listening"] },
  { value: "plan_labelling", label: "Plan Labelling", description: "Label a plan or diagram", icon: Map, sections: ["listening", "reading"] },
  { value: "diagram_labelling", label: "Diagram Labelling", description: "Label a diagram", icon: Map, sections: ["listening", "reading"] },
  { value: "true_false_not_given", label: "True / False / Not Given", description: "Decide if statements are true, false, or not given", icon: ToggleLeft, sections: ["reading"] },
  { value: "yes_no_not_given", label: "Yes / No / Not Given", description: "Decide if statements agree with writer's views", icon: ToggleLeft, sections: ["reading"] },
  { value: "pick_from_list", label: "Pick from List", description: "Select answers from a list", icon: ListChecks, sections: ["reading"] },
];

// ─── Types ───────────────────────────────────────────────────

interface AnswerOption {
  label: string;
  text: string;
}

interface QuestionFormData {
  title: string;
  section: string;
  section_part: string;
  test_type: string;
  module_type: string;
  type: string;
  instruction: string;
  context: string;
  passage: string;
  audio_url: string;
  image_url: string;
  tags: string;
  // MCQ
  options: AnswerOption[];
  correct_option: string;
  // Multi-select
  correct_options: string[];
  num_correct: number;
  // Note/Sentence completion
  sentences: { before: string; after: string; answer: string }[];
  // Form completion
  form_fields: { label: string; prefix: string; answer: string }[];
  // Table completion
  table_cells: { row_header: string; col_header: string; answer: string }[];
  // Flow chart
  flow_steps: { step_number: number; description: string; answer: string; is_blank: boolean }[];
  // Summary
  summary_items: { before: string; after: string; answer: string; word_options: string }[];
  // Short answer
  short_items: { question: string; answer: string }[];
  // Map/Plan/Diagram
  map_slots: { slot_label: string; position: string; answer: string }[];
  map_word_box: string[];
  // Matching
  matching_items: { item: string; answer: string }[];
  // Headings
  heading_options: AnswerOption[];
  heading_items: { paragraph_label: string; answer: string }[];
  // TFNG
  tfng_items: { statement: string; answer: string }[];
  // Pick from list
  pick_items: { question: string; answers: string[] }[];
}

const defaultForm: QuestionFormData = {
  title: "",
  section: "",
  section_part: "",
  test_type: "ielts",
  module_type: "academic",
  type: "",
  instruction: "",
  context: "",
  passage: "",
  audio_url: "",
  image_url: "",
  tags: "",
  options: [
    { label: "A", text: "" },
    { label: "B", text: "" },
    { label: "C", text: "" },
  ],
  correct_option: "",
  correct_options: [],
  num_correct: 2,
  sentences: [{ before: "", after: "", answer: "" }],
  form_fields: [{ label: "", prefix: "", answer: "" }],
  table_cells: [{ row_header: "", col_header: "", answer: "" }],
  flow_steps: [{ step_number: 1, description: "", answer: "", is_blank: true }],
  summary_items: [{ before: "", after: "", answer: "", word_options: "" }],
  short_items: [{ question: "", answer: "" }],
  map_slots: [{ slot_label: "1", position: "", answer: "" }],
  map_word_box: [],
  matching_items: [{ item: "", answer: "" }],
  heading_options: [{ label: "i", text: "" }],
  heading_items: [{ paragraph_label: "Paragraph A", answer: "" }],
  tfng_items: [{ statement: "", answer: "TRUE" }],
  pick_items: [{ question: "", answers: [] }],
};

const STEPS = [
  { id: 1, title: "Section", description: "Choose section & part" },
  { id: 2, title: "Question Type", description: "Select question format" },
  { id: 3, title: "Content", description: "Add question content" },
  { id: 4, title: "Answers", description: "Configure answers" },
  { id: 5, title: "Review", description: "Review & create" },
];

// ─── Component ───────────────────────────────────────────────

interface QuestionCreatorProps {
  onClose: () => void;
  onCreated: () => void;
}

export default function QuestionCreator({ onClose, onCreated }: QuestionCreatorProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<QuestionFormData>({ ...defaultForm });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const updateForm = useCallback((updates: Partial<QuestionFormData>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  }, []);

  const canProceed = (): boolean => {
    switch (step) {
      case 1: return !!form.section && !!form.section_part;
      case 2: return !!form.type;
      case 3: return form.title.length >= 3 && form.instruction.length >= 3;
      case 4: return validateAnswers();
      default: return true;
    }
  };

  const validateAnswers = (): boolean => {
    const t = form.type;
    if (t === "multiple_choice") {
      return form.options.length >= 2 && form.options.every((o) => o.text.trim()) && !!form.correct_option;
    }
    if (t === "multiple_select") {
      return form.options.length >= 3 && form.options.every((o) => o.text.trim()) && form.correct_options.length >= 2;
    }
    if (t === "note_completion" || t === "sentence_completion") {
      return form.sentences.length >= 1 && form.sentences.every((s) => s.answer.trim());
    }
    if (t === "form_completion") {
      return form.form_fields.length >= 1 && form.form_fields.every((f) => f.label.trim() && f.answer.trim());
    }
    if (t === "table_completion") {
      return form.table_cells.length >= 1 && form.table_cells.every((c) => c.answer.trim());
    }
    if (t === "flow_chart_completion") {
      return form.flow_steps.length >= 1 && form.flow_steps.some((s) => s.is_blank && s.answer?.trim());
    }
    if (t === "summary_completion") {
      return form.summary_items.length >= 1 && form.summary_items.every((s) => s.answer.trim());
    }
    if (t === "short_answer") {
      return form.short_items.length >= 1 && form.short_items.every((s) => s.question.trim() && s.answer.trim());
    }
    if (["map_labelling", "plan_labelling", "diagram_labelling"].includes(t)) {
      return form.map_slots.length >= 1 && form.map_slots.every((s) => s.answer.trim());
    }
    if (t === "matching" || t === "matching_features") {
      return form.matching_items.length >= 1 && form.matching_items.every((m) => m.item.trim() && m.answer.trim());
    }
    if (t === "matching_headings") {
      return form.heading_items.length >= 1 && form.heading_items.every((h) => h.answer.trim());
    }
    if (t === "true_false_not_given" || t === "yes_no_not_given") {
      return form.tfng_items.length >= 1 && form.tfng_items.every((i) => i.statement.trim() && i.answer);
    }
    if (t === "pick_from_list") {
      return form.pick_items.length >= 1 && form.pick_items.every((p) => p.question.trim() && p.answers.length > 0);
    }
    return true;
  };

  const buildPayload = () => {
    const base: Record<string, unknown> = {
      title: form.title,
      section: form.section,
      section_part: form.section_part,
      test_type: form.test_type,
      module_type: form.module_type,
      type: form.type,
      instruction: form.instruction,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    if (form.context.trim()) base.context = form.context;
    if (form.passage.trim()) base.passage = form.passage;
    if (form.audio_url.trim()) base.audio_url = form.audio_url;
    if (form.image_url.trim()) base.image_url = form.image_url;

    const t = form.type;
    if (t === "multiple_choice") {
      base.options = form.options;
      base.correct_option = form.correct_option;
    }
    if (t === "multiple_select") {
      base.options = form.options;
      base.correct_options = form.correct_options;
    }
    if (t === "note_completion" || t === "sentence_completion") {
      base.sentences = form.sentences;
    }
    if (t === "form_completion") {
      base.form_fields = form.form_fields;
    }
    if (t === "table_completion") {
      base.table_cells = form.table_cells;
    }
    if (t === "flow_chart_completion") {
      base.flow_steps = form.flow_steps;
    }
    if (t === "summary_completion") {
      base.summary_items = form.summary_items.map((s) => ({
        ...s,
        word_options: s.word_options ? s.word_options.split(",").map((w) => w.trim()).filter(Boolean) : undefined,
      }));
    }
    if (t === "short_answer") {
      base.short_items = form.short_items;
    }
    if (["map_labelling", "plan_labelling", "diagram_labelling"].includes(t)) {
      base.map_slots = form.map_slots;
      if (form.map_word_box.length > 0) base.map_word_box = form.map_word_box;
    }
    if (t === "matching" || t === "matching_features") {
      base.matching_items = form.matching_items;
      if (form.options.some((o) => o.text.trim())) base.options = form.options;
    }
    if (t === "matching_headings") {
      base.heading_items = form.heading_items;
      if (form.heading_options.some((o) => o.text.trim())) base.heading_options = form.heading_options;
    }
    if (t === "true_false_not_given" || t === "yes_no_not_given") {
      base.tfng_items = form.tfng_items;
    }
    if (t === "pick_from_list") {
      base.pick_items = form.pick_items;
    }
    return base;
  };

  const handleCreate = async () => {
    setError("");
    setCreating(true);
    try {
      await qApi.create(buildPayload());
      onCreated();
    } catch (err: unknown) {
      const e = err as { detail?: string | object };
      if (typeof e?.detail === "string") setError(e.detail);
      else if (e?.detail) setError(JSON.stringify(e.detail));
      else setError("Failed to create question");
    } finally {
      setCreating(false);
    }
  };

  // ─── Step renderers ─────────────────────────────────────

  const renderStepIndicator = () => (
    <div className="flex items-center gap-1 mb-6">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center">
          <button
            onClick={() => { if (s.id < step) setStep(s.id); }}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
              s.id === step
                ? "bg-zinc-900 text-white shadow-sm"
                : s.id < step
                ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 cursor-pointer"
                : "bg-zinc-50 text-zinc-400"
            }`}
          >
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
              s.id < step ? "bg-green-500 text-white" : s.id === step ? "bg-white text-zinc-900" : "bg-zinc-200 text-zinc-400"
            }`}>
              {s.id < step ? <Check className="h-3 w-3" /> : s.id}
            </span>
            <span className="hidden sm:inline">{s.title}</span>
          </button>
          {i < STEPS.length - 1 && (
            <div className={`mx-1 h-px w-4 ${s.id < step ? "bg-green-400" : "bg-zinc-200"}`} />
          )}
        </div>
      ))}
    </div>
  );

  // ── Step 1: Section ─────────────────────────────────────

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-zinc-900 mb-1">Choose Section</h3>
        <p className="text-sm text-zinc-500">Select which IELTS section this question belongs to</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const selected = form.section === s.value;
          return (
            <button
              key={s.value}
              onClick={() => {
                const parts = SECTION_PARTS[s.value];
                updateForm({
                  section: s.value,
                  section_part: parts?.[0]?.value || "",
                  type: "",
                });
              }}
              className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                selected
                  ? "border-zinc-900 bg-zinc-50 shadow-sm"
                  : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.color} text-white`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-zinc-900">{s.label}</div>
                <div className="text-xs text-zinc-500">
                  {(SECTION_PARTS[s.value] || []).length} parts
                </div>
              </div>
              {selected && (
                <Check className="ml-auto h-5 w-5 text-zinc-900" />
              )}
            </button>
          );
        })}
      </div>

      {form.section && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-zinc-700">Section Part</h4>
          <div className="flex flex-wrap gap-2">
            {(SECTION_PARTS[form.section] || []).map((part) => (
              <button
                key={part.value}
                onClick={() => updateForm({ section_part: part.value })}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                  form.section_part === part.value
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 text-zinc-600 hover:border-zinc-400"
                }`}
              >
                {part.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500">Module Type</label>
              <Select value={form.module_type} onValueChange={(v) => updateForm({ module_type: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="general">General Training</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500">Test Type</label>
              <Select value={form.test_type} onValueChange={(v) => updateForm({ test_type: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ielts">IELTS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Step 2: Question Type ───────────────────────────────

  const renderStep2 = () => {
    const filteredTypes = QUESTION_TYPES.filter((qt) => qt.sections.includes(form.section));
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 mb-1">Question Type</h3>
          <p className="text-sm text-zinc-500">Choose the format for this question</p>
        </div>
        <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-1">
          {filteredTypes.map((qt) => {
            const Icon = qt.icon;
            const selected = form.type === qt.value;
            return (
              <button
                key={qt.value}
                onClick={() => updateForm({ type: qt.value })}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                  selected
                    ? "border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900"
                    : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-md ${
                  selected ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500"
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-zinc-900">{qt.label}</div>
                  <div className="text-xs text-zinc-500 truncate">{qt.description}</div>
                </div>
                {selected && <Check className="h-4 w-4 text-zinc-900 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Step 3: Content ─────────────────────────────────────

  const renderStep3 = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-zinc-900 mb-1">Question Content</h3>
        <p className="text-sm text-zinc-500">Add the question text and context</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Title *</label>
        <Input
          value={form.title}
          onChange={(e) => updateForm({ title: e.target.value })}
          placeholder="e.g. Q15-16 – TWO features of the accommodation"
          className="font-medium"
        />
        <p className="text-[11px] text-zinc-400">Descriptive title for admin reference</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Instruction *</label>
        <textarea
          className="flex w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 min-h-[80px] resize-y"
          value={form.instruction}
          onChange={(e) => updateForm({ instruction: e.target.value })}
          placeholder={form.type === "multiple_select"
            ? "e.g. Choose TWO letters, A–E."
            : "e.g. Choose the correct letter, A, B or C."
          }
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Context</label>
        <textarea
          className="flex w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 min-h-[60px] resize-y"
          value={form.context}
          onChange={(e) => updateForm({ context: e.target.value })}
          placeholder="e.g. You hear two people discussing a day trip..."
        />
      </div>

      {form.section === "reading" && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Passage</label>
          <textarea
            className="flex w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 min-h-[120px] resize-y font-mono text-xs"
            value={form.passage}
            onChange={(e) => updateForm({ passage: e.target.value })}
            placeholder="Paste the reading passage text here..."
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {form.section === "listening" && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Audio URL</label>
            <Input
              value={form.audio_url}
              onChange={(e) => updateForm({ audio_url: e.target.value })}
              placeholder="https://..."
            />
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Image URL</label>
          <Input
            value={form.image_url}
            onChange={(e) => updateForm({ image_url: e.target.value })}
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Tags</label>
        <Input
          value={form.tags}
          onChange={(e) => updateForm({ tags: e.target.value })}
          placeholder="listening, part2, cambridge"
        />
        <p className="text-[11px] text-zinc-400">Comma-separated tags for filtering</p>
      </div>
    </div>
  );

  // ── Step 4: Answers ─────────────────────────────────────

  const renderStep4 = () => {
    const t = form.type;

    // ── Multiple Choice ─────────────────────────────────
    if (t === "multiple_choice") {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-1">Answer Options</h3>
            <p className="text-sm text-zinc-500">Add options and select the correct one</p>
          </div>
          <div className="space-y-2">
            {form.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  onClick={() => updateForm({ correct_option: opt.label })}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
                    form.correct_option === opt.label
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-zinc-300 text-zinc-400 hover:border-zinc-400"
                  }`}
                >
                  {opt.label}
                </button>
                <Input
                  className="flex-1"
                  value={opt.text}
                  onChange={(e) => {
                    const newOpts = [...form.options];
                    newOpts[i] = { ...newOpts[i], text: e.target.value };
                    updateForm({ options: newOpts });
                  }}
                  placeholder={`Option ${opt.label}...`}
                />
                {form.options.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => {
                      const newOpts = form.options.filter((_, j) => j !== i);
                      updateForm({
                        options: newOpts,
                        correct_option: form.correct_option === opt.label ? "" : form.correct_option,
                      });
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-zinc-400" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const nextLabel = String.fromCharCode(65 + form.options.length);
              updateForm({ options: [...form.options, { label: nextLabel, text: "" }] });
            }}
            disabled={form.options.length >= 6}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Option
          </Button>
          {form.correct_option && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3">
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">
                Correct answer: <strong>{form.correct_option}</strong>
              </span>
            </div>
          )}
        </div>
      );
    }

    // ── Multiple Select ─────────────────────────────────
    if (t === "multiple_select") {
      return (
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-1">Multiple Select Options</h3>
            <p className="text-sm text-zinc-500">
              Add options (A–E typically) and select the correct answers.
              <br />
              <span className="text-zinc-400">e.g. Questions 19 &amp; 20: Choose TWO correct letters</span>
            </p>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-blue-800 whitespace-nowrap">
                Number of correct answers:
              </label>
              <Select
                value={String(form.num_correct)}
                onValueChange={(v) => {
                  const n = parseInt(v);
                  updateForm({
                    num_correct: n,
                    correct_options: form.correct_options.slice(0, n),
                  });
                }}
              >
                <SelectTrigger className="w-20 h-8 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-blue-600">
                (select {form.num_correct} from the options below)
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {form.options.map((opt, i) => {
              const isCorrect = form.correct_options.includes(opt.label);
              return (
                <div key={i} className={`flex items-center gap-2 rounded-lg p-2 transition-all ${
                  isCorrect ? "bg-green-50 ring-1 ring-green-300" : ""
                }`}>
                  <button
                    onClick={() => {
                      let newCorrect: string[];
                      if (isCorrect) {
                        newCorrect = form.correct_options.filter((l) => l !== opt.label);
                      } else {
                        if (form.correct_options.length >= form.num_correct) {
                          newCorrect = [...form.correct_options.slice(1), opt.label];
                        } else {
                          newCorrect = [...form.correct_options, opt.label];
                        }
                      }
                      updateForm({ correct_options: newCorrect });
                    }}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-bold transition-all ${
                      isCorrect
                        ? "border-green-500 bg-green-500 text-white shadow-sm"
                        : "border-zinc-300 text-zinc-400 hover:border-zinc-400 hover:bg-zinc-50"
                    }`}
                  >
                    {isCorrect ? <Check className="h-4 w-4" /> : opt.label}
                  </button>
                  <span className="text-sm font-medium text-zinc-600 w-6">{opt.label}</span>
                  <Input
                    className="flex-1"
                    value={opt.text}
                    onChange={(e) => {
                      const newOpts = [...form.options];
                      newOpts[i] = { ...newOpts[i], text: e.target.value };
                      updateForm({ options: newOpts });
                    }}
                    placeholder={`Option ${opt.label}...`}
                  />
                  {form.options.length > 3 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => {
                        const newOpts = form.options.filter((_, j) => j !== i);
                        updateForm({
                          options: newOpts,
                          correct_options: form.correct_options.filter((l) => l !== opt.label),
                        });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-zinc-400" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const nextLabel = String.fromCharCode(65 + form.options.length);
              updateForm({ options: [...form.options, { label: nextLabel, text: "" }] });
            }}
            disabled={form.options.length >= 8}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Option
          </Button>

          {form.correct_options.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3">
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">
                Correct answers:{" "}
                <strong>{form.correct_options.sort().join(", ")}</strong>
                {form.correct_options.length < form.num_correct && (
                  <span className="text-amber-600 ml-2">
                    (select {form.num_correct - form.correct_options.length} more)
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      );
    }

    // ── Note / Sentence Completion ──────────────────────
    if (t === "note_completion" || t === "sentence_completion") {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-1">
              {t === "note_completion" ? "Note" : "Sentence"} Items
            </h3>
            <p className="text-sm text-zinc-500">Add the text before/after the blank and the correct answer</p>
          </div>
          {form.sentences.map((s, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">Item {i + 1}</Badge>
                  {form.sentences.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                      updateForm({ sentences: form.sentences.filter((_, j) => j !== i) });
                    }}>
                      <Trash2 className="h-3 w-3 text-zinc-400" />
                    </Button>
                  )}
                </div>
                <Input
                  placeholder="Text before the blank..."
                  value={s.before}
                  onChange={(e) => {
                    const newS = [...form.sentences];
                    newS[i] = { ...newS[i], before: e.target.value };
                    updateForm({ sentences: newS });
                  }}
                />
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-md bg-amber-50 border border-amber-200 px-3 py-1.5">
                    <Input
                      className="border-0 bg-transparent p-0 h-auto text-amber-800 font-semibold focus-visible:ring-0"
                      placeholder="Answer..."
                      value={s.answer}
                      onChange={(e) => {
                        const newS = [...form.sentences];
                        newS[i] = { ...newS[i], answer: e.target.value };
                        updateForm({ sentences: newS });
                      }}
                    />
                  </div>
                </div>
                <Input
                  placeholder="Text after the blank..."
                  value={s.after}
                  onChange={(e) => {
                    const newS = [...form.sentences];
                    newS[i] = { ...newS[i], after: e.target.value };
                    updateForm({ sentences: newS });
                  }}
                />
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" size="sm" onClick={() => {
            updateForm({ sentences: [...form.sentences, { before: "", after: "", answer: "" }] });
          }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
          </Button>
        </div>
      );
    }

    // ── Form Completion ─────────────────────────────────
    if (t === "form_completion") {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-1">Form Fields</h3>
            <p className="text-sm text-zinc-500">Add form fields with labels and answers</p>
          </div>
          {form.form_fields.map((f, i) => (
            <div key={i} className="flex items-end gap-2 rounded-lg border border-zinc-200 p-3">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-medium text-zinc-400 uppercase">Label</label>
                <Input placeholder="Full name" value={f.label} onChange={(e) => {
                  const nf = [...form.form_fields]; nf[i] = { ...nf[i], label: e.target.value };
                  updateForm({ form_fields: nf });
                }} />
              </div>
              <div className="w-16 space-y-1">
                <label className="text-[10px] font-medium text-zinc-400 uppercase">Prefix</label>
                <Input placeholder="£" value={f.prefix} onChange={(e) => {
                  const nf = [...form.form_fields]; nf[i] = { ...nf[i], prefix: e.target.value };
                  updateForm({ form_fields: nf });
                }} />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-medium text-zinc-400 uppercase">Answer</label>
                <div className="rounded-md bg-amber-50 border border-amber-200 px-2">
                  <Input
                    className="border-0 bg-transparent p-0 h-9 text-amber-800 font-semibold focus-visible:ring-0"
                    placeholder="Johnson"
                    value={f.answer}
                    onChange={(e) => {
                      const nf = [...form.form_fields]; nf[i] = { ...nf[i], answer: e.target.value };
                      updateForm({ form_fields: nf });
                    }}
                  />
                </div>
              </div>
              {form.form_fields.length > 1 && (
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => {
                  updateForm({ form_fields: form.form_fields.filter((_, j) => j !== i) });
                }}>
                  <Trash2 className="h-3.5 w-3.5 text-zinc-400" />
                </Button>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => {
            updateForm({ form_fields: [...form.form_fields, { label: "", prefix: "", answer: "" }] });
          }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Field
          </Button>
        </div>
      );
    }

    // ── Short Answer ────────────────────────────────────
    if (t === "short_answer") {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-1">Short Answer Items</h3>
            <p className="text-sm text-zinc-500">Add questions with short answers</p>
          </div>
          {form.short_items.map((s, i) => (
            <div key={i} className="rounded-lg border border-zinc-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">Q{i + 1}</Badge>
                {form.short_items.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                    updateForm({ short_items: form.short_items.filter((_, j) => j !== i) });
                  }}>
                    <Trash2 className="h-3 w-3 text-zinc-400" />
                  </Button>
                )}
              </div>
              <Input placeholder="Question..." value={s.question} onChange={(e) => {
                const ns = [...form.short_items]; ns[i] = { ...ns[i], question: e.target.value };
                updateForm({ short_items: ns });
              }} />
              <div className="rounded-md bg-amber-50 border border-amber-200 px-2">
                <Input
                  className="border-0 bg-transparent p-0 h-9 text-amber-800 font-semibold focus-visible:ring-0"
                  placeholder="Answer..."
                  value={s.answer}
                  onChange={(e) => {
                    const ns = [...form.short_items]; ns[i] = { ...ns[i], answer: e.target.value };
                    updateForm({ short_items: ns });
                  }}
                />
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => {
            updateForm({ short_items: [...form.short_items, { question: "", answer: "" }] });
          }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
          </Button>
        </div>
      );
    }

    // ── TFNG / YNNG ─────────────────────────────────────
    if (t === "true_false_not_given" || t === "yes_no_not_given") {
      const isYN = t === "yes_no_not_given";
      const answerOptions = isYN ? ["YES", "NO", "NOT GIVEN"] : ["TRUE", "FALSE", "NOT GIVEN"];
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-1">
              {isYN ? "Yes / No / Not Given" : "True / False / Not Given"} Statements
            </h3>
            <p className="text-sm text-zinc-500">Add statements and mark each as {answerOptions.join(" / ")}</p>
          </div>
          {form.tfng_items.map((item, i) => (
            <div key={i} className="rounded-lg border border-zinc-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">Statement {i + 1}</Badge>
                {form.tfng_items.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                    updateForm({ tfng_items: form.tfng_items.filter((_, j) => j !== i) });
                  }}>
                    <Trash2 className="h-3 w-3 text-zinc-400" />
                  </Button>
                )}
              </div>
              <textarea
                className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm min-h-[60px] resize-y focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400"
                placeholder="Statement..."
                value={item.statement}
                onChange={(e) => {
                  const ni = [...form.tfng_items]; ni[i] = { ...ni[i], statement: e.target.value };
                  updateForm({ tfng_items: ni });
                }}
              />
              <div className="flex gap-2">
                {answerOptions.map((ans) => (
                  <button
                    key={ans}
                    onClick={() => {
                      const ni = [...form.tfng_items]; ni[i] = { ...ni[i], answer: ans };
                      updateForm({ tfng_items: ni });
                    }}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                      item.answer === ans
                        ? ans === "NOT GIVEN"
                          ? "bg-zinc-700 text-white"
                          : ans === "TRUE" || ans === "YES"
                          ? "bg-green-500 text-white"
                          : "bg-red-500 text-white"
                        : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                    }`}
                  >
                    {ans}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => {
            updateForm({ tfng_items: [...form.tfng_items, { statement: "", answer: answerOptions[0] }] });
          }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Statement
          </Button>
        </div>
      );
    }

    // ── Matching ────────────────────────────────────────
    if (t === "matching" || t === "matching_features") {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-1">Matching Items</h3>
            <p className="text-sm text-zinc-500">Add items and their matching answers</p>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Answer Options</h4>
            {form.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm font-bold text-zinc-400 w-6">{opt.label}</span>
                <Input className="flex-1" value={opt.text} placeholder={`Option ${opt.label}...`}
                  onChange={(e) => {
                    const no = [...form.options]; no[i] = { ...no[i], text: e.target.value };
                    updateForm({ options: no });
                  }}
                />
                {form.options.length > 2 && (
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() => {
                    updateForm({ options: form.options.filter((_, j) => j !== i) });
                  }}>
                    <Trash2 className="h-3.5 w-3.5 text-zinc-400" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => {
              const nl = String.fromCharCode(65 + form.options.length);
              updateForm({ options: [...form.options, { label: nl, text: "" }] });
            }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Option
            </Button>
          </div>
          <div className="border-t pt-3 space-y-3">
            <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Items to Match</h4>
            {form.matching_items.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-500 w-6">{i + 1}.</span>
                <Input className="flex-1" placeholder="Item..." value={m.item} onChange={(e) => {
                  const nm = [...form.matching_items]; nm[i] = { ...nm[i], item: e.target.value };
                  updateForm({ matching_items: nm });
                }} />
                <Select value={m.answer} onValueChange={(v) => {
                  const nm = [...form.matching_items]; nm[i] = { ...nm[i], answer: v };
                  updateForm({ matching_items: nm });
                }}>
                  <SelectTrigger className="w-20"><SelectValue placeholder="?" /></SelectTrigger>
                  <SelectContent>
                    {form.options.map((o) => (
                      <SelectItem key={o.label} value={o.label}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.matching_items.length > 1 && (
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() => {
                    updateForm({ matching_items: form.matching_items.filter((_, j) => j !== i) });
                  }}>
                    <Trash2 className="h-3.5 w-3.5 text-zinc-400" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => {
              updateForm({ matching_items: [...form.matching_items, { item: "", answer: "" }] });
            }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
            </Button>
          </div>
        </div>
      );
    }

    // ── Matching Headings ───────────────────────────────
    if (t === "matching_headings") {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-1">Matching Headings</h3>
            <p className="text-sm text-zinc-500">Add heading options and then match paragraphs</p>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Heading Options (i, ii, iii...)</h4>
            {form.heading_options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm font-bold text-zinc-400 w-8">{opt.label}</span>
                <Input className="flex-1" value={opt.text} placeholder="Heading text..."
                  onChange={(e) => {
                    const no = [...form.heading_options]; no[i] = { ...no[i], text: e.target.value };
                    updateForm({ heading_options: no });
                  }}
                />
                {form.heading_options.length > 1 && (
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() => {
                    updateForm({ heading_options: form.heading_options.filter((_, j) => j !== i) });
                  }}>
                    <Trash2 className="h-3.5 w-3.5 text-zinc-400" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => {
              const roman = ["i","ii","iii","iv","v","vi","vii","viii","ix","x"];
              const nl = roman[form.heading_options.length] || String(form.heading_options.length + 1);
              updateForm({ heading_options: [...form.heading_options, { label: nl, text: "" }] });
            }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Heading
            </Button>
          </div>
          <div className="border-t pt-3 space-y-3">
            <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Paragraphs</h4>
            {form.heading_items.map((h, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input className="flex-1" placeholder="Paragraph A" value={h.paragraph_label} onChange={(e) => {
                  const nh = [...form.heading_items]; nh[i] = { ...nh[i], paragraph_label: e.target.value };
                  updateForm({ heading_items: nh });
                }} />
                <Select value={h.answer} onValueChange={(v) => {
                  const nh = [...form.heading_items]; nh[i] = { ...nh[i], answer: v };
                  updateForm({ heading_items: nh });
                }}>
                  <SelectTrigger className="w-20"><SelectValue placeholder="?" /></SelectTrigger>
                  <SelectContent>
                    {form.heading_options.map((o) => (
                      <SelectItem key={o.label} value={o.label}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.heading_items.length > 1 && (
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() => {
                    updateForm({ heading_items: form.heading_items.filter((_, j) => j !== i) });
                  }}>
                    <Trash2 className="h-3.5 w-3.5 text-zinc-400" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => {
              const next = String.fromCharCode(65 + form.heading_items.length);
              updateForm({ heading_items: [...form.heading_items, { paragraph_label: `Paragraph ${next}`, answer: "" }] });
            }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Paragraph
            </Button>
          </div>
        </div>
      );
    }

    // ── Table Completion ────────────────────────────────
    if (t === "table_completion") {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-1">Table Cells</h3>
            <p className="text-sm text-zinc-500">Add table cells with row/column headers and answers</p>
          </div>
          {form.table_cells.map((c, i) => (
            <div key={i} className="rounded-lg border border-zinc-200 p-3 grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-zinc-400 uppercase">Row Header</label>
                <Input placeholder="Monday" value={c.row_header} onChange={(e) => {
                  const nc = [...form.table_cells]; nc[i] = { ...nc[i], row_header: e.target.value };
                  updateForm({ table_cells: nc });
                }} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-zinc-400 uppercase">Col Header</label>
                <Input placeholder="Time" value={c.col_header} onChange={(e) => {
                  const nc = [...form.table_cells]; nc[i] = { ...nc[i], col_header: e.target.value };
                  updateForm({ table_cells: nc });
                }} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-zinc-400 uppercase">Answer</label>
                <div className="rounded-md bg-amber-50 border border-amber-200 px-2">
                  <Input className="border-0 bg-transparent p-0 h-9 text-amber-800 font-semibold focus-visible:ring-0" placeholder="9:00 AM"
                    value={c.answer} onChange={(e) => {
                      const nc = [...form.table_cells]; nc[i] = { ...nc[i], answer: e.target.value };
                      updateForm({ table_cells: nc });
                    }} />
                </div>
              </div>
              {form.table_cells.length > 1 && (
                <div className="col-span-3 flex justify-end">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                    updateForm({ table_cells: form.table_cells.filter((_, j) => j !== i) });
                  }}>
                    <Trash2 className="h-3 w-3 text-zinc-400" />
                  </Button>
                </div>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => {
            updateForm({ table_cells: [...form.table_cells, { row_header: "", col_header: "", answer: "" }] });
          }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Cell
          </Button>
        </div>
      );
    }

    // ── Summary Completion ──────────────────────────────
    if (t === "summary_completion") {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-1">Summary Items</h3>
            <p className="text-sm text-zinc-500">Add summary blanks with optional word bank</p>
          </div>
          {form.summary_items.map((s, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">Blank {i + 1}</Badge>
                  {form.summary_items.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                      updateForm({ summary_items: form.summary_items.filter((_, j) => j !== i) });
                    }}>
                      <Trash2 className="h-3 w-3 text-zinc-400" />
                    </Button>
                  )}
                </div>
                <Input placeholder="Text before..." value={s.before} onChange={(e) => {
                  const ns = [...form.summary_items]; ns[i] = { ...ns[i], before: e.target.value };
                  updateForm({ summary_items: ns });
                }} />
                <div className="rounded-md bg-amber-50 border border-amber-200 px-2">
                  <Input className="border-0 bg-transparent p-0 h-9 text-amber-800 font-semibold focus-visible:ring-0"
                    placeholder="Answer..." value={s.answer} onChange={(e) => {
                      const ns = [...form.summary_items]; ns[i] = { ...ns[i], answer: e.target.value };
                      updateForm({ summary_items: ns });
                    }} />
                </div>
                <Input placeholder="Text after..." value={s.after} onChange={(e) => {
                  const ns = [...form.summary_items]; ns[i] = { ...ns[i], after: e.target.value };
                  updateForm({ summary_items: ns });
                }} />
                <Input placeholder="Word options (comma-separated, optional)" value={s.word_options} onChange={(e) => {
                  const ns = [...form.summary_items]; ns[i] = { ...ns[i], word_options: e.target.value };
                  updateForm({ summary_items: ns });
                }} />
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" size="sm" onClick={() => {
            updateForm({ summary_items: [...form.summary_items, { before: "", after: "", answer: "", word_options: "" }] });
          }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
          </Button>
        </div>
      );
    }

    // ── Map / Plan / Diagram ────────────────────────────
    if (["map_labelling", "plan_labelling", "diagram_labelling"].includes(t)) {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-1">Map/Label Slots</h3>
            <p className="text-sm text-zinc-500">Add numbered slots with positions and answers</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Word Box (optional, comma-separated)</label>
            <Input
              value={form.map_word_box.join(", ")}
              onChange={(e) => updateForm({ map_word_box: e.target.value.split(",").map((w) => w.trim()).filter(Boolean) })}
              placeholder="library, cafeteria, gym, lecture hall"
            />
          </div>
          {form.map_slots.map((s, i) => (
            <div key={i} className="rounded-lg border border-zinc-200 p-3 grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-zinc-400 uppercase">Label</label>
                <Input value={s.slot_label} onChange={(e) => {
                  const ns = [...form.map_slots]; ns[i] = { ...ns[i], slot_label: e.target.value };
                  updateForm({ map_slots: ns });
                }} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-zinc-400 uppercase">Position</label>
                <Input placeholder="top-center" value={s.position} onChange={(e) => {
                  const ns = [...form.map_slots]; ns[i] = { ...ns[i], position: e.target.value };
                  updateForm({ map_slots: ns });
                }} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-zinc-400 uppercase">Answer</label>
                <div className="rounded-md bg-amber-50 border border-amber-200 px-2">
                  <Input className="border-0 bg-transparent p-0 h-9 text-amber-800 font-semibold focus-visible:ring-0"
                    value={s.answer} onChange={(e) => {
                      const ns = [...form.map_slots]; ns[i] = { ...ns[i], answer: e.target.value };
                      updateForm({ map_slots: ns });
                    }} />
                </div>
              </div>
              {form.map_slots.length > 1 && (
                <div className="col-span-3 flex justify-end">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                    updateForm({ map_slots: form.map_slots.filter((_, j) => j !== i) });
                  }}>
                    <Trash2 className="h-3 w-3 text-zinc-400" />
                  </Button>
                </div>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => {
            const nl = String(form.map_slots.length + 1);
            updateForm({ map_slots: [...form.map_slots, { slot_label: nl, position: "", answer: "" }] });
          }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Slot
          </Button>
        </div>
      );
    }

    // ── Flow Chart ──────────────────────────────────────
    if (t === "flow_chart_completion") {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-1">Flow Chart Steps</h3>
            <p className="text-sm text-zinc-500">Add steps, toggle blanks, and set answers</p>
          </div>
          {form.flow_steps.map((s, i) => (
            <div key={i} className="rounded-lg border border-zinc-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">Step {s.step_number}</Badge>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={s.is_blank}
                      className="rounded border-zinc-300"
                      onChange={(e) => {
                        const ns = [...form.flow_steps]; ns[i] = { ...ns[i], is_blank: e.target.checked };
                        updateForm({ flow_steps: ns });
                      }}
                    />
                    Has blank
                  </label>
                  {form.flow_steps.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                      updateForm({ flow_steps: form.flow_steps.filter((_, j) => j !== i) });
                    }}>
                      <Trash2 className="h-3 w-3 text-zinc-400" />
                    </Button>
                  )}
                </div>
              </div>
              <Input placeholder="Step description..." value={s.description} onChange={(e) => {
                const ns = [...form.flow_steps]; ns[i] = { ...ns[i], description: e.target.value };
                updateForm({ flow_steps: ns });
              }} />
              {s.is_blank && (
                <div className="rounded-md bg-amber-50 border border-amber-200 px-2">
                  <Input
                    className="border-0 bg-transparent p-0 h-9 text-amber-800 font-semibold focus-visible:ring-0"
                    placeholder="Answer..." value={s.answer}
                    onChange={(e) => {
                      const ns = [...form.flow_steps]; ns[i] = { ...ns[i], answer: e.target.value };
                      updateForm({ flow_steps: ns });
                    }} />
                </div>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => {
            updateForm({
              flow_steps: [...form.flow_steps, {
                step_number: form.flow_steps.length + 1, description: "", answer: "", is_blank: true
              }],
            });
          }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Step
          </Button>
        </div>
      );
    }

    // ── Pick from List ──────────────────────────────────
    if (t === "pick_from_list") {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-1">Pick from List</h3>
            <p className="text-sm text-zinc-500">Add questions with multiple correct answers from a list</p>
          </div>
          {form.pick_items.map((p, i) => (
            <div key={i} className="rounded-lg border border-zinc-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">Question {i + 1}</Badge>
                {form.pick_items.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                    updateForm({ pick_items: form.pick_items.filter((_, j) => j !== i) });
                  }}>
                    <Trash2 className="h-3 w-3 text-zinc-400" />
                  </Button>
                )}
              </div>
              <Input placeholder="Question text..." value={p.question} onChange={(e) => {
                const np = [...form.pick_items]; np[i] = { ...np[i], question: e.target.value };
                updateForm({ pick_items: np });
              }} />
              <Input
                placeholder='Correct answers (comma-separated, e.g. "B, D")'
                value={p.answers.join(", ")}
                onChange={(e) => {
                  const np = [...form.pick_items];
                  np[i] = { ...np[i], answers: e.target.value.split(",").map((a) => a.trim()).filter(Boolean) };
                  updateForm({ pick_items: np });
                }}
              />
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => {
            updateForm({ pick_items: [...form.pick_items, { question: "", answers: [] }] });
          }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Question
          </Button>
        </div>
      );
    }

    // ── Default fallback ────────────────────────────────
    return (
      <div className="text-center py-8 text-zinc-400">
        <p>No specific answer configuration for this question type.</p>
        <p className="text-xs mt-1">You can proceed to review.</p>
      </div>
    );
  };

  // ── Step 5: Review ─────────────────────────────────────

  const renderStep5 = () => {
    const sectionInfo = SECTIONS.find((s) => s.value === form.section);
    const typeInfo = QUESTION_TYPES.find((t) => t.value === form.type);
    const partInfo = (SECTION_PARTS[form.section] || []).find((p) => p.value === form.section_part);

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 mb-1">Review & Create</h3>
          <p className="text-sm text-zinc-500">Check everything before creating the question</p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>
        )}

        <div className="rounded-xl border border-zinc-200 divide-y divide-zinc-100 overflow-hidden">
          <div className="flex items-center gap-3 p-4 bg-zinc-50">
            {sectionInfo && (
              <div className={`flex h-8 w-8 items-center justify-center rounded-md ${sectionInfo.color} text-white`}>
                {(() => { const Icon = sectionInfo.icon; return <Icon className="h-4 w-4" />; })()}
              </div>
            )}
            <div>
              <div className="font-semibold text-zinc-900">{form.title}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="secondary" className="text-[10px] capitalize">{sectionInfo?.label}</Badge>
                <Badge variant="secondary" className="text-[10px]">{partInfo?.label}</Badge>
                <Badge variant="secondary" className="text-[10px]">{typeInfo?.label}</Badge>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3 text-sm">
            <div>
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Instruction</span>
              <p className="text-zinc-700 mt-0.5">{form.instruction}</p>
            </div>
            {form.context && (
              <div>
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Context</span>
                <p className="text-zinc-600 mt-0.5">{form.context}</p>
              </div>
            )}
          </div>

          <div className="p-4">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Answer Preview</span>
            <div className="mt-2">
              {form.type === "multiple_choice" && (
                <div className="space-y-1">
                  {form.options.map((o) => (
                    <div key={o.label} className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${
                      form.correct_option === o.label ? "bg-green-50 text-green-700 font-medium" : "text-zinc-600"
                    }`}>
                      <span className="font-bold">{o.label}.</span> {o.text}
                      {form.correct_option === o.label && <Check className="h-3.5 w-3.5 ml-auto" />}
                    </div>
                  ))}
                </div>
              )}
              {form.type === "multiple_select" && (
                <div className="space-y-1">
                  {form.options.map((o) => {
                    const isCorrect = form.correct_options.includes(o.label);
                    return (
                      <div key={o.label} className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${
                        isCorrect ? "bg-green-50 text-green-700 font-medium" : "text-zinc-600"
                      }`}>
                        <span className="font-bold">{o.label}.</span> {o.text}
                        {isCorrect && <Check className="h-3.5 w-3.5 ml-auto" />}
                      </div>
                    );
                  })}
                  <p className="text-xs text-zinc-400 mt-2">
                    Correct: {form.correct_options.sort().join(", ")} ({form.correct_options.length} answers)
                  </p>
                </div>
              )}
              {(form.type === "note_completion" || form.type === "sentence_completion") && (
                <div className="space-y-1">
                  {form.sentences.map((s, i) => (
                    <p key={i} className="text-sm text-zinc-600">
                      {s.before} <span className="font-bold text-amber-700 bg-amber-50 px-1 rounded">{s.answer}</span> {s.after}
                    </p>
                  ))}
                </div>
              )}
              {(form.type === "true_false_not_given" || form.type === "yes_no_not_given") && (
                <div className="space-y-1">
                  {form.tfng_items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-600 truncate max-w-[250px]">{item.statement}</span>
                      <Badge variant={item.answer === "TRUE" || item.answer === "YES" ? "success" : item.answer === "NOT GIVEN" ? "secondary" : "destructive"} className="text-[10px]">
                        {item.answer}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              {!["multiple_choice", "multiple_select", "note_completion", "sentence_completion", "true_false_not_given", "yes_no_not_given"].includes(form.type) && (
                <pre className="text-xs text-zinc-500 bg-zinc-50 p-2 rounded-md overflow-auto max-h-32">
                  {JSON.stringify(buildPayload(), null, 2)}
                </pre>
              )}
            </div>
          </div>

          {form.tags && (
            <div className="p-4 flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider mr-2">Tags</span>
              {form.tags.split(",").map((t) => t.trim()).filter(Boolean).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── Main render ───────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">Create Question</h2>
            <p className="text-xs text-zinc-500">Step {step} of {STEPS.length} &mdash; {STEPS[step - 1].description}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 pt-4">
          {renderStepIndicator()}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderStep5()}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 bg-zinc-50 px-6 py-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {step > 1 ? "Back" : "Cancel"}
          </Button>

          {step < 5 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Create Question
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}


