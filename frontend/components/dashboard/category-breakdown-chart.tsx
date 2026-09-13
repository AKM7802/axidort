import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, Panel } from "@/components/dashboard/panel";
import type { CategoryCount } from "@/lib/types";

const CATEGORY_ORDER = ["pest", "sanitation", "equipment", "plumbing", "temperature"];

function categoryColor(category: string, fallbackIndex: number): string {
  const idx = CATEGORY_ORDER.indexOf(category);
  if (idx >= 0) return `var(--chart-${idx + 1})`;
  if (category === "other") return "var(--muted-foreground)";
  return `var(--chart-${(fallbackIndex % 5) + 1})`;
}

function capitalize(value: string): string {
  return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);
}

/** Ranked horizontal bars — easier to compare than a donut, and each row
 * carries its exact count and share. */
export function CategoryBreakdownChart({
  data,
  loading,
}: {
  data: CategoryCount[];
  loading: boolean;
}) {
  const total = data.reduce((sum, c) => sum + c.count, 0);
  const max = data.reduce((m, c) => Math.max(m, c.count), 0);
  const rows = data
    .map((c, i) => ({ ...c, color: categoryColor(c.category, i) }))
    .sort((a, b) => b.count - a.count);

  return (
    <Panel title="Leads by category" className="h-full">
      {loading ? (
        <Skeleton className="h-64 w-full rounded-none" />
      ) : data.length === 0 ? (
        <EmptyState
          className="h-64"
          title="Not enough data yet"
          description="Categories will appear as leads come in."
        />
      ) : (
        <ul className="flex min-h-64 flex-col justify-center gap-4">
          {rows.map((row) => (
            <li key={row.category}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium">{capitalize(row.category)}</span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {row.count.toLocaleString()}
                  <span className="ml-2 text-foreground/40">
                    {total > 0 ? Math.round((row.count / total) * 100) : 0}%
                  </span>
                </span>
              </div>
              <div className="mt-1.5 h-2 bg-foreground/[0.06]">
                <div
                  className="h-full"
                  style={{ width: `${max > 0 ? (row.count / max) * 100 : 0}%`, background: row.color }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
