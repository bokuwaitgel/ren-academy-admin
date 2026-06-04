"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { storage, type MediaItem, type ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Upload, X, Check, Music, Trash2 } from "lucide-react";

interface MediaLibraryDialogProps {
  kind: "audio" | "images";
  // Upload handler — reuses the same per-section uploader as the inline button.
  uploadFn: (file: File) => Promise<{ url: string; key: string }>;
  onSelect: (url: string) => void;
  onClose: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaLibraryDialog({ kind, uploadFn, onSelect, onClose }: MediaLibraryDialogProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await storage.listMedia({ kind, search: q || undefined, limit: 200 });
      setItems(res.items);
    } catch (e) {
      const apiErr = e as ApiError;
      setError(typeof apiErr?.detail === "string" ? apiErr.detail : "Failed to load media library");
    } finally {
      setLoading(false);
    }
  }, [kind]);

  // Debounced search (also performs the initial load with an empty query).
  useEffect(() => {
    const t = setTimeout(() => load(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const result = await uploadFn(file);
      onSelect(result.url);
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr?.status === 413) setError("File too large — please upload a smaller file");
      else if (typeof apiErr?.detail === "string") setError(apiErr.detail);
      else setError("Upload failed — please try again");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (item: MediaItem) => {
    if (!window.confirm(`Permanently delete "${item.filename}"? This cannot be undone and will break any test/question still using it.`)) return;
    setDeletingKey(item.key);
    setError("");
    try {
      await storage.deleteMedia(item.key);
      setItems((prev) => prev.filter((it) => it.key !== item.key));
    } catch (e) {
      const apiErr = e as ApiError;
      setError(typeof apiErr?.detail === "string" ? apiErr.detail : "Failed to delete file");
    } finally {
      setDeletingKey(null);
    }
  };

  const accept = kind === "audio" ? "audio/*" : "image/*";
  const title = kind === "audio" ? "Audio Library" : "Image Library";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex max-h-[80vh] w-full max-w-3xl flex-col rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--foreground)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] px-5 py-4">
          <div>
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="text-xs text-[var(--text-muted)]">Reuse an uploaded file or upload a new one</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b border-[var(--border-color)] px-5 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
            <Input
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by file name…"
            />
          </div>
          <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={handleUpload} />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            <span className="ml-1.5">Upload new</span>
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16 text-[var(--text-muted)]">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-sm text-[var(--text-muted)]">
              {search.trim() ? "No files match your search." : "No uploaded files yet — upload one above."}
            </div>
          ) : kind === "images" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map((item) => (
                <div
                  key={item.key}
                  className="group relative overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--elevated-bg)] transition-all hover:border-indigo-500 hover:ring-1 hover:ring-indigo-500"
                >
                  <button
                    type="button"
                    onClick={() => { onSelect(item.url); onClose(); }}
                    className="block w-full text-left"
                    title={item.filename}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt={item.filename} className="h-28 w-full object-cover" loading="lazy" />
                    <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                      <span className="truncate text-[11px] text-[var(--text-muted)]">{item.filename}</span>
                      <span className="shrink-0 text-[10px] text-[var(--text-secondary)]">{formatSize(item.size)}</span>
                    </div>
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-indigo-600/0 opacity-0 transition-all group-hover:bg-indigo-600/10 group-hover:opacity-100">
                      <span className="rounded-full bg-indigo-600 p-1.5 text-white"><Check className="h-4 w-4" /></span>
                    </div>
                  </button>
                  <button
                    type="button"
                    disabled={deletingKey === item.key}
                    onClick={() => handleDelete(item)}
                    className="absolute right-1.5 top-1.5 z-10 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100 disabled:opacity-100"
                    title="Delete permanently"
                  >
                    {deletingKey === item.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center gap-3 rounded-lg border border-[var(--border-color)] bg-[var(--elevated-bg)] p-2.5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--surface)] text-[var(--text-muted)]">
                    <Music className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium" title={item.filename}>{item.filename}</div>
                    <audio controls preload="none" src={item.url} className="mt-1 h-8 w-full max-w-md" />
                  </div>
                  <span className="hidden shrink-0 text-xs text-[var(--text-secondary)] sm:block">{formatSize(item.size)}</span>
                  <Button size="sm" onClick={() => { onSelect(item.url); onClose(); }}>
                    <Check className="h-3.5 w-3.5 mr-1" /> Select
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="shrink-0 text-[var(--text-muted)] hover:text-red-500"
                    disabled={deletingKey === item.key}
                    onClick={() => handleDelete(item)}
                    title="Delete permanently"
                  >
                    {deletingKey === item.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
