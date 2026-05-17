"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  partners,
  showApiError,
  type Partner,
  type Campaign,
  type CampaignType,
  type PromoCode,
  type PromoCodeStatus,
  type Redemption,
  type Paginated,
} from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Loader2, ArrowLeft, Plus, Download, Ban, Tag, ClipboardList, Receipt } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

type TabKey = "campaigns" | "codes" | "redemptions";

export default function PartnerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin" || user?.role === "super-admin";
  const partnerId = params.id;

  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("campaigns");

  const loadPartner = useCallback(async () => {
    setLoading(true);
    try { setPartner(await partners.admin.get(partnerId)); }
    catch (e) { showApiError(e, "Failed to load partner"); }
    finally { setLoading(false); }
  }, [partnerId]);

  useEffect(() => { loadPartner(); }, [loadPartner]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }
  if (!partner) {
    return <EmptyState icon={Tag} title="Partner not found" description="" />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/partners")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{partner.name}</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {partner.contact_email || "—"} · {partner.contact_phone || "—"}
          </p>
        </div>
        <Badge variant={partner.status === "active" ? "success" : "secondary"}>{partner.status}</Badge>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-[var(--text-muted)]">Total codes</p>
          <p className="mt-1 text-2xl font-bold">{partner.total_codes ?? 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-[var(--text-muted)]">Used codes</p>
          <p className="mt-1 text-2xl font-bold">{partner.used_codes ?? 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-[var(--text-muted)]">Active campaigns</p>
          <p className="mt-1 text-2xl font-bold">{partner.active_campaigns ?? 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-[var(--text-muted)]">Profit share</p>
          <p className="mt-1 text-2xl font-bold">{partner.profit_share_pct.toFixed(1)}%</p>
        </CardContent></Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border-color)]">
        {(["campaigns", "codes", "redemptions"] as TabKey[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors",
              tab === t
                ? "border-indigo-500 text-indigo-700 dark:text-indigo-400"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "campaigns" && <CampaignsTab partnerId={partnerId} isSuperAdmin={isSuperAdmin} onChanged={loadPartner} />}
      {tab === "codes" && <CodesTab partnerId={partnerId} isSuperAdmin={isSuperAdmin} />}
      {tab === "redemptions" && <RedemptionsTab partnerId={partnerId} />}
    </div>
  );
}

// ── Campaigns Tab ────────────────────────────

function CampaignsTab({ partnerId, isSuperAdmin, onChanged }: { partnerId: string; isSuperAdmin: boolean; onChanged: () => void }) {
  const [data, setData] = useState<Paginated<Campaign> | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await partners.admin.campaigns.list(partnerId, { page: 1, page_size: 50 })); }
    catch (e) { showApiError(e, "Failed to load campaigns"); }
    finally { setLoading(false); }
  }, [partnerId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        {isSuperAdmin && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        )}
      </div>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Discount / Max uses</TableHead>
                  <TableHead>Codes</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">CSV</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell><Badge variant="secondary">{c.code_type}</Badge></TableCell>
                    <TableCell className="text-sm">
                      {c.code_type === "discount" ? `${c.discount_pct}%` : `${c.max_uses ?? "∞"} uses each`}
                    </TableCell>
                    <TableCell className="text-sm">{c.total_codes}</TableCell>
                    <TableCell className="text-xs text-[var(--text-muted)]">
                      {c.valid_from ? new Date(c.valid_from).toLocaleDateString() : "—"} → {c.valid_until ? new Date(c.valid_until).toLocaleDateString() : "∞"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.status === "active" ? "success" : "secondary"}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => downloadCsv(c.id, c.name)} aria-label="Export CSV">
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!data?.items.length && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <EmptyState icon={Tag} title="No campaigns" description="Create one to mint codes." />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <CreateCampaignDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        partnerId={partnerId}
        onCreated={() => { load(); onChanged(); }}
      />
    </div>
  );
}

