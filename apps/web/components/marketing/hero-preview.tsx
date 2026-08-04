import { CircleIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";

const PREVIEW_LEADS = [
  {
    name: "Example: Riverside Diner",
    category: "Pest",
    snippet: "Active issue found near food prep areas.",
    age: "2d ago",
  },
  {
    name: "Example: Golden Wok Express",
    category: "Temperature",
    snippet: "Equipment holding outside safe range.",
    age: "3d ago",
  },
  {
    name: "Example: Sunrise Bakery",
    category: "Plumbing",
    snippet: "Fixture flagged as non-functional.",
    age: "1d ago",
  },
];

/** A stylized preview of what a client's inbox looks like — deliberately
 * illustrative (no real data), used purely so the hero shows the product's
 * output instead of describing it in the abstract. */
export function HeroPreview() {
  return (
    <div className="mx-auto w-full max-w-lg rounded-2xl border border-border/60 bg-card shadow-2xl shadow-primary/10">
      <div className="flex items-center gap-1.5 rounded-t-2xl border-b border-border/60 bg-muted/40 px-4 py-3">
        <span className="size-2.5 rounded-full bg-destructive/40" />
        <span className="size-2.5 rounded-full bg-primary/40" />
        <span className="size-2.5 rounded-full bg-chart-5/50" />
        <span className="ml-2 text-xs text-muted-foreground">3 new leads this week</span>
      </div>
      <div className="flex flex-col gap-3 p-4">
        {PREVIEW_LEADS.map((lead) => (
          <div
            key={lead.name}
            className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-background/60 p-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <CircleIcon className="size-1.5 shrink-0 fill-primary text-primary" />
                <p className="truncate text-sm font-medium">{lead.name}</p>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">{lead.snippet}</p>
              <Badge variant="secondary" className="mt-2 font-normal">
                {lead.category}
              </Badge>
            </div>
            <span className="shrink-0 text-xs font-medium text-primary">{lead.age}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
