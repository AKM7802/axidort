"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { WeeklyCount } from "@/lib/types";

const weekFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function formatWeek(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : weekFormatter.format(date);
}

const chartConfig = {
  count: {
    label: "New clients",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function ClientsGrowthChart({ data }: { data: WeeklyCount[] }) {
  const hasData = data.length >= 2;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Client growth</CardTitle>
        <CardDescription>New client signups per week</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
            <BarChart data={data} margin={{ left: 0, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="week_start"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={formatWeek}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={32}
                allowDecimals={false}
              />
              <ChartTooltip
                cursor={{ fill: "var(--muted)" }}
                content={<ChartTooltipContent labelFormatter={(value) => formatWeek(String(value))} />}
              />
              <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">Not enough data yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ClientsGrowthChartSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}
