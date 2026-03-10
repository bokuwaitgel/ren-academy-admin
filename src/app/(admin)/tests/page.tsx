"use client";

import { useEffect, useState, useCallback } from "react";
import {
  tests as tApi, questions as qApi, type Test, type Paginated,
} from "@/lib/api";
import TestModulesEditor, { type TestModules } from "@/components/sections-editor";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import {
  Plus, Eye, Trash2, Globe, EyeOff, Loader2,
  ChevronLeft, ChevronRight, Pencil,
  Headphones, BookOpen, PenLine, Mic2,
} from "lucide-react";

function truncate(s: string, n = 50) { return s.length > n ? s.slice(0, n) + "…" : s; }

const EMPTY_MODULES: TestModules = {};

function modulesFromTest(t: Test): TestModules {
  return {
    listening: t.listening ? {
      sections: t.listening.sections.map((s) => ({
        section_number: s.section_number,
        audio_url: s.audio_url,
        question_ids: s.question_ids,
      })),
    } : undefined,
    reading: t.reading ? {
      sections: t.reading.sections.map((s) => ({
        section_number: s.section_number,
        passage: s.passage,
        question_ids: s.question_ids,
      })),
    } : undefined,
    writing: t.writing ? {
      tasks: t.writing.tasks.map((task) => ({
        task_number: task.task_number,
        description: task.description,
        image_url: task.image_url,
      })),
    } : undefined,
    speaking: t.speaking ? {
      parts: t.speaking.parts.map((p) => ({
        part_number: p.part_number,
        question_ids: p.question_ids,
      })),
    } : undefined,
  };
}

function ModuleBadges({ t }: { t: Test }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {t.listening && <span className="rounded border border-indigo-800 bg-indigo-950 px-1.5 py-0.5 text-[10px] font-medium text-indigo-300"><Headphones className="inline h-2.5 w-2.5 mr-0.5" />L</span>}
      {t.reading   && <span className="rounded border border-emerald-800 bg-emerald-950 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300"><BookOpen className="inline h-2.5 w-2.5 mr-0.5" />R</span>}
      {t.writing   && <span className="rounded border border-amber-800 bg-amber-950 px-1.5 py-0.5 text-[10px] font-medium text-amber-300"><PenLine className="inline h-2.5 w-2.5 mr-0.5" />W</span>}
      {t.speaking  && <span className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300"><Mic2 className="inline h-2.5 w-2.5 mr-0.5" />S</span>}
    </div>
  );
}

