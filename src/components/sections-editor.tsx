"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, X, Headphones, BookOpen, PenLine, Mic2, Loader2, Upload, ChevronDown } from "lucide-react";
import QuestionPickerDialog, { type QuestionMeta } from "@/components/question-picker-dialog";
import { questions as qApi, storage } from "@/lib/api";

// ── Exported types ──────────────────────────────────────────────

export interface ListeningSectionForm {
  section_number: number;
  audio_url: string;
  question_ids: string[];
}

export interface ReadingSectionForm {
  section_number: number;
  passage: string;
  question_ids: string[];
}

export interface WritingTaskForm {
  task_number: number;
  description: string;
  image_url?: string;
}

export interface SpeakingPartForm {
  part_number: number;
  question_ids: string[];
}

export interface TestModules {
  listening?: { sections: ListeningSectionForm[] };
  reading?:   { sections: ReadingSectionForm[] };
  writing?:   { tasks: WritingTaskForm[] };
  speaking?:  { parts: SpeakingPartForm[] };
}

// ── Module toggle config ─────────────────────────────────────────

type ModuleKey = "listening" | "reading" | "writing" | "speaking";

type PickerTarget =
  | { module: "listening"; index: number }
  | { module: "reading"; index: number }
  | { module: "speaking"; index: number };

const MODULE_META: {
  key: ModuleKey;
  label: string;
  cardColor: string;
  innerColor: string;
  accent: string;
  btnHover: string;
  inputRing: string;
  Icon: React.ElementType;
}[] = [
  {
    key: "listening", label: "Listening",
    cardColor: "border-indigo-800 bg-indigo-950/20",
    innerColor: "border-indigo-900/60",
    accent: "text-indigo-300",
    btnHover: "hover:bg-indigo-950/40",
    inputRing: "focus:ring-indigo-700",
    Icon: Headphones,
  },
  {
    key: "reading", label: "Reading",
    cardColor: "border-emerald-800 bg-emerald-950/20",
    innerColor: "border-emerald-900/60",
    accent: "text-emerald-300",
    btnHover: "hover:bg-emerald-950/40",
    inputRing: "focus:ring-emerald-700",
    Icon: BookOpen,
  },
  {
    key: "writing", label: "Writing",
    cardColor: "border-amber-800 bg-amber-950/20",
    innerColor: "border-amber-900/60",
    accent: "text-amber-300",
    btnHover: "hover:bg-amber-950/40",
    inputRing: "focus:ring-amber-700",
    Icon: PenLine,
  },
  {
    key: "speaking", label: "Speaking",
    cardColor: "border-zinc-700 bg-zinc-800/40",
    innerColor: "border-zinc-700/60",
    accent: "text-zinc-300",
    btnHover: "hover:bg-zinc-700",
    inputRing: "focus:ring-zinc-600",
    Icon: Mic2,
  },
];

interface Props {
  modules: TestModules;
  onChange: (modules: TestModules) => void;
  testId?: string;
  moduleType?: string;
}

// ── File upload sub-component ──────────────────────────────────

type FileUploadInputProps = {
  value: string;
  accept: string;
  placeholder: string;
  uploadFn: (fileName: string, base64: string) => Promise<{ url: string; key: string }>;
  onChange: (url: string) => void;
};

function FileUploadInput({ value, accept, placeholder, uploadFn, onChange }: FileUploadInputProps) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr("");
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const r = reader.result as string;
          resolve(r.includes(",") ? r.split(",")[1] : r);
        };
        reader.onerror = () => reject(new Error("read error"));
        reader.readAsDataURL(file);
      });
      const result = await uploadFn(file.name, base64);
      onChange(result.url);
    } catch {
      setErr("Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const displayName = value
    ? (value.split("/").pop()?.split("?")[0] ?? value)
    : "";

  return (
    <div className="mt-1 space-y-1">
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
      {value ? (
        <div className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300">
          <span className="flex-1 truncate">{displayName}</span>
          <button type="button" onClick={() => onChange("")} className="shrink-0 text-zinc-500 hover:text-red-400 transition-colors">
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-md border border-dashed border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? "Uploading…" : placeholder}
        </button>
      )}
      {err && <p className="text-[11px] text-red-400">{err}</p>}
    </div>
  );
}

