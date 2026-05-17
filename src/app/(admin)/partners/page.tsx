"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { partners, showApiError, type Partner, type Paginated } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronLeft, ChevronRight, Handshake, Plus, ExternalLink } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/lib/auth-context";

export default function PartnersPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin" || user?.role === "super-admin";

  const [data, setData] = useState<Paginated<Partner> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    contact_email: "",
    contact_phone: "",
    contract_note: "",
    profit_share_pct: "0",
    owner_user_id: "",
  });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, page_size: 20 };
      if (statusFilter !== "all") params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      setData(await partners.admin.list(params));
    } catch (e) { showApiError(e, "Failed to load partners"); }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (form.name.trim().length < 2) { toast.error("Name is required"); return; }
    setCreating(true);
    try {
      await partners.admin.create({
        name: form.name.trim(),
        contact_email: form.contact_email.trim() || undefined,
        contact_phone: form.contact_phone.trim() || undefined,
        contract_note: form.contract_note.trim() || undefined,
        profit_share_pct: Number(form.profit_share_pct) || 0,
        owner_user_id: form.owner_user_id.trim() || undefined,
      });
      toast.success(`Partner '${form.name}' created`);
      setCreateOpen(false);
      setForm({ name: "", contact_email: "", contact_phone: "", contract_note: "", profit_share_pct: "0", owner_user_id: "" });
      load();
    } catch (e) { showApiError(e, "Failed to create partner"); }
    finally { setCreating(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Partners</h1>
          <p className="text-sm text-[var(--text-muted)]">{data?.total ?? 0} total</p>
        </div>
        {isSuperAdmin && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New Partner
          </Button>
        )}
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Search by name…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Profit %</TableHead>
                  <TableHead>Campaigns</TableHead>
                  <TableHead>Codes (used / total)</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-[var(--text-primary)]">{p.name}</TableCell>
                    <TableCell className="text-[var(--text-secondary)] text-sm">
                      {p.contact_email || "—"}
                      {p.contact_phone && <div className="text-xs text-[var(--text-muted)]">{p.contact_phone}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.status === "active" ? "success" : "secondary"}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{p.profit_share_pct.toFixed(1)}%</TableCell>
                    <TableCell className="text-sm">{p.active_campaigns ?? 0}</TableCell>
                    <TableCell className="text-sm">
                      {p.used_codes ?? 0} / {p.total_codes ?? 0}
                    </TableCell>
                    <TableCell className="text-[var(--text-muted)] text-xs">
                      {new Date(p.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/partners/${p.id}`}>
                        <Button variant="ghost" size="icon" aria-label="Open partner">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {!data?.items.length && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <EmptyState icon={Handshake} title="No partners yet" description="Create one to start issuing promo codes." />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Partner</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Partner name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input value={form.contact_email} onChange={(e) => setForm(f => ({ ...f, contact_email: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input value={form.contact_phone} onChange={(e) => setForm(f => ({ ...f, contact_phone: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Owner user ID (optional)</label>
              <Input value={form.owner_user_id} onChange={(e) => setForm(f => ({ ...f, owner_user_id: e.target.value }))} placeholder="User ID for portal access" />
              <p className="mt-1 text-xs text-[var(--text-muted)]">User must have role=&quot;partner&quot;.</p>
            </div>
            <div>
              <label className="text-sm font-medium">Profit share %</label>
              <Input
                type="number"
                step="0.1"
                value={form.profit_share_pct}
                onChange={(e) => setForm(f => ({ ...f, profit_share_pct: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Contract note</label>
              <Input value={form.contract_note} onChange={(e) => setForm(f => ({ ...f, contract_note: e.target.value }))} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
              <Button className="flex-1" onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
