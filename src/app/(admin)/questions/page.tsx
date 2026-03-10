"use client";

import { useEffect, useState, useCallback } from "react";
import { questions as qApi, type Question, type Paginated } from "@/lib/api";
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
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Eye,
} from "lucide-react";
import QuestionCreator from "@/components/question-creator";

const SECTIONS = ["listening", "reading", "writing", "speaking"];
const TYPES = [
  "multiple_choice", "multiple_select", "form_completion", "table_completion",
  "flow_chart_completion", "sentence_completion", "note_completion", "summary_completion",
  "short_answer", "map_labelling", "plan_labelling", "diagram_labelling",
  "matching", "matching_features", "matching_headings",
  "true_false_not_given", "yes_no_not_given", "pick_from_list",
  "graph_description", "letter_writing", "process_description", "map_comparison",
  "essay_opinion", "essay_discussion", "essay_problem_solution", "essay_advantages", "essay_mixed",
  "speaking_interview", "speaking_cue_card", "speaking_discussion",
];

export default function QuestionsPage() {
  const [data, setData] = useState<Paginated<Question> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Detail dialog
  const [viewQuestion, setViewQuestion] = useState<Question | null>(null);

  // Delete in progress
  const [deleting, setDeleting] = useState<string | null>(null);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, page_size: 20 };
      if (sectionFilter !== "all") params.section = sectionFilter;
      if (typeFilter !== "all") params.type = typeFilter;
      if (search.trim()) params.search = search.trim();
      setData(await qApi.list(params));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page, search, sectionFilter, typeFilter]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this question permanently?")) return;
    setDeleting(id);
    try {
      await qApi.delete(id);
      fetchQuestions();
    } catch {
      /* ignore */
    } finally {
      setDeleting(null);
    }
  };

  const sectionBadge = (section: string) => {
    const colors: Record<string, "default" | "warning" | "success" | "destructive"> = {
      listening: "default",
      reading: "success",
      writing: "warning",
      speaking: "destructive",
    };
    return <Badge variant={colors[section] || "secondary"} className="capitalize">{section}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Questions</h1>
          <p className="text-sm text-zinc-500">Manage IELTS question bank</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          New Question
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search questions…"
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={sectionFilter} onValueChange={(v) => { setSectionFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sections</SelectItem>
            {SECTIONS.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
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
              No questions found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium max-w-[250px] truncate">
                      {q.title}
                    </TableCell>
                    <TableCell>{sectionBadge(q.section)}</TableCell>
                    <TableCell className="text-xs text-zinc-500">
                      {q.type.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell className="text-xs capitalize text-zinc-500">
                      {q.module_type}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {q.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                        {q.tags.length > 3 && (
                          <Badge variant="secondary" className="text-[10px]">
                            +{q.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="View"
                          onClick={() => setViewQuestion(q)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete"
                          onClick={() => handleDelete(q.id)}
                          disabled={deleting === q.id}
                        >
                          {deleting === q.id ? (
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
            Page {data.page} of {data.total_pages} ({data.total} questions)
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

      {/* View question detail */}
      <Dialog open={!!viewQuestion} onOpenChange={() => setViewQuestion(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle>Question Details</DialogTitle>
          </DialogHeader>
          {viewQuestion && (
            <div className="space-y-4 text-sm">
              <div>
                <span className="font-medium text-zinc-700">Title:</span>{" "}
                <span className="text-zinc-900">{viewQuestion.title}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {sectionBadge(viewQuestion.section)}
                <Badge variant="secondary">{viewQuestion.type.replace(/_/g, " ")}</Badge>
                <Badge variant="secondary" className="capitalize">{viewQuestion.module_type}</Badge>
                <Badge variant="secondary">{viewQuestion.section_part.replace(/_/g, " ")}</Badge>
              </div>
              <div>
                <span className="font-medium text-zinc-700">Instruction:</span>
                <p className="mt-1 whitespace-pre-wrap text-zinc-600">{viewQuestion.instruction}</p>
              </div>
              {viewQuestion.passage && (
                <div>
                  <span className="font-medium text-zinc-700">Passage:</span>
                  <p className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap rounded bg-zinc-50 p-3 text-xs text-zinc-600">
                    {String(viewQuestion.passage)}
                  </p>
                </div>
              )}
              {viewQuestion.context && (
                <div>
                  <span className="font-medium text-zinc-700">Context:</span>
                  <p className="mt-1 text-zinc-600">{String(viewQuestion.context)}</p>
                </div>
              )}
              {viewQuestion.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {viewQuestion.tags.map((t) => (
                    <Badge key={t} variant="secondary">{t}</Badge>
                  ))}
                </div>
              )}
              <pre className="max-h-60 overflow-auto rounded bg-zinc-50 p-3 text-xs text-zinc-600">
                {JSON.stringify(viewQuestion, null, 2)}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create question wizard */}
      {showCreate && (
        <QuestionCreator
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            fetchQuestions();
          }}
        />
      )}
    </div>
  );
}