async function downloadCsv(campaignId: string, name: string) {
  try {
    const { body, filename } = await partners.admin.codes.exportCsv(campaignId);
    const blob = new Blob([body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `${name}_codes.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) { showApiError(e, "CSV download failed"); }
}

function CreateCampaignDialog({
  open, onOpenChange, partnerId, onCreated,
}: { open: boolean; onOpenChange: (v: boolean) => void; partnerId: string; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: "",
    code_type: "discount" as CampaignType,
    total_codes: "10",
    discount_pct: "20",
    max_uses: "1",
    prefix: "",
    valid_from: "",
    valid_until: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (form.name.trim().length < 2) { toast.error("Name required"); return; }
    const totalCodes = Number(form.total_codes);
    if (!Number.isInteger(totalCodes) || totalCodes < 1 || totalCodes > 100000) {
      toast.error("total_codes must be 1-100000"); return;
    }
    setSubmitting(true);
    try {
      const payload: Parameters<typeof partners.admin.campaigns.create>[0] = {
        partner_id: partnerId,
        name: form.name.trim(),
        code_type: form.code_type,
        total_codes: totalCodes,
        prefix: form.prefix.trim() || undefined,
        valid_from: form.valid_from || undefined,
        valid_until: form.valid_until || undefined,
      };
      if (form.code_type === "discount") {
        payload.discount_pct = Number(form.discount_pct);
        if (!payload.discount_pct || payload.discount_pct < 1 || payload.discount_pct > 100) {
          toast.error("discount_pct must be 1-100"); setSubmitting(false); return;
        }
      } else {
        payload.max_uses = Number(form.max_uses);
        if (!payload.max_uses || payload.max_uses < 1) {
          toast.error("max_uses must be ≥ 1"); setSubmitting(false); return;
        }
      }
      const created = await partners.admin.campaigns.create(payload);
      toast.success(`Campaign created. Minted ${created.minted} codes.`);
      onOpenChange(false);
      onCreated();
      // Auto-download CSV right after creation
      downloadCsv(created.id, created.name);
    } catch (e) { showApiError(e, "Failed to create campaign"); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Campaign</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Name *</label>
            <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium">Type *</label>
            <Select value={form.code_type} onValueChange={(v) => setForm(f => ({ ...f, code_type: v as CampaignType }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="discount">Discount (%)</SelectItem>
                <SelectItem value="free">Free (full waiver)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.code_type === "discount" ? (
            <div>
              <label className="text-sm font-medium">Discount % *</label>
              <Input type="number" min="1" max="100" value={form.discount_pct}
                onChange={(e) => setForm(f => ({ ...f, discount_pct: e.target.value }))} />
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium">Max uses per code *</label>
              <Input type="number" min="1" value={form.max_uses}
                onChange={(e) => setForm(f => ({ ...f, max_uses: e.target.value }))} />
              <p className="mt-1 text-xs text-[var(--text-muted)]">For free codes, you can allow multiple users to redeem the same code.</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Total codes *</label>
              <Input type="number" min="1" max="100000" value={form.total_codes}
                onChange={(e) => setForm(f => ({ ...f, total_codes: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Prefix</label>
              <Input value={form.prefix} onChange={(e) => setForm(f => ({ ...f, prefix: e.target.value.toUpperCase() }))} placeholder="EDX2025" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Valid from</label>
              <Input type="date" value={form.valid_from} onChange={(e) => setForm(f => ({ ...f, valid_from: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Valid until</label>
              <Input type="date" value={form.valid_until} onChange={(e) => setForm(f => ({ ...f, valid_until: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button className="flex-1" onClick={submit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mint codes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Codes Tab ────────────────────────────────

function CodesTab({ partnerId, isSuperAdmin }: { partnerId: string; isSuperAdmin: boolean }) {
  const [data, setData] = useState<Paginated<PromoCode> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"all" | PromoCodeStatus>("all");
  const [revokeTarget, setRevokeTarget] = useState<PromoCode | null>(null);
  const [revoking, setRevoking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await partners.admin.codes.list({
        partner_id: partnerId,
        status: statusFilter === "all" ? undefined : statusFilter,
        page, page_size: 50,
      }));
    } catch (e) { showApiError(e, "Failed to load codes"); }
    finally { setLoading(false); }
  }, [partnerId, page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await partners.admin.codes.revoke(revokeTarget.id);
      toast.success("Code revoked");
      setRevokeTarget(null);
      load();
    } catch (e) { showApiError(e, "Failed to revoke"); }
    finally { setRevoking(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="reserved">Reserved</SelectItem>
            <SelectItem value="used">Used</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Used by</TableHead>
                  <TableHead>Used at</TableHead>
                  {isSuperAdmin && <TableHead className="text-right">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-sm">{c.code}</TableCell>
                    <TableCell><Badge variant={c.status === "used" ? "indigo" : c.status === "active" ? "success" : "secondary"}>{c.status}</Badge></TableCell>
                    <TableCell className="text-sm">{c.used_by_username || "—"}</TableCell>
                    <TableCell className="text-xs text-[var(--text-muted)]">{c.used_at ? new Date(c.used_at).toLocaleString() : "—"}</TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-right">
                        {(c.status === "active" || c.status === "reserved") && (
                          <Button variant="ghost" size="icon" onClick={() => setRevokeTarget(c)} className="text-red-600" aria-label="Revoke">
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {!data?.items.length && (
                  <TableRow>
                    <TableCell colSpan={isSuperAdmin ? 5 : 4}>
                      <EmptyState icon={ClipboardList} title="No codes" description="" />
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
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</Button>
            <Button variant="outline" size="sm" disabled={page >= data.total_pages} onClick={() => setPage(p => p + 1)}>›</Button>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(open) => { if (!open) setRevokeTarget(null); }}
        title="Revoke code"
        description={`Revoke code ${revokeTarget?.code}? It can no longer be redeemed.`}
        confirmLabel="Revoke"
        variant="destructive"
        onConfirm={handleRevoke}
        loading={revoking}
      />
    </div>
  );
}

// ── Redemptions Tab ──────────────────────────

function RedemptionsTab({ partnerId }: { partnerId: string }) {
  const [data, setData] = useState<Paginated<Redemption> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { setData(await partners.admin.redemptions.list({ partner_id: partnerId, page, page_size: 50 })); }
      catch (e) { showApiError(e, "Failed to load redemptions"); }
      finally { setLoading(false); }
    })();
  }, [partnerId, page]);

  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Test</TableHead>
                <TableHead className="text-right">Original</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Discount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-[var(--text-muted)]">{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-sm">{r.code}</TableCell>
                  <TableCell className="text-sm">{r.username || r.user_id.slice(0, 8)}</TableCell>
                  <TableCell className="text-sm">{r.test_title || "—"}</TableCell>
                  <TableCell className="text-right text-sm">{r.amount_original.toLocaleString()} {r.currency}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{r.amount_paid.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-sm text-emerald-600">−{r.amount_discounted.toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {!data?.items.length && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState icon={Receipt} title="No redemptions yet" description="" />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between p-3 text-sm text-[var(--text-muted)]">
            <span>Page {data.page} of {data.total_pages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</Button>
              <Button variant="outline" size="sm" disabled={page >= data.total_pages} onClick={() => setPage(p => p + 1)}>›</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
