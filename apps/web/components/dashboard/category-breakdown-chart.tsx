"use client";

import { Cell, Pie, PieChart } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
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

export function CategoryBreakdownChart({
  data,
  loading,
}: {
  data: CategoryCount[];
  loading: boolean;
}) {
  const chartConfig = Object.fromEntries(
    data.map((c, i) => [
      c.category,
      { label: capitalize(c.category), color: categoryColor(c.category, i) },
    ])
  ) satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Leads by category</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : data.length === 0 ? (
          <div className="flex h-64 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-center">
            <p className="text-sm font-medium">Not enough data yet</p>
            <p className="text-sm text-muted-foreground">Categories will appear as leads come in.</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="mx-auto aspect-auto h-64 w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="category" hideLabel />} />
              <Pie
                data={data}
                dataKey="count"
                nameKey="category"
                innerRadius={55}
                outerRadius={90}
                strokeWidth={2}
                stroke="var(--card)"
              >
                {data.map((entry, i) => (
                  <Cell key={entry.category} fill={categoryColor(entry.category, i)} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="category" />} />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
