import type { LucideIcon } from "lucide-react";
import { Award, CalendarClock, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
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

function StatCard({
  label,
  value,
  icon: Icon,
  accentClassName,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accentClassName: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${accentClassName}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-2xl font-semibold tabular-nums">{value}</span>
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsCards({ stats, loading }: { stats: MeStats | null; loading: boolean }) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const top = topCategory(stats);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        label="Total leads"
        value={stats.total_leads.toLocaleString()}
        icon={TrendingUp}
        accentClassName="bg-chart-1/10 text-chart-1"
      />
      <StatCard
        label="Leads this week"
        value={stats.leads_last_7_days.toLocaleString()}
        icon={CalendarClock}
        accentClassName="bg-chart-2/10 text-chart-2"
      />
      <StatCard
        label="Top category"
        value={top ? capitalize(top) : "—"}
        icon={Award}
        accentClassName="bg-chart-4/10 text-chart-4"
      />
    </div>
  );
}
