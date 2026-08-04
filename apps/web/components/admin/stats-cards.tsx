import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AdminStats } from "@/lib/types";

const numberFormatter = new Intl.NumberFormat("en-US");

const ACCENT_CLASS = [
  "before:bg-(--chart-1)",
  "before:bg-(--chart-2)",
  "before:bg-(--chart-3)",
  "before:bg-(--chart-4)",
] as const;

function StatCard({
  label,
  value,
  accentIndex,
}: {
  label: string;
  value: number;
  accentIndex: number;
}) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1",
        ACCENT_CLASS[accentIndex % ACCENT_CLASS.length]
      )}
    >
      <CardHeader>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight">{numberFormatter.format(value)}</p>
      </CardContent>
    </Card>
  );
}

export function StatsCards({ stats }: { stats: AdminStats }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total clients" value={stats.total_clients} accentIndex={0} />
      <StatCard label="Total inspection events" value={stats.total_inspection_events} accentIndex={1} />
      <StatCard label="Total leads" value={stats.total_leads} accentIndex={2} />
      <StatCard label="Pending review queue" value={stats.pending_review_queue} accentIndex={3} />
    </div>
  );
}

export function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-3 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-7 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
