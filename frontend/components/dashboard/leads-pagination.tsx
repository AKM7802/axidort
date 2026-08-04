import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function LeadsPagination({
  total,
  limit,
  offset,
  disabled,
  onPrevious,
  onNext,
}: {
  total: number;
  limit: number;
  offset: number;
  disabled?: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (total === 0) return null;

  const start = offset + 1;
  const end = Math.min(offset + limit, total);
  const hasPrevious = offset > 0;
  const hasNext = offset + limit < total;

  return (
    <div className="flex items-center justify-between gap-4 pt-1">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{start}–{end}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span>
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevious}
          disabled={disabled || !hasPrevious}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={onNext} disabled={disabled || !hasNext}>
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
