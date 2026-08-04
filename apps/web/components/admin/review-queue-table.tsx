import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminReviewQueueItem } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dateFormatter.format(d);
}

function formatConfidence(value: number | null) {
  if (value === null || value === undefined) return "—";
  const pct = value <= 1 ? value * 100 : value;
  return `${Math.round(pct)}%`;
}

export function ReviewQueueTable({ items }: { items: AdminReviewQueueItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed py-12 text-center">
        <p className="text-sm font-medium">Nothing pending review</p>
        <p className="text-sm text-muted-foreground">
          Flagged violations that need a human look will show up here.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Business</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Confidence</TableHead>
          <TableHead>Flagged</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium whitespace-normal">{item.business_name}</TableCell>
            <TableCell>
              <Badge variant="outline" className="font-normal capitalize">
                {item.category}
              </Badge>
            </TableCell>
            <TableCell className="max-w-xs">
              <span
                className="block max-w-xs truncate"
                title={item.description_raw ?? undefined}
              >
                {item.description_raw ?? "—"}
              </span>
            </TableCell>
            <TableCell>{formatConfidence(item.ai_confidence)}</TableCell>
            <TableCell className="text-muted-foreground">{formatDate(item.created_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
