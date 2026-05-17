"use client";

import { useEffect, useState, useCallback } from "react";
import { partners, showApiError, type Campaign, type Paginated } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Loader2, Tag, Download } from "lucide-react";

export default function PartnerCampaignsPage() {
  const [data, setData] = useState<Paginated<Campaign> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await partners.portal.campaigns({ page: 1, page_size: 50 })); }
    catch (e) { showApiError(e, "Failed to load campaigns"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleExport = async (id: string, name: string) => {
    try {
      const { body, filename } = await partners.portal.codesExport(id);
      const blob = new Blob([body], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || `${name}_codes.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { showApiError(e, "Download failed"); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">My campaigns</h1>
        <p className="text-sm text-[var(--text-muted)]">{data?.total ?? 0} total</p>
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
                      <Button variant="ghost" size="icon" onClick={() => handleExport(c.id, c.name)} aria-label="Export CSV">
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!data?.items.length && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <EmptyState icon={Tag} title="No campaigns" description="Contact your account manager to set up a campaign." />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
