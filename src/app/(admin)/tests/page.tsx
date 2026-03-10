"use client";

import { useEffect, useState, useCallback } from "react";
import { tests as tApi, type Test, type Paginated } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
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
  Plus,
  Trash2,
  Eye,
  Globe,
  GlobeLock,
} from "lucide-react";

export default function TestsPage() {
  const [data, setData] = useState<Paginated<Test> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [publishedFilter, setPublishedFilter] = useState("all");

  // View dialog
  const [viewTest, setViewTest] = useState<Test | null>(null);

  // Toggling publish
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [newTest, setNewTest] = useState({
    title: "",
    description: "",
    test_type: "ielts",
    module_type: "academic",
    time_limit_minutes: "164",
    tags: "",
    sections: '[{"section":"listening","section_part":"part_1","question_ids":["<id>"]}]',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean> = { page, page_size: 20 };
      if (publishedFilter === "published") params.published_only = true;
      setData(await tApi.list(params));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page, publishedFilter]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const handleTogglePublish = async (test: Test) => {
    setToggling(test.id);
    try {
      await tApi.publish(test.id, !test.is_published);
      fetchTests();
    } catch {
      /* ignore */
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this test permanently?")) return;
    setDeleting(id);
    try {
      await tApi.delete(id);
      fetchTests();
    } catch {
      /* ignore */
    } finally {
      setDeleting(null);
    }
  };

  const handleCreate = async () => {
    setCreateError("");
    setCreating(true);
    try {
      let parsedSections;
      try {
        parsedSections = JSON.parse(newTest.sections);
      } catch {
        setCreateError("Invalid JSON for sections");
        setCreating(false);
        return;
      }
      await tApi.create({
        title: newTest.title,
        description: newTest.description || undefined,
        test_type: newTest.test_type,
        module_type: newTest.module_type,
        time_limit_minutes: parseInt(newTest.time_limit_minutes) || 164,
        tags: newTest.tags.split(",").map((t) => t.trim()).filter(Boolean),
        sections: parsedSections,
      });
      setShowCreate(false);
      setNewTest({
        title: "", description: "", test_type: "ielts", module_type: "academic",
        time_limit_minutes: "164", tags: "",
        sections: '[{"section":"listening","section_part":"part_1","question_ids":["<id>"]}]',
      });
      fetchTests();
    } catch (err: unknown) {
      const e = err as { detail?: string };
      setCreateError(typeof e?.detail === "string" ? e.detail : "Failed to create test");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Tests</h1>
          <p className="text-sm text-zinc-500">Manage exam papers and their publication</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          New Test
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={publishedFilter} onValueChange={(v) => { setPublishedFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tests</SelectItem>
            <SelectItem value="published">Published only</SelectItem>
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
              No tests found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium max-w-[250px] truncate">
                      {t.title}
                    </TableCell>
                    <TableCell className="text-xs capitalize text-zinc-500">
                      {t.module_type.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600">
                      {t.question_count}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-500">
                      {t.time_limit_minutes} min
                    </TableCell>
                    <TableCell>
                      {t.is_published ? (
                        <Badge variant="success">Published</Badge>
                      ) : (
                        <Badge variant="secondary">Draft</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">
                      {new Date(t.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" title="View" onClick={() => setViewTest(t)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t.is_published ? "Unpublish" : "Publish"}
                          onClick={() => handleTogglePublish(t)}
                          disabled={toggling === t.id}
                        >
                          {toggling === t.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : t.is_published ? (
                            <GlobeLock className="h-4 w-4 text-amber-500" />
                          ) : (
                            <Globe className="h-4 w-4 text-emerald-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete"
                          onClick={() => handleDelete(t.id)}
                          disabled={deleting === t.id}
                        >
                          {deleting === t.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-red-500" />
                          )}
                        </Button>
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
            Page {data.page} of {data.total_pages} ({data.total} tests)
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

      {/* View test detail */}
      <Dialog open={!!viewTest} onOpenChange={() => setViewTest(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle>Test Details</DialogTitle>
          </DialogHeader>
          {viewTest && (
            <div className="space-y-4 text-sm">
              <div>
                <span className="font-medium text-zinc-700">Title:</span>{" "}
                <span className="text-zinc-900">{viewTest.title}</span>
              </div>
              {viewTest.description && (
                <div>
                  <span className="font-medium text-zinc-700">Description:</span>
                  <p className="mt-1 text-zinc-600">{viewTest.description}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="capitalize">{viewTest.test_type}</Badge>
                <Badge variant="secondary" className="capitalize">{viewTest.module_type.replace(/_/g, " ")}</Badge>
                {viewTest.is_published ? <Badge variant="success">Published</Badge> : <Badge variant="secondary">Draft</Badge>}
              </div>
              <div>
                <span className="font-medium text-zinc-700">Sections:</span>
                <div className="mt-2 space-y-2">
                  {viewTest.sections.map((s, i) => (
                    <div key={i} className="rounded-lg border border-zinc-200 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="default" className="capitalize">{s.section}</Badge>
                        <Badge variant="secondary">{s.section_part.replace(/_/g, " ")}</Badge>
                        {s.time_limit_minutes && <span className="text-xs text-zinc-500">{s.time_limit_minutes} min</span>}
                      </div>
                      <p className="text-xs text-zinc-500">{s.question_ids.length} question(s)</p>
                    </div>
                  ))}
                </div>
              </div>
              {viewTest.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {viewTest.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create test dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Test</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {createError && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{createError}</div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title</label>
              <Input value={newTest.title} onChange={(e) => setNewTest({ ...newTest, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="flex w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400"
                rows={2}
                value={newTest.description}
                onChange={(e) => setNewTest({ ...newTest, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Module</label>
                <Select value={newTest.module_type} onValueChange={(v) => setNewTest({ ...newTest, module_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="general_training">General Training</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Time Limit (min)</label>
                <Input
                  type="number"
                  value={newTest.time_limit_minutes}
                  onChange={(e) => setNewTest({ ...newTest, time_limit_minutes: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Sections (JSON array)</label>
              <textarea
                className="flex w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-xs font-mono shadow-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400"
                rows={5}
                value={newTest.sections}
                onChange={(e) => setNewTest({ ...newTest, sections: e.target.value })}
              />
              <p className="text-xs text-zinc-400">
                Each section: {`{"section":"listening","section_part":"part_1","question_ids":["..."]}`}
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tags (comma-separated)</label>
              <Input value={newTest.tags} onChange={(e) => setNewTest({ ...newTest, tags: e.target.value })} placeholder="mock, practice" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