export default function TestsPage() {
  const [data, setData] = useState<Paginated<Test> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pubFilter, setPubFilter] = useState("all");
  const [viewTest, setViewTest] = useState<Test | null>(null);
  const [viewQMeta, setViewQMeta] = useState<Record<string, { title: string; type: string }>>({});
  const [viewQLoading, setViewQLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [createErr, setCreateErr] = useState("");
  const [editTest, setEditTest] = useState<Test | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState("");
  const [editForm, setEditForm] = useState({
    title: "", description: "", module_type: "academic", tags: "",
  });
  const [editModules, setEditModules] = useState<TestModules>(EMPTY_MODULES);

  // Create form state
  const [form, setForm] = useState({
    title: "", description: "", module_type: "academic", tags: "",
  });
  const [createModules, setCreateModules] = useState<TestModules>(EMPTY_MODULES);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean> = { page, page_size: 20 };
      if (pubFilter === "published") params.published_only = true;
      const res = await tApi.list(params);
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, pubFilter]);

  useEffect(() => { load(); }, [load]);

  // Fetch question titles whenever view dialog opens
  useEffect(() => {
    if (!viewTest) return;
    const ids = [
      ...(viewTest.listening?.sections.flatMap((s) => s.question_ids) ?? []),
      ...(viewTest.reading?.sections.flatMap((s) => s.question_ids) ?? []),
      ...(viewTest.speaking?.parts.flatMap((p) => p.question_ids) ?? []),
    ];
    if (!ids.length) return;
    setViewQLoading(true);
    setViewQMeta({});
    Promise.all(ids.map((id) => qApi.get(id).catch(() => null))).then((results) => {
      const map: Record<string, { title: string; type: string }> = {};
      results.forEach((q) => { if (q) map[q.id] = { title: q.title, type: q.type }; });
      setViewQMeta(map);
      setViewQLoading(false);
    });
  }, [viewTest]);

  const handleCreate = async () => {
    setCreateErr("");
    setSaving(true);
    try {
      await tApi.create({
        title: form.title,
        description: form.description || undefined,
        module_type: form.module_type,
        tags: form.tags ? form.tags.split(",").map(t => t.trim()) : [],
        ...(createModules.listening ? { listening: createModules.listening } : {}),
        ...(createModules.reading   ? { reading:   createModules.reading   } : {}),
        ...(createModules.writing   ? { writing:   createModules.writing   } : {}),
        ...(createModules.speaking  ? { speaking:  createModules.speaking  } : {}),
      });
      setCreating(false);
      setForm({ title: "", description: "", module_type: "academic", tags: "" });
      setCreateModules(EMPTY_MODULES);
      load();
    } catch (e: unknown) {
      setCreateErr((e as { detail?: string })?.detail ?? "Failed to create test");
    } finally { setSaving(false); }
  };

  const openEdit = (t: Test) => {
    setEditErr("");
    setEditForm({
      title: t.title,
      description: t.description ?? "",
      module_type: t.module_type,
      tags: t.tags.join(", "),
    });
    setEditModules(modulesFromTest(t));
    setEditTest(t);
  };

  const handleUpdate = async () => {
    if (!editTest) return;
    setEditErr("");
    setEditSaving(true);
    try {
      await tApi.update(editTest.id, {
        title: editForm.title,
        description: editForm.description || undefined,
        module_type: editForm.module_type,
        tags: editForm.tags ? editForm.tags.split(",").map(t => t.trim()) : [],
        listening: editModules.listening ?? null,
        reading:   editModules.reading   ?? null,
        writing:   editModules.writing   ?? null,
        speaking:  editModules.speaking  ?? null,
      });
      setEditTest(null);
      load();
    } catch (e: unknown) {
      setEditErr((e as { detail?: string })?.detail ?? "Failed to update test");
    } finally { setEditSaving(false); }
  };

  const handleTogglePublish = async (t: Test) => {
    setToggling(t.id);
    try {
      await tApi.publish(t.id, !t.is_published);
      load();
    } catch (e) { console.error(e); }
    finally { setToggling(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this test?")) return;
    setDeletingId(id);
    try { await tApi.delete(id); load(); }
    catch (e) { console.error(e); }
    finally { setDeletingId(null); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Tests</h1>
          <p className="text-sm text-zinc-500">{data?.total ?? 0} total tests</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> New Test
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <Select value={pubFilter} onValueChange={(v) => { setPubFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tests</SelectItem>
            <SelectItem value="published">Published Only</SelectItem>
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
                  <TableHead>Title</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Modules</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium text-zinc-200">{truncate(t.title)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{t.module_type}</Badge>
                    </TableCell>
                    <TableCell><ModuleBadges t={t} /></TableCell>
                    <TableCell className="text-zinc-400">{t.question_count}</TableCell>
                    <TableCell>
                      <Badge variant={t.is_published ? "success" : "secondary"}>
                        {t.is_published ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-500 text-xs">
                      {new Date(t.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setViewTest(t)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className={t.is_published ? "text-amber-400 hover:bg-amber-950/30" : "text-emerald-400 hover:bg-emerald-950/30"}
                          onClick={() => handleTogglePublish(t)}
                          disabled={toggling === t.id}
                        >
                          {toggling === t.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : t.is_published ? <EyeOff className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="text-red-500 hover:bg-red-950/40 hover:text-red-400"
                          onClick={() => handleDelete(t.id)}
                          disabled={deletingId === t.id}
                        >
                          {deletingId === t.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!data?.items.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-zinc-600">No tests found</TableCell>
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

      {/* View detail */}
      <Dialog open={!!viewTest} onOpenChange={() => setViewTest(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewTest?.title}</DialogTitle>
          </DialogHeader>
          {viewTest && (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant={viewTest.is_published ? "success" : "secondary"}>
                  {viewTest.is_published ? "Published" : "Draft"}
                </Badge>
                <Badge variant="secondary" className="capitalize">{viewTest.module_type}</Badge>
                <ModuleBadges t={viewTest} />
                {viewQLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500 self-center" />}
              </div>
              {viewTest.description && <p className="text-zinc-400">{viewTest.description}</p>}

              {/* Helper: renders question list for a set of IDs */}
              {(() => {
                const QList = ({ ids }: { ids: string[] }) => (
                  <div className="mt-1.5 space-y-1">
                    {ids.map((id) => {
                      const q = viewQMeta[id];
                      return (
                        <div key={id} className="flex items-center gap-2">
                          <span className="h-1 w-1 rounded-full bg-zinc-600 shrink-0" />
                          {q ? (
                            <span className="text-zinc-300 truncate">{q.title}
                              <span className="ml-1.5 text-zinc-600 text-[10px]">{q.type.replace(/_/g, " ")}</span>
                            </span>
                          ) : (
                            <span className="text-zinc-600 italic">{id.slice(0, 10)}…</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );

                return (
                  <>
                    {/* Listening */}
                    {viewTest.listening && (
                      <div>
                        <p className="mb-1.5 text-xs font-semibold text-indigo-300 flex items-center gap-1.5"><Headphones className="h-3.5 w-3.5" /> Listening</p>
                        <div className="space-y-1.5">
                          {viewTest.listening.sections.map((s) => (
                            <div key={s.section_number} className="rounded-md border border-indigo-900 bg-indigo-950/20 px-3 py-2 text-xs">
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-indigo-200">Section {s.section_number}</span>
                                <span className="text-zinc-500">{s.question_ids.length} questions</span>
                              </div>
                              {s.audio_url && <p className="mt-0.5 text-zinc-500 truncate">{s.audio_url}</p>}
                              {s.question_ids.length > 0 && <QList ids={s.question_ids} />}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reading */}
                    {viewTest.reading && (
                      <div>
                        <p className="mb-1.5 text-xs font-semibold text-emerald-300 flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Reading</p>
                        <div className="space-y-1.5">
                          {viewTest.reading.sections.map((s) => (
                            <div key={s.section_number} className="rounded-md border border-emerald-900 bg-emerald-950/20 px-3 py-2 text-xs">
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-emerald-200">Passage {s.section_number}</span>
                                <span className="text-zinc-500">{s.question_ids.length} questions</span>
                              </div>
                              {s.passage && <p className="mt-0.5 text-zinc-600 line-clamp-2">{s.passage}</p>}
                              {s.question_ids.length > 0 && <QList ids={s.question_ids} />}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Writing */}
                    {viewTest.writing && (
                      <div>
                        <p className="mb-1.5 text-xs font-semibold text-amber-300 flex items-center gap-1.5"><PenLine className="h-3.5 w-3.5" /> Writing</p>
                        <div className="space-y-1.5">
                          {viewTest.writing.tasks.map((task) => (
                            <div key={task.task_number} className="rounded-md border border-amber-900 bg-amber-950/20 px-3 py-2 text-xs">
                              <p className="font-medium text-amber-200 mb-0.5">Task {task.task_number}</p>
                              <p className="text-zinc-400 line-clamp-2">{task.description}</p>
                              {task.image_url && <p className="mt-0.5 text-zinc-500 truncate">{task.image_url}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Speaking */}
                    {viewTest.speaking && (
                      <div>
                        <p className="mb-1.5 text-xs font-semibold text-zinc-300 flex items-center gap-1.5"><Mic2 className="h-3.5 w-3.5" /> Speaking</p>
                        <div className="space-y-1.5">
                          {viewTest.speaking.parts.map((part) => (
                            <div key={part.part_number} className="rounded-md border border-zinc-700 bg-zinc-800/40 px-3 py-2 text-xs">
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-zinc-200">Part {part.part_number}</span>
                                <span className="text-zinc-500">{part.question_ids.length} questions</span>
                              </div>
                              {part.question_ids.length > 0 && <QList ids={part.question_ids} />}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              <p className="text-xs text-zinc-600">ID: {viewTest.id}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTest} onOpenChange={(open) => { if (!open) setEditTest(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Test</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editErr && (
              <div className="rounded border border-red-900 bg-red-950/50 p-3 text-sm text-red-400">{editErr}</div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Title *</label>
              <Input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} placeholder="IELTS Academic Test 1" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Description</label>
              <Input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Module</label>
                <Select value={editForm.module_type} onValueChange={v => setEditForm(f => ({ ...f, module_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="general">General Training</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Modules</label>
              <TestModulesEditor modules={editModules} onChange={setEditModules} testId={editTest?.id} moduleType={editForm.module_type} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Tags (comma-separated)</label>
              <Input value={editForm.tags} onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))} placeholder="ielts, academic, 2024" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setEditTest(null)}>Cancel</Button>
              <Button className="flex-1" onClick={handleUpdate} disabled={editSaving || !editForm.title}>
                {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Test</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {createErr && (
              <div className="rounded border border-red-900 bg-red-950/50 p-3 text-sm text-red-400">{createErr}</div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Title *</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="IELTS Academic Test 1" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Description</label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Module</label>
                <Select value={form.module_type} onValueChange={v => setForm(f => ({ ...f, module_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="general">General Training</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Modules</label>
              <TestModulesEditor modules={createModules} onChange={setCreateModules} moduleType={form.module_type} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Tags (comma-separated)</label>
              <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="ielts, academic, 2024" />
            </div>
            <div className="flex gap-2 pt-1">
              <DialogClose asChild>
                <Button variant="outline" className="flex-1">Cancel</Button>
              </DialogClose>
              <Button className="flex-1" onClick={handleCreate} disabled={saving || !form.title}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Test"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
