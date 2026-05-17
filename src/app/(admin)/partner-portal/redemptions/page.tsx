"use client";

import { useCallback, useEffect, useState } from "react";
import { partners, showApiError, type Redemption, type Paginated } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Loader2, Receipt } from "lucide-react";

export default function PartnerRedemptionsPage() {
  const [data, setData] = useState<Paginated<Redemption> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await partners.portal.redemptions({ page, page_size: 50 })); }
    catch (e) { showApiError(e, "Failed to load redemptions"); }
    finally { setLoading(false); }
  }, [page]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Redemptions</h1>
        <p className="text-sm text-[var(--text-muted)]">{data?.total ?? 0} events. User contact info is masked.</p>
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
                    <TableCell className="text-sm">{r.username || "—"}</TableCell>
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
