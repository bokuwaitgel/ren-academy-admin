"use client";

import { useEffect, useState } from "react";
import { partners, showApiError, type PartnerSummary } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Tag, ClipboardList, Receipt, Wallet } from "lucide-react";

export default function PartnerOverviewPage() {
  const [data, setData] = useState<PartnerSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setData(await partners.portal.summary()); }
      catch (e) { showApiError(e, "Failed to load summary"); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }
  if (!data) return null;

  const fmt = (n: number) => n.toLocaleString();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">{data.partner.name}</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Profit share: <Badge variant="indigo">{data.partner.profit_share_pct.toFixed(1)}%</Badge>
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">Code inventory</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard icon={Tag} label="Active campaigns" value={fmt(data.totals.campaigns_active)} />
          <StatCard icon={ClipboardList} label="Codes total" value={fmt(data.totals.codes_total)} />
          <StatCard icon={ClipboardList} label="Codes used" value={fmt(data.totals.codes_used)} accent="indigo" />
          <StatCard icon={ClipboardList} label="Codes active" value={fmt(data.totals.codes_active)} accent="emerald" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">Month to date</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard icon={Receipt} label="Redemptions" value={fmt(data.mtd.redemptions)} />
          <StatCard icon={Wallet} label="Gross sales" value={`${fmt(data.mtd.gross)} ${data.mtd.currency}`} />
          <StatCard icon={Wallet} label="Discount given" value={`−${fmt(data.mtd.discount)} ${data.mtd.currency}`} accent="emerald" />
          <StatCard icon={Wallet} label="Estimated payout" value={`${fmt(data.mtd.payout)} ${data.mtd.currency}`} accent="indigo" />
        </div>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Payout is calculated as paid revenue × profit share ({data.partner.profit_share_pct.toFixed(1)}%).
          Final amount is reconciled at month end.
        </p>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, accent,
}: { icon: React.ElementType; label: string; value: string; accent?: "indigo" | "emerald" }) {
  const ring = accent === "indigo"
    ? "ring-1 ring-indigo-500/20"
    : accent === "emerald" ? "ring-1 ring-emerald-500/20" : "";
  return (
    <Card className={ring}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <Icon className="h-4 w-4" />
          <span className="text-xs uppercase tracking-wide">{label}</span>
        </div>
        <p className="mt-2 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
