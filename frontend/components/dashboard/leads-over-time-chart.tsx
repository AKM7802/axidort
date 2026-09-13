"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, Panel } from "@/components/dashboard/panel";
import type { WeeklyCount } from "@/lib/types";

function formatWeekLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const chartConfig = {
  count: {
    label: "Leads",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function LeadsOverTimeChart({
  data,
  loading,
}: {
  data: WeeklyCount[];
  loading: boolean;
}) {
  return (
    <Panel title="Leads over time" className="h-full">
      {loading ? (
        <Skeleton className="h-64 w-full rounded-none" />
      ) : data.length < 2 ? (
        <EmptyState
          className="h-64"
          title="Not enough data yet"
          description="Check back after a few weeks of leads."
        />
      ) : (
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-64 w-full font-mono [&_.recharts-cartesian-axis-tick_text]:text-[11px]"
        >
          <BarChart data={data} margin={{ left: 0, right: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="week_start"
              tickLine={false}
              axisLine={{ stroke: "var(--foreground)", strokeOpacity: 0.6 }}
              tickMargin={8}
              tickFormatter={formatWeekLabel}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} allowDecimals={false} />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => formatWeekLabel(String(value))}
                />
              }
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={[1, 1, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ChartContainer>
      )}
    </Panel>
  );
}
