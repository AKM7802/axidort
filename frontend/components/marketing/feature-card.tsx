import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function FeatureCard({
  icon: Icon,
  title,
  description,
  className,
  highlighted = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
  /** Flagship tile in the layout — a touch more visual weight. */
  highlighted?: boolean;
}) {
  return (
    <div className={cn("flex min-h-64 flex-col justify-between gap-10 bg-background p-7 sm:p-8", className)}>
      <Icon
        aria-hidden
        strokeWidth={1.5}
        className={cn("size-6", highlighted ? "text-signal" : "text-foreground/70")}
      />
      <div>
        <h3
          className={cn(
            "font-semibold tracking-tight",
            highlighted ? "headline text-3xl sm:text-4xl" : "text-xl",
          )}
        >
          {title}
        </h3>
        <p className={cn("mt-3 leading-relaxed text-muted-foreground", highlighted && "max-w-xl")}>
          {description}
        </p>
      </div>
    </div>
  );
}
