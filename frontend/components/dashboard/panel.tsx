import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Flat, ruled container for dashboard sections — a titled block on the
 * page rather than a floating rounded card. */
export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("border border-foreground/15 bg-card", className)}>
      <header className="flex min-h-11 items-center justify-between gap-3 border-b border-foreground/15 px-5 py-2.5">
        <h2 className="eyebrow font-medium text-foreground">{title}</h2>
        {action}
      </header>
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Dashed placeholder used for empty chart/table states. */
export function EmptyState({ title, description, className }: { title: string; description: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-1 border border-dashed border-foreground/25 text-center",
        className,
      )}
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
