"use client";

import { useCallback, useEffect, useState } from "react";
import { partners, showApiError, type PromoCode, type PromoCodeStatus, type Paginated } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Loader2, ClipboardList } from "lucide-react";

export default function PartnerCodesPage() {
  const [data, setData] = useState<Paginated<PromoCode> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"all" | PromoCodeStatus>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await partners.portal.codes({
        status: statusFilter === "all" ? undefined : statusFilter,
        page, page_size: 50,
      }));
    } catch (e) { showApiError(e, "Failed to load codes"); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">My codes</h1>
          <p className="text-sm text-[var(--text-muted)]">{data?.total ?? 0} codes</p>
        </div>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-sm">{c.code}</TableCell>
                    <TableCell><Badge variant={c.status === "used" ? "indigo" : c.status === "active" ? "success" : "secondary"}>{c.status}</Badge></TableCell>
                    <TableCell className="text-sm">{c.used_by_username || "—"}</TableCell>
                    <TableCell className="text-xs text-[var(--text-muted)]">{c.used_at ? new Date(c.used_at).toLocaleString() : "—"}</TableCell>
                  </TableRow>
                ))}
                {!data?.items.length && (
                  <TableRow>
                    <TableCell colSpan={4}>
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
    </div>
  );
}
