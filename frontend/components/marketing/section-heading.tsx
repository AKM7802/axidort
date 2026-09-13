import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Mono section index ("01") that runs down the landing page like the
 * numbered parts of a printed report. Decorative only. */
export function SectionIndex({ index, className }: { index: number; className?: string }) {
  return (
    <span aria-hidden className={cn("eyebrow flex items-center gap-3 text-muted-foreground", className)}>
      {String(index).padStart(2, "0")}
      <span className="h-px w-8 bg-current opacity-40" />
    </span>
  );
}

/** Left-aligned heading with the supporting copy set to the right on wide
 * screens, so sections don't all stack as centered title + gray subtitle. */
export function SplitHeading({
  index,
  title,
  children,
  className,
}: {
  index: number;
  title: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-10", className)}>
      <div className="lg:col-span-7">
        <SectionIndex index={index} />
        <h2 className="headline mt-5 text-4xl text-balance sm:text-5xl">{title}</h2>
      </div>
      {children && <div className="leading-relaxed text-muted-foreground lg:col-span-5">{children}</div>}
    </div>
  );
}
