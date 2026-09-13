import { Skeleton } from "@/components/ui/skeleton";
import type { MeStats } from "@/lib/types";

function topCategory(stats: MeStats): string | null {
  if (stats.by_category.length === 0) return null;
  const top = stats.by_category.reduce((max, c) => (c.count > max.count ? c : max));
  return top.category;
}

function capitalize(value: string): string {
  return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);
}

const STRIP_CLASS =
  "grid grid-cols-1 divide-y divide-foreground/15 border border-foreground/15 bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0";

function StatCell({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-4 px-5 py-5">
      <span className="eyebrow flex items-center gap-2 text-muted-foreground">
        {accent && <span aria-hidden className="size-1.5 bg-primary" />}
        {label}
      </span>
      <span className="headline truncate text-4xl tabular-nums sm:text-5xl">{value}</span>
    </div>
  );
}

export function StatsCards({ stats, loading }: { stats: MeStats | null; loading: boolean }) {
  if (loading || !stats) {
    return (
      <div className={STRIP_CLASS}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-4 px-5 py-5">
            <Skeleton className="h-4 w-24 rounded-none" />
            <Skeleton className="h-10 w-20 rounded-none" />
          </div>
        ))}
      </div>
    );
  }

  const top = topCategory(stats);

  return (
    <div className={STRIP_CLASS}>
      <StatCell label="Total leads" value={stats.total_leads.toLocaleString()} />
      <StatCell label="Leads this week" value={stats.leads_last_7_days.toLocaleString()} accent />
      <StatCell label="Top category" value={top ? capitalize(top) : "—"} />
    </div>
  );
}
