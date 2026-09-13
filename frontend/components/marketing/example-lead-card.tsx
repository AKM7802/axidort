import { ZapIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Days shown on the flagged → inbox tick bar. */
const WEEK = 7;

export function ExampleLeadCard({
  businessName,
  categories,
  issue,
  flaggedDate,
  daysToDeliver,
}: {
  businessName: string;
  categories: string[];
  issue: string;
  flaggedDate: string;
  daysToDeliver: number;
}) {
  return (
    <article className="flex h-full flex-col border border-foreground/80 bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-dashed border-foreground/30 px-5 py-3">
        <span className="eyebrow text-muted-foreground">Example</span>
        <span className="eyebrow flex items-center gap-1.5 font-medium text-signal">
          <ZapIcon aria-hidden className="size-3" />
          {daysToDeliver}d to your inbox
        </span>
      </header>

      <div className="flex-1 px-5 py-6">
        <h3 className="text-lg font-semibold tracking-tight">{businessName}</h3>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {categories.map((category) => (
            <span key={category} className="eyebrow border border-foreground/25 px-1.5 py-0.5 text-foreground/80">
              {category}
            </span>
          ))}
        </div>
        <p className="mt-5 leading-relaxed text-foreground/80">&ldquo;{issue}&rdquo;</p>
      </div>

      <footer className="border-t border-foreground/15 px-5 py-4">
        <p className="eyebrow text-muted-foreground">Flagged {flaggedDate}</p>
        <div aria-hidden className="mt-3 grid grid-cols-7 gap-1">
          {Array.from({ length: WEEK }).map((_, i) => (
            <span key={i} className={cn("h-1.5", i < daysToDeliver ? "bg-primary" : "bg-foreground/10")} />
          ))}
        </div>
      </footer>
    </article>
  );
}