export default function TestModulesEditor({ modules, onChange, testId, moduleType }: Props) {
  const [questionMeta, setQuestionMeta] = useState<Record<string, QuestionMeta>>({});
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [activeSection, setActiveSection] = useState<ModuleKey | null>(null);
  const tempId = useRef(typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Math.random().toString(36).slice(2));
  const effectiveTestId = testId ?? tempId.current;
  const effectiveModuleType = moduleType ?? "academic";

  // Auto-select first active section on mount / when modules change
  useEffect(() => {
    if (activeSection && modules[activeSection]) return;
    const first = MODULE_META.find((m) => !!modules[m.key]);
    setActiveSection(first?.key ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cache question metadata for pre-loaded IDs (e.g. on edit)
  useEffect(() => {
    const allIds: string[] = [
      ...(modules.listening?.sections.flatMap((s) => s.question_ids) ?? []),
      ...(modules.reading?.sections.flatMap((s) => s.question_ids) ?? []),
      ...(modules.speaking?.parts.flatMap((p) => p.question_ids) ?? []),
    ];
    const missing = allIds.filter((id, i, arr) => arr.indexOf(id) === i && !questionMeta[id]);
    if (!missing.length) return;
    Promise.all(missing.map((id) => qApi.get(id).catch(() => null))).then((results) => {
      setQuestionMeta((prev) => {
        const next = { ...prev };
        results.forEach((q) => {
          if (q) next[q.id] = { id: q.id, title: q.title, type: q.type, section: q.section, section_part: q.section_part };
        });
        return next;
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modules]);

  // ── Module toggle ──────────────────────────────────────────────
  const toggleModule = (key: ModuleKey, enabled: boolean) => {
    if (!enabled) {
      onChange({ ...modules, [key]: undefined });
      if (activeSection === key) {
        const remaining = MODULE_META.map((m) => m.key).filter((k) => k !== key && !!modules[k]);
        setActiveSection(remaining[0] ?? null);
      }
      return;
    }
    const defaults: Record<ModuleKey, object> = {
      listening: { sections: [{ section_number: 1, audio_url: "", question_ids: [] }] },
      reading:   { sections: [{ section_number: 1, passage: "", question_ids: [] }] },
      writing:   { tasks: [{ task_number: 1, description: "", image_url: "" }] },
      speaking:  { parts: [{ part_number: 1, question_ids: [] }] },
    };
    onChange({ ...modules, [key]: defaults[key] });
    setActiveSection(key);
  };

  // ── Listening helpers ──────────────────────────────────────────
  const addListeningSection = () => {
    const secs = modules.listening!.sections;
    if (secs.length >= 4) return;
    onChange({ ...modules, listening: { sections: [...secs, { section_number: secs.length + 1, audio_url: "", question_ids: [] }] } });
  };
  const updateListeningSection = (i: number, patch: Partial<ListeningSectionForm>) => {
    const secs = modules.listening!.sections.map((s, idx) => idx === i ? { ...s, ...patch } : s);
    onChange({ ...modules, listening: { sections: secs } });
  };
  const removeListeningSection = (i: number) => {
    const secs = modules.listening!.sections
      .filter((_, idx) => idx !== i)
      .map((s, idx) => ({ ...s, section_number: idx + 1 }));
    onChange({ ...modules, listening: { sections: secs } });
  };

  // ── Reading helpers ────────────────────────────────────────────
  const addReadingSection = () => {
    const secs = modules.reading!.sections;
    if (secs.length >= 3) return;
    onChange({ ...modules, reading: { sections: [...secs, { section_number: secs.length + 1, passage: "", question_ids: [] }] } });
  };
  const updateReadingSection = (i: number, patch: Partial<ReadingSectionForm>) => {
    const secs = modules.reading!.sections.map((s, idx) => idx === i ? { ...s, ...patch } : s);
    onChange({ ...modules, reading: { sections: secs } });
  };
  const removeReadingSection = (i: number) => {
    const secs = modules.reading!.sections
      .filter((_, idx) => idx !== i)
      .map((s, idx) => ({ ...s, section_number: idx + 1 }));
    onChange({ ...modules, reading: { sections: secs } });
  };

  // ── Writing helpers ────────────────────────────────────────────
  const addWritingTask = () => {
    const tasks = modules.writing!.tasks;
    if (tasks.length >= 2) return;
    onChange({ ...modules, writing: { tasks: [...tasks, { task_number: tasks.length + 1, description: "", image_url: "" }] } });
  };
  const updateWritingTask = (i: number, patch: Partial<WritingTaskForm>) => {
    const tasks = modules.writing!.tasks.map((t, idx) => idx === i ? { ...t, ...patch } : t);
    onChange({ ...modules, writing: { tasks } });
  };
  const removeWritingTask = (i: number) => {
    const tasks = modules.writing!.tasks
      .filter((_, idx) => idx !== i)
      .map((t, idx) => ({ ...t, task_number: idx + 1 }));
    onChange({ ...modules, writing: { tasks } });
  };

  // ── Speaking helpers ───────────────────────────────────────────
  const addSpeakingPart = () => {
    const parts = modules.speaking!.parts;
    if (parts.length >= 3) return;
    onChange({ ...modules, speaking: { parts: [...parts, { part_number: parts.length + 1, question_ids: [] }] } });
  };
  const updateSpeakingPart = (i: number, patch: Partial<SpeakingPartForm>) => {
    const parts = modules.speaking!.parts.map((p, idx) => idx === i ? { ...p, ...patch } : p);
    onChange({ ...modules, speaking: { parts } });
  };
  const removeSpeakingPart = (i: number) => {
    const parts = modules.speaking!.parts
      .filter((_, idx) => idx !== i)
      .map((p, idx) => ({ ...p, part_number: idx + 1 }));
    onChange({ ...modules, speaking: { parts } });
  };

  // ── Question picker confirm ────────────────────────────────────
  const handlePickerConfirm = (picked: QuestionMeta[]) => {
    if (!picker) return;
    setQuestionMeta((prev) => {
      const next = { ...prev };
      picked.forEach((q) => { next[q.id] = q; });
      return next;
    });
    const newIds = picked.map((q) => q.id);
    if (picker.module === "listening") {
      const secs = modules.listening!.sections.map((s, idx) => {
        if (idx !== picker.index) return s;
        const existing = new Set(s.question_ids);
        return { ...s, question_ids: [...s.question_ids, ...newIds.filter((id) => !existing.has(id))] };
      });
      onChange({ ...modules, listening: { sections: secs } });
    } else if (picker.module === "reading") {
      const secs = modules.reading!.sections.map((s, idx) => {
        if (idx !== picker.index) return s;
        const existing = new Set(s.question_ids);
        return { ...s, question_ids: [...s.question_ids, ...newIds.filter((id) => !existing.has(id))] };
      });
      onChange({ ...modules, reading: { sections: secs } });
    } else {
      const parts = modules.speaking!.parts.map((p, idx) => {
        if (idx !== picker.index) return p;
        const existing = new Set(p.question_ids);
        return { ...p, question_ids: [...p.question_ids, ...newIds.filter((id) => !existing.has(id))] };
      });
      onChange({ ...modules, speaking: { parts } });
    }
    setPicker(null);
  };

  // ── Question chips sub-component ──────────────────────────────
  const QuestionChips = ({ ids, onRemove }: { ids: string[]; onRemove: (id: string) => void }) => (
    <div className="flex flex-wrap gap-1 mt-2">
      {ids.map((id) => {
        const meta = questionMeta[id];
        return (
          <span key={id} className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-300">
            <span className="max-w-[180px] truncate">{meta?.title ?? id.slice(0, 8) + "…"}</span>
            <button type="button" onClick={() => onRemove(id)} className="ml-0.5 text-zinc-500 hover:text-red-400 transition-colors">
              <X className="h-3 w-3" />
            </button>
          </span>
        );
      })}
      {ids.length === 0 && (
        <span className="text-[11px] text-zinc-600 italic">No questions added yet</span>
      )}
    </div>
  );

  const allIds = new Set<string>([
    ...(modules.listening?.sections.flatMap((s) => s.question_ids) ?? []),
    ...(modules.reading?.sections.flatMap((s) => s.question_ids) ?? []),
    ...(modules.speaking?.parts.flatMap((p) => p.question_ids) ?? []),
  ]);

  // The currently active module object (for convenience)
  const activeMeta = MODULE_META.find((m) => m.key === activeSection);

  return (
    <div className="space-y-3">
      {/* ── Section tabs ─────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        {MODULE_META.map(({ key, label, cardColor, accent, Icon }) => {
          const isEnabled = !!modules[key];
          const isSelected = activeSection === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (isEnabled) {
                  // If already enabled, just select it
                  setActiveSection(key);
                } else {
                  // Enable + select
                  toggleModule(key, true);
                }
              }}
              className={`relative flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-all ${
                isEnabled
                  ? isSelected
                    ? `${cardColor} ${accent} ring-1 ring-offset-1 ring-offset-zinc-950 ${
                        key === "listening" ? "ring-indigo-600" :
                        key === "reading"   ? "ring-emerald-600" :
                        key === "writing"   ? "ring-amber-600" :
                        "ring-zinc-500"
                      }`
                    : `${cardColor} ${accent} opacity-70 hover:opacity-100`
                  : "border-zinc-800 bg-zinc-900 text-zinc-600 hover:text-zinc-400 hover:border-zinc-700"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {isEnabled && (
                <span
                  title={`Disable ${label}`}
                  onClick={(e) => { e.stopPropagation(); toggleModule(key, false); }}
                  className="absolute right-1.5 top-1 text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <X className="h-2.5 w-2.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Empty state ──────────────────────────────────────────── */}
      {!modules.listening && !modules.reading && !modules.writing && !modules.speaking && (
        <p className="rounded-lg border border-dashed border-zinc-800 py-4 text-center text-xs text-zinc-600">
          Click a section above to enable it and start building your test.
        </p>
      )}

      {/* ── Selected section content ─────────────────────────────── */}
      {activeMeta && modules[activeMeta.key] && (
        <div className={`rounded-lg border p-4 space-y-3 ${activeMeta.cardColor}`}>
          <div className="flex items-center justify-between">
            <span className={`flex items-center gap-2 text-sm font-semibold ${activeMeta.accent}`}>
              <activeMeta.Icon className="h-4 w-4" />
              {activeMeta.label}
            </span>

            {/* Add part button (section-specific) */}
            {activeMeta.key === "listening" && modules.listening!.sections.length < 4 && (
              <Button type="button" size="sm" variant="ghost"
                className={`h-7 text-xs ${activeMeta.accent} ${activeMeta.btnHover}`}
                onClick={addListeningSection}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Section
              </Button>
            )}
            {activeMeta.key === "reading" && modules.reading!.sections.length < 3 && (
              <Button type="button" size="sm" variant="ghost"
                className={`h-7 text-xs ${activeMeta.accent} ${activeMeta.btnHover}`}
                onClick={addReadingSection}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Passage
              </Button>
            )}
            {activeMeta.key === "writing" && modules.writing!.tasks.length < 2 && (
              <Button type="button" size="sm" variant="ghost"
                className={`h-7 text-xs ${activeMeta.accent} ${activeMeta.btnHover}`}
                onClick={addWritingTask}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Task
              </Button>
            )}
            {activeMeta.key === "speaking" && modules.speaking!.parts.length < 3 && (
              <Button type="button" size="sm" variant="ghost"
                className={`h-7 text-xs ${activeMeta.accent} ${activeMeta.btnHover}`}
                onClick={addSpeakingPart}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Part
              </Button>
            )}
          </div>

          {/* ── Listening parts ──────────────────────────────── */}
          {activeMeta.key === "listening" && modules.listening!.sections.map((sec, i) => (
            <div key={i} className={`rounded-md border ${activeMeta.innerColor} bg-zinc-950/40 p-3 space-y-2.5`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-200">Section {sec.section_number}</span>
                {modules.listening!.sections.length > 1 && (
                  <button type="button" onClick={() => removeListeningSection(i)}
                    className="text-zinc-600 hover:text-red-400 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div>
                <label className="text-[11px] text-zinc-500">Audio *</label>
                <FileUploadInput
                  value={sec.audio_url}
                  accept="audio/*"
                  placeholder="Upload audio file"
                  onChange={(url) => updateListeningSection(i, { audio_url: url })}
                  uploadFn={(fileName, base64) =>
                    storage.uploadListeningAudio(effectiveTestId, effectiveModuleType, fileName, base64)
                  }
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-zinc-500">Questions ({sec.question_ids.length})</label>
                  <Button type="button" size="sm" variant="ghost"
                    className="h-6 px-2 text-[11px] text-indigo-400 hover:bg-indigo-950/40"
                    onClick={() => setPicker({ module: "listening", index: i })}>
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
                <QuestionChips ids={sec.question_ids}
                  onRemove={(id) => updateListeningSection(i, { question_ids: sec.question_ids.filter((q) => q !== id) })} />
              </div>
            </div>
          ))}

          {/* ── Reading parts ──────────────────────────────────── */}
          {activeMeta.key === "reading" && modules.reading!.sections.map((sec, i) => (
            <div key={i} className={`rounded-md border ${activeMeta.innerColor} bg-zinc-950/40 p-3 space-y-2.5`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-200">Passage {sec.section_number}</span>
                {modules.reading!.sections.length > 1 && (
                  <button type="button" onClick={() => removeReadingSection(i)}
                    className="text-zinc-600 hover:text-red-400 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div>
                <label className="text-[11px] text-zinc-500">Passage text *</label>
                <textarea rows={5}
                  className={`mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 ${activeMeta.inputRing} resize-y`}
                  placeholder="Paste the reading passage here…"
                  value={sec.passage}
                  onChange={(e) => updateReadingSection(i, { passage: e.target.value })} />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-zinc-500">Questions ({sec.question_ids.length})</label>
                  <Button type="button" size="sm" variant="ghost"
                    className="h-6 px-2 text-[11px] text-emerald-400 hover:bg-emerald-950/40"
                    onClick={() => setPicker({ module: "reading", index: i })}>
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
                <QuestionChips ids={sec.question_ids}
                  onRemove={(id) => updateReadingSection(i, { question_ids: sec.question_ids.filter((q) => q !== id) })} />
              </div>
            </div>
          ))}

          {/* ── Writing tasks ──────────────────────────────────── */}
          {activeMeta.key === "writing" && modules.writing!.tasks.map((task, i) => (
            <div key={i} className={`rounded-md border ${activeMeta.innerColor} bg-zinc-950/40 p-3 space-y-2.5`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-200">Task {task.task_number}</span>
                {modules.writing!.tasks.length > 1 && (
                  <button type="button" onClick={() => removeWritingTask(i)}
                    className="text-zinc-600 hover:text-red-400 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div>
                <label className="text-[11px] text-zinc-500">Description / prompt *</label>
                <textarea rows={4}
                  className={`mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 ${activeMeta.inputRing} resize-y`}
                  placeholder="Write the task prompt / instructions…"
                  value={task.description}
                  onChange={(e) => updateWritingTask(i, { description: e.target.value })} />
              </div>
              {task.task_number === 1 && (
                <div>
                  <label className="text-[11px] text-zinc-500">Image — chart / graph / map (optional)</label>
                  <FileUploadInput
                    value={task.image_url ?? ""}
                    accept="image/*"
                    placeholder="Upload image"
                    onChange={(url) => updateWritingTask(i, { image_url: url || undefined })}
                    uploadFn={(fileName, base64) =>
                      storage.uploadWritingImage(effectiveTestId, effectiveModuleType, fileName, base64)
                    }
                  />
                </div>
              )}
            </div>
          ))}

          {/* ── Speaking parts ─────────────────────────────────── */}
          {activeMeta.key === "speaking" && modules.speaking!.parts.map((part, i) => (
            <div key={i} className={`rounded-md border ${activeMeta.innerColor} bg-zinc-950/40 p-3 space-y-2.5`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">Part {part.part_number}</span>
                {modules.speaking!.parts.length > 1 && (
                  <button type="button" onClick={() => removeSpeakingPart(i)}
                    className="text-zinc-600 hover:text-red-400 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-zinc-500">Questions ({part.question_ids.length})</label>
                  <Button type="button" size="sm" variant="ghost"
                    className="h-6 px-2 text-[11px] text-zinc-300 hover:bg-zinc-700"
                    onClick={() => setPicker({ module: "speaking", index: i })}>
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
                <QuestionChips ids={part.question_ids}
                  onRemove={(id) => updateSpeakingPart(i, { question_ids: part.question_ids.filter((q) => q !== id) })} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Question picker */}
      <QuestionPickerDialog
        open={picker !== null}
        onClose={() => setPicker(null)}
        initialSection={picker?.module ?? "all"}
        selectedIds={allIds}
        onConfirm={handlePickerConfirm}
      />
    </div>
  );
}
