"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { payments, showApiError, type Order, type OrderStatus, type Paginated } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Loader2, ChevronLeft, ChevronRight, Eye, RefreshCw, Ban, Undo2, CheckCircle2, CreditCard, Search, X,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

type StatusFilter = "all" | OrderStatus;

const STATUS_VARIANTS: Record<OrderStatus, "secondary" | "success" | "destructive"> = {
  pending:   "secondary",
  paid:      "success",
  cancelled: "destructive",
  refunded:  "destructive",
  failed:    "destructive",
};

function formatDate(s?: string) {
  if (!s) return "—";
  return new Date(s).toLocaleString();
}

export default function PaymentsPage() {
  const [data, setData] = useState<Paginated<Order> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [userIdFilter, setUserIdFilter] = useState("");
  const [testIdFilter, setTestIdFilter] = useState("");
  const [orderIdInput, setOrderIdInput] = useState("");
  const [orderIdFilter, setOrderIdFilter] = useState("");

  const [viewOrder, setViewOrder] = useState<Order | null>(null);

  // Action state — keyed by order id so the right row spinner shows.
  const [actingId, setActingId] = useState<string | null>(null);
  const [loadingViewId, setLoadingViewId] = useState<string | null>(null);

  // Confirm dialogs (cancel / refund / mark-paid all share the same shape).
  type ActionKind = "cancel" | "refund" | "mark-paid";
  const [confirm, setConfirm] = useState<{ kind: ActionKind; order: Order } | null>(null);
  const [confirmNote, setConfirmNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (orderIdFilter) {
        const order = await payments.admin.get(orderIdFilter);
        const statusMatch = statusFilter === "all" || order.status === statusFilter;
        const userMatch = !userIdFilter.trim() || order.user_id === userIdFilter.trim();
        const testMatch = !testIdFilter.trim() || order.test_id === testIdFilter.trim();
        const items = statusMatch && userMatch && testMatch ? [order] : [];
        setData({ items, total: items.length, page: 1, page_size: 20, total_pages: 1 });
      } else {
        const params: Record<string, string | number> = { page, page_size: 20 };
        if (statusFilter !== "all") params.status = statusFilter;
        if (userIdFilter.trim()) params.user_id = userIdFilter.trim();
        if (testIdFilter.trim()) params.test_id = testIdFilter.trim();
        setData(await payments.admin.list(params));
      }
    } catch (e) {
      if (orderIdFilter) {
        setData({ items: [], total: 0, page: 1, page_size: 20, total_pages: 1 });
      }
      showApiError(e, "Failed to load orders");
    } finally { setLoading(false); }
  }, [page, statusFilter, userIdFilter, testIdFilter, orderIdFilter]);

  useEffect(() => { load(); }, [load]);

  const handleRecheck = async (o: Order) => {
    setActingId(o.id);
    try {
      const res = await payments.admin.recheck(o.id);
      toast.success(res.paid_now ? "Payment confirmed — order marked paid" : "No new payment found");
      load();
    } catch (e) { showApiError(e, "Failed to recheck"); }
    finally { setActingId(null); }
  };

  const handleView = async (o: Order) => {
    setLoadingViewId(o.id);
    try {
      const full = await payments.admin.get(o.id);
      setViewOrder(full);
    } catch (e) {
      showApiError(e, "Failed to load order details");
    } finally {
      setLoadingViewId(null);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirm) return;
    const { kind, order } = confirm;
    setActingId(order.id);
    try {
      if (kind === "cancel")    await payments.admin.cancel(order.id, confirmNote || undefined);
      if (kind === "refund")    await payments.admin.refund(order.id, confirmNote || undefined);
      if (kind === "mark-paid") await payments.admin.markPaid(order.id, confirmNote || undefined);
      toast.success(
        kind === "cancel"    ? "Order cancelled" :
        kind === "refund"    ? "Order refunded"  :
                               "Order marked paid"
      );
      setConfirm(null);
      setConfirmNote("");
      load();
    } catch (e) {
      showApiError(
        e,
        kind === "cancel" ? "Failed to cancel" : kind === "refund" ? "Failed to refund" : "Failed to mark paid"
      );
    } finally { setActingId(null); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Payments</h1>
        <p className="text-sm text-[var(--text-muted)]">{data?.total ?? 0} total orders</p>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusFilter); setPage(1); }}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Input
            className="w-60"
            placeholder="Filter by user_id"
            value={userIdFilter}
            onChange={e => { setUserIdFilter(e.target.value); setPage(1); }}
          />
          <Input
            className="w-60"
            placeholder="Filter by test_id"
            value={testIdFilter}
            onChange={e => { setTestIdFilter(e.target.value); setPage(1); }}
          />
          <Button variant="outline" onClick={() => load()}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setStatusFilter("all");
              setUserIdFilter("");
              setTestIdFilter("");
              setOrderIdInput("");
              setOrderIdFilter("");
              setPage(1);
            }}
          >
            <X className="h-4 w-4" /> Clear
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            className="w-80"
            placeholder="Exact order_id"
            value={orderIdInput}
            onChange={(e) => setOrderIdInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setOrderIdFilter(orderIdInput.trim());
                setPage(1);
              }
            }}
          />
          <Button
            variant="outline"
            onClick={() => {
              setOrderIdFilter(orderIdInput.trim());
              setPage(1);
            }}
          >
            <Search className="h-4 w-4" /> Find order
          </Button>
          {orderIdFilter && (
            <Button
              variant="ghost"
              onClick={() => {
                setOrderIdInput("");
                setOrderIdFilter("");
                setPage(1);
              }}
            >
              <X className="h-4 w-4" /> Exit exact search
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
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
                  <TableHead>Test</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="text-[var(--text-primary)]">
                      <div className="font-medium">{o.test_title ?? "—"}</div>
                      <div className="text-xs text-[var(--text-muted)]">{o.test_id}</div>
                    </TableCell>
                    <TableCell className="text-xs text-[var(--text-muted)]">{o.user_id}</TableCell>
                    <TableCell className="text-[var(--text-secondary)]">
                      {o.amount.toLocaleString()} {o.currency}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[o.status]} className="capitalize">{o.status}</Badge>
                      {o.manual && o.status === "paid" && (
                        <span className="ml-1.5 text-[10px] text-[var(--text-muted)]">manual</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--text-muted)]">{formatDate(o.created_at)}</TableCell>
                    <TableCell className="text-xs text-[var(--text-muted)]">{formatDate(o.paid_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="View order"
                          onClick={() => handleView(o)}
                          disabled={loadingViewId === o.id}
                        >
                          {loadingViewId === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        {o.status === "pending" && (
                          <>
                            <Button
                              variant="ghost" size="icon"
                              aria-label="Recheck payment"
                              onClick={() => handleRecheck(o)}
                              disabled={actingId === o.id}
                            >
                              {actingId === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              aria-label="Mark paid manually"
                              className="text-emerald-400 hover:bg-emerald-950/30"
                              onClick={() => { setConfirm({ kind: "mark-paid", order: o }); setConfirmNote(""); }}
                              disabled={actingId === o.id}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              aria-label="Cancel order"
                              className="text-amber-400 hover:bg-amber-950/30"
                              onClick={() => { setConfirm({ kind: "cancel", order: o }); setConfirmNote(""); }}
                              disabled={actingId === o.id}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {o.status === "paid" && (
                          <Button
                            variant="ghost" size="icon"
                            aria-label="Refund order"
                            className="text-red-500 hover:bg-red-950/40"
                            onClick={() => { setConfirm({ kind: "refund", order: o }); setConfirmNote(""); }}
                            disabled={actingId === o.id}
                          >
                            <Undo2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!data?.items.length && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <EmptyState
                        icon={CreditCard}
                        title="No orders found"
                        description="Try adjusting your filters"
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && !orderIdFilter && data.total_pages > 1 && (
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

      {/* View detail */}
      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order detail</DialogTitle>
          </DialogHeader>
          {viewOrder && (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant={STATUS_VARIANTS[viewOrder.status]} className="capitalize">{viewOrder.status}</Badge>
                {viewOrder.manual && <Badge variant="secondary">Manual</Badge>}
              </div>

              <Field label="Order ID"     value={viewOrder.id} />
              <Field label="User"         value={viewOrder.user_id} />
              <Field label="Test"         value={`${viewOrder.test_title ?? "—"} (${viewOrder.test_id})`} />
              <Field label="Amount"       value={`${viewOrder.amount.toLocaleString()} ${viewOrder.currency}`} />
              <Field label="QPay invoice" value={viewOrder.qpay_invoice_id ?? "—"} />
              <Field label="QPay payment" value={viewOrder.qpay_payment_id ?? "—"} />
              <Field label="Created"      value={formatDate(viewOrder.created_at)} />
              <Field label="Paid"         value={formatDate(viewOrder.paid_at)} />
              <Field label="Cancelled"    value={formatDate(viewOrder.cancelled_at)} />
              <Field label="Refunded"     value={formatDate(viewOrder.refunded_at)} />

              {viewOrder.manual_note && (
                <Field label="Manual note" value={viewOrder.manual_note} />
              )}

              {viewOrder.invoice?.qr_image && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">QR code</p>
                  {/* QPay returns base64 PNG without prefix */}
                  <img
                    alt="QPay QR"
                    src={
                      viewOrder.invoice.qr_image.startsWith("data:")
                        ? viewOrder.invoice.qr_image
                        : `data:image/png;base64,${viewOrder.invoice.qr_image}`
                    }
                    className="h-48 w-48 rounded border border-[var(--border-color)] bg-white p-2"
                  />
                </div>
              )}

              {viewOrder.invoice?.urls && viewOrder.invoice.urls.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">Bank deeplinks</p>
                  <div className="flex flex-wrap gap-2">
                    {viewOrder.invoice.urls.map((u, i) => (
                      <a
                        key={i}
                        href={u.link}
                        target="_blank" rel="noreferrer"
                        className="rounded border border-[var(--border-color)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                      >
                        {u.name ?? "Open"}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm cancel/refund/mark-paid */}
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => { if (!open) { setConfirm(null); setConfirmNote(""); } }}
        title={
          confirm?.kind === "cancel"    ? "Cancel order" :
          confirm?.kind === "refund"    ? "Refund order" :
                                          "Mark order paid"
        }
        description={
          confirm?.kind === "cancel"
            ? `Cancel pending order for "${confirm.order.test_title ?? confirm.order.test_id}"? The QPay invoice will also be cancelled.`
          : confirm?.kind === "refund"
            ? `Refund "${confirm.order.test_title ?? confirm.order.test_id}" (${confirm.order.amount.toLocaleString()} ${confirm.order.currency}) via QPay?`
            : `Mark order for "${confirm?.order.test_title ?? confirm?.order.test_id}" as paid without QPay (e.g. cash / bank transfer)?`
        }
        confirmLabel={
          confirm?.kind === "cancel"    ? "Cancel order" :
          confirm?.kind === "refund"    ? "Refund"        :
                                          "Mark paid"
        }
        variant={confirm?.kind === "mark-paid" ? "default" : "destructive"}
        onConfirm={handleConfirmAction}
        loading={!!confirm && actingId === confirm.order.id}
      >
        <Input
          placeholder="Optional note (audit trail)"
          value={confirmNote}
          onChange={e => setConfirmNote(e.target.value)}
        />
      </ConfirmDialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2 border-b border-[var(--border-color)] pb-1 last:border-b-0">
      <span className="text-xs font-medium text-[var(--text-muted)]">{label}</span>
      <span className="text-xs text-[var(--text-secondary)] break-all">{value}</span>
    </div>
  );
}
