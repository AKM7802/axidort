import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Lead } from "@/lib/types";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function truncate(text: string | null, max: number): string {
  if (!text) return "—";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

function uniqueCategories(lead: Lead): string[] {
  const seen = new Set<string>();
  for (const v of lead.inspection_event.violations) {
    seen.add(v.category);
  }
  return Array.from(seen);
}

function LeadsTableSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function LeadsTable({
  leads,
  loading,
  subscribedCategories,
}: {
  leads: Lead[];
  loading: boolean;
  subscribedCategories: Set<string>;
}) {
  if (loading) {
    return <LeadsTableSkeleton />;
  }

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed py-16 text-center">
        <p className="text-sm font-medium">No leads yet</p>
        <p className="text-sm text-muted-foreground">Check back soon.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead>Business</TableHead>
            <TableHead>Inspection Date</TableHead>
            <TableHead>Result</TableHead>
            <TableHead>Categories</TableHead>
            <TableHead>Issue</TableHead>
            <TableHead>Matched</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => {
            const event = lead.inspection_event;
            const locationParts = [event.address_line, event.municipality].filter(Boolean);
            return (
              <TableRow key={lead.id}>
                <TableCell className="whitespace-normal">
                  <div className="font-medium">{event.business_name}</div>
                  {locationParts.length > 0 && (
                    <div className="text-xs text-muted-foreground">{locationParts.join(", ")}</div>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDate(event.inspection_date)}
                </TableCell>
                <TableCell className="whitespace-nowrap">{event.result ?? "—"}</TableCell>
                <TableCell className="whitespace-normal">
                  <div className="flex flex-wrap gap-1">
                    {uniqueCategories(lead).length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      uniqueCategories(lead).map((category) => {
                        const isSubscribed = subscribedCategories.has(category);
                        return isSubscribed ? (
                          <Badge key={category} variant="secondary">
                            {category}
                          </Badge>
                        ) : (
                          <Badge
                            key={category}
                            variant="outline"
                            className="border-dashed text-muted-foreground/70"
                            title="Also cited on this inspection, outside your subscribed categories"
                          >
                            {category}
                          </Badge>
                        );
                      })
                    )}
                  </div>
                </TableCell>
                <TableCell
                  className="max-w-xs truncate whitespace-normal text-muted-foreground"
                  title={event.narration ?? undefined}
                >
                  {truncate(event.narration, 120)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDate(lead.matched_at)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
