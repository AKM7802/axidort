"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Leads over time</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : data.length < 2 ? (
          <div className="flex h-64 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-center">
            <p className="text-sm font-medium">Not enough data yet</p>
            <p className="text-sm text-muted-foreground">Check back after a few weeks of leads.</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
            <BarChart data={data} margin={{ left: 0, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="week_start"
                tickLine={false}
                axisLine={false}
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
              <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
