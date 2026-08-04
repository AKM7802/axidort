"use client";

import { Cell, Pie, PieChart } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { CategoryCount } from "@/lib/types";

// Fixed identity -> color mapping, independent of count/rank, so a category
// keeps the same color no matter how the data sorts. Anything outside this
// known set folds into "other".
const CATEGORY_ORDER = ["pest", "sanitation", "equipment", "plumbing", "temperature", "other"];

const chartConfig = {
  pest: { label: "Pest", color: "var(--chart-1)" },
  sanitation: { label: "Sanitation", color: "var(--chart-2)" },
  equipment: { label: "Equipment", color: "var(--chart-3)" },
  plumbing: { label: "Plumbing", color: "var(--chart-4)" },
  temperature: { label: "Temperature", color: "var(--chart-5)" },
  other: { label: "Other", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

function normalizeData(data: CategoryCount[]) {
  const known = new Map<string, number>();
  let other = 0;

  for (const item of data) {
    const key = item.category?.toLowerCase();
    if (key && CATEGORY_ORDER.includes(key) && key !== "other") {
      known.set(key, (known.get(key) ?? 0) + item.count);
    } else {
      other += item.count;
    }
  }

  const rows = CATEGORY_ORDER.filter((key) => key !== "other")
    .map((key) => ({ category: key, count: known.get(key) ?? 0 }))
    .filter((row) => row.count > 0);

  if (other > 0) {
    rows.push({ category: "other", count: other });
  }

  return rows;
}

export function CategoryBreakdownChart({ data }: { data: CategoryCount[] }) {
  const rows = normalizeData(data);
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const hasData = rows.length > 0 && total > 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Leads by category</CardTitle>
        <CardDescription>System-wide violation category mix</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer config={chartConfig} className="mx-auto aspect-auto h-64 w-full">
            <PieChart>
              <ChartTooltip
                content={<ChartTooltipContent nameKey="category" hideLabel />}
              />
              <Pie
                data={rows}
                dataKey="count"
                nameKey="category"
                innerRadius={56}
                outerRadius={88}
                strokeWidth={2}
                stroke="var(--card)"
              >
                {rows.map((row) => (
                  <Cell key={row.category} fill={`var(--color-${row.category})`} />
                ))}
              </Pie>
              <ChartLegend
                content={<ChartLegendContent nameKey="category" />}
                verticalAlign="bottom"
              />
            </PieChart>
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

export function CategoryBreakdownChartSkeleton() {
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
